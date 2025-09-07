// Bithumb balance fetcher using Bithumb REST API
import axios from "axios";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { CandleData } from "./upbit";
import { ExchangeAdapter } from "./base";

export class BithumbAdapter extends ExchangeAdapter {
  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
  }

  async getBalance(): Promise<number> {
    const BASE_URL = "https://api.bithumb.com";

    // JWT 생성
    const payload = {
      access_key: this.apiKey,
      nonce: uuidv4(),
      timestamp: Date.now(),
    };
    const jwtToken = jwt.sign(payload, this.apiSecret);
    const headers = {
      Authorization: `Bearer ${jwtToken}`,
    };

    try {
      const res = await axios.get(`${BASE_URL}/v1/accounts`, { headers });
      // KRW 잔액 반환 (없으면 0)
      const krwAccount = res.data?.data?.find(
        (acc: any) => acc.currency === "KRW"
      );
      return krwAccount ? parseFloat(krwAccount.balance) : 0;
    } catch (err: any) {
      console.error(
        "[BithumbAdapter] getBalance error:",
        err.response?.data || err.message
      );
      return 0;
    }
  }

  // Instance method for getting candle data
  async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Static 메서드를 호출 (인증이 필요 없는 공개 데이터이므로)
    return BithumbAdapter.getTickerCandles(ticker, interval, to, count);
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Bithumb은 KRW 기준이므로 USDT 캔들 데이터를 제공하지 않음
    return [];
  }

  // Static method for getting candle data (no authentication needed)
  static async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    const BASE_URL = "https://api.bithumb.com";

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
}
