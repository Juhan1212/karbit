/**
 * Exchange Adapter Base Class
 * 모든 거래소 어댑터의 기본 클래스
 */

import type { CandleData } from "./upbit";

export interface OrderRequest {
  symbol: string;
  type: "market" | "limit";
  side: "buy" | "sell";
  amount: string;
  price?: number;
}

export interface OrderResult {
  id: string;
  symbol: string;
  type: string;
  side: string;
  amount: number;
  filled: number;
  price: number;
  fee?: number;
  timestamp: number;
}

export interface TickerResult {
  symbol: string;
  price: number;
  timestamp: number;
}

export abstract class ExchangeAdapter {
  protected apiKey: string;
  protected apiSecret: string;
  protected passphrase?: string;

  constructor(apiKey: string, apiSecret: string, passphrase?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  /**
   * 거래소의 잔액을 조회합니다
   */
  abstract getBalance(): Promise<number>;

  /**
   * 주문을 실행합니다 (주문 UUID 반환)
   */
  abstract placeOrder(order: OrderRequest): Promise<string>;

  /**
   * 주문 상태를 조회합니다
   */
  abstract getOrder(orderId: string, symbol?: string): Promise<OrderResult>;

  /**
   * 티커 캔들 데이터를 조회합니다 (인스턴스 메서드)
   */
  abstract getTickerCandles(
    ticker: string,
    interval?: string,
    to?: number,
    count?: number
  ): Promise<CandleData[]>;

  /**
   * USDT 캔들 데이터를 조회합니다 (인스턴스 메서드)
   */
  abstract getUSDTCandles(
    interval?: string,
    to?: number,
    count?: number
  ): Promise<CandleData[]>;

  /**
   * 티커 캔들 데이터를 조회합니다 (정적 메서드)
   */
  static async getTickerCandles(
    ticker: string,
    interval: string,
    to?: number,
    count?: number
  ): Promise<CandleData[]> {
    throw new Error("getTickerCandles static method must be implemented");
  }
}
