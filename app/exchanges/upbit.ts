// Upbit balance fetcher using Upbit REST API

import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
} from "./base";

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class UpbitAdapter extends ExchangeAdapter {
  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
  }

  /**
   * SHA512 해시 생성
   */
  private sha512(text: string): string {
    return crypto.createHash("sha512").update(text, "utf8").digest("hex");
  }

  /**
   * JWT 토큰 생성
   */
  private createJwt(queryString = ""): string {
    const payload: any = {
      access_key: this.apiKey,
      nonce: uuidv4(),
    };
    if (queryString) {
      payload.query_hash = this.sha512(queryString);
      payload.query_hash_alg = "SHA512";
    }
    return jwt.sign(payload, this.apiSecret, { algorithm: "HS512" });
  }

  /**
   * Dictionary 파라미터를 쿼리 문자열 형식으로 변환
   */
  private buildQueryStrings(params: Record<string, any>): {
    encoded: string;
    raw: string;
  } {
    const encoded = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
      )
    ).toString();
    const raw = decodeURIComponent(encoded);
    return { encoded, raw };
  }

  async getBalance(): Promise<number> {
    const BASE_URL = "https://api.upbit.com";

    // 계좌 조회는 쿼리 파라미터 없음
    const token = this.createJwt();
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

  // Instance method for getting candle data
  async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Static 메서드를 호출 (인증이 필요 없는 공개 데이터이므로)
    return UpbitAdapter.getTickerCandles(ticker, interval, to, count);
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Static 메서드를 호출
    return UpbitAdapter.getUSDTCandles(interval, to, count);
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

  async placeOrder(params: OrderRequest): Promise<string> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const market = `KRW-${params.symbol}`;
      const upbitSide = params.side === "buy" ? "bid" : "ask"; // buy -> bid, sell -> ask
      const orderData: any = {
        market: market,
        side: upbitSide,
        ord_type: params.type === "market" ? "market" : "limit",
      };

      if (upbitSide === "bid") {
        // 매수
        if (params.type === "market") {
          orderData.price = params.amount; // 매수 금액
        } else {
          orderData.volume = params.amount; // 매수 수량
          orderData.price = params.price;
        }
      } else {
        // 매도
        orderData.volume = params.amount; // 매도 수량
        if (params.type === "limit") {
          orderData.price = params.price;
        }
      }

      const { raw } = this.buildQueryStrings(orderData);
      const token = this.createJwt(raw);

      const response = await axios.post(`${BASE_URL}/v1/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // 주문 UUID만 반환
      const orderResult = response.data;
      return orderResult.uuid;
    } catch (error: any) {
      console.error(
        "Upbit placeOrder error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResult> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const queryParams = { uuid: orderId };
      const { encoded, raw } = this.buildQueryStrings(queryParams);
      const token = this.createJwt(raw);

      const response = await axios.get(`${BASE_URL}/v1/order?${encoded}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const order = response.data;
      const symbolFromMarket = order.market.replace("KRW-", "");

      return {
        id: order.uuid,
        symbol: symbolFromMarket,
        type: order.ord_type === "market" ? "market" : "limit",
        side: order.side,
        amount: parseFloat(order.volume),
        filled: parseFloat(order?.trades[0]?.funds),
        price: parseFloat(order?.trades[0]?.price),
        fee: parseFloat(order.paid_fee),
        timestamp: new Date(order.created_at).getTime(),
      };
    } catch (error: any) {
      console.error(
        "Upbit getOrder error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  static async getTicker(symbol: string): Promise<TickerResult> {
    try {
      const response = await axios.get(
        `https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`
      );

      if (response.data && response.data.length > 0) {
        return {
          symbol: symbol,
          price: response.data[0].trade_price,
          timestamp: Date.now(),
        };
      }

      throw new Error(`No ticker data found for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from Upbit:`, error);
      throw error;
    }
  }
}
