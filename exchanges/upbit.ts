// Upbit balance fetcher using Upbit REST API

import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class UpbitAdapter {
  constructor(
    private apiKey: string,
    private apiSecret: string
  ) {}

  async getBalance(): Promise<number> {
    const BASE_URL = "https://api.upbit.com";

    // JWT 생성 함수
    function sha512(text: string) {
      return crypto.createHash("sha512").update(text, "utf8").digest("hex");
    }

    function createJwt(accessKey: string, secretKey: string, queryString = "") {
      const payload: any = {
        access_key: accessKey,
        nonce: uuidv4(),
      };
      if (queryString) {
        payload.query_hash = sha512(queryString);
        payload.query_hash_alg = "SHA512";
      }
      return jwt.sign(payload, secretKey, { algorithm: "HS512" });
    }

    // 계좌 조회는 쿼리 파라미터 없음
    const token = createJwt(this.apiKey, this.apiSecret);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    try {
      const res = await axios.get(`${BASE_URL}/v1/accounts`, { headers });
      // KRW 잔액 반환 (없으면 0)
      const krwAccount = res.data.find((acc: any) => acc.currency === "KRW");
      return krwAccount ? parseFloat(krwAccount.balance) : 0;
    } catch (err: any) {
      console.error(
        "[UpbitAdapter] getBalance error:",
        err.response?.data || err.message
      );
      return 0;
    }
  }

  // Static method for getting candle data (no authentication needed)
  static async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const market = `KRW-${ticker.toUpperCase()}`;
      let endpoint: string;

      // Upbit interval mapping
      switch (interval) {
        case "1m":
          endpoint = `/v1/candles/minutes/1`;
          break;
        case "5m":
          endpoint = `/v1/candles/minutes/5`;
          break;
        case "15m":
          endpoint = `/v1/candles/minutes/15`;
          break;
        case "30m":
          endpoint = `/v1/candles/minutes/30`;
          break;
        case "1h":
          endpoint = `/v1/candles/minutes/60`;
          break;
        case "4h":
          endpoint = `/v1/candles/minutes/240`;
          break;
        case "1d":
          endpoint = `/v1/candles/days`;
          break;
        case "1w":
          endpoint = `/v1/candles/weeks`;
          break;
        case "1M":
          endpoint = `/v1/candles/months`;
          break;
        default:
          endpoint = `/v1/candles/minutes/1`;
      }

      const params = new URLSearchParams({
        market,
        count: count.toString(),
      });

      if (to > 0) {
        // Convert timestamp to ISO string for Upbit API
        const toDate = new Date(to * 1000).toISOString();
        params.set("to", toDate);
      }

      const url = `${BASE_URL}${endpoint}?${params}`;

      const response = await axios.get(url, {
        headers: {
          Accept: "application/json",
        },
      });

      // Convert Upbit format to our format
      return response.data.map((item: any) => ({
        timestamp: Math.floor(
          new Date(item.candle_date_time_kst).getTime() / 1000
        ),
        open: item.opening_price,
        high: item.high_price,
        low: item.low_price,
        close: item.trade_price,
        volume: item.candle_acc_trade_volume,
      }));
    } catch (error) {
      console.error("Error fetching Upbit candle data:", error);
      throw error;
    }
  }

  static async getUSDTCandles(
    interval: string = "1",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    return this.getTickerCandles("USDT", interval, to, count);
  }
}
