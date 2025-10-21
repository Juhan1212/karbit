/**
 * Exchange Adapter Base Class
 * 모든 거래소 어댑터의 기본 클래스
 */

import type { CandleData } from "./upbit";

export interface OrderRequest {
  symbol: string;
  type: "market" | "limit" | "price";
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
  slippage?: number;
  original_price?: number; // 주문 시점 가격 (해외 선물거래소 전용)
}

export interface TickerResult {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface BalanceResult {
  balance: number;
  error?: string; // 에러 메시지 (선택적)
}

export abstract class ExchangeAdapter {
  /**
   * 심볼별 주문 최소 단위(lot size) 조회
   */
  abstract getLotSize(symbol: string): Promise<number | null>;

  /**
   * 레버리지 설정
   */
  abstract setLeverage(symbol: string, leverage: string): Promise<any>;
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
  abstract getBalance(): Promise<BalanceResult>;

  /**
   * 거래소의 모든 자산을 원화 기준으로 조회합니다
   */
  abstract getTotalBalance(): Promise<number>;

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

  /**
   * 심볼(코인 페어)에 대한 현재가를 반환하는 인스턴스 메소드 (각 Adapter에서 구현 필요)
   * @param symbol 거래쌍(예: BTC/USDT)
   * @returns TickerResult (symbol, price, timestamp)
   */
  abstract getTicker(symbol: string): Promise<TickerResult>;

  /**
   * 포지션 정보 조회
   */
  abstract getPositionInfo(symbol: string): Promise<any>;

  /**
   * 종료된 포지션의 실현 손익(Closed PnL) 조회
   * @param symbol 거래쌍(예: BTC)
   * @param orderId 주문 ID
   * @param startTime 조회 시작 시간 (optional, 밀리초 타임스탬프)
   * @param endTime 조회 종료 시간 (optional, 밀리초 타임스탬프)
   * @returns 실현 손익 정보
   */
  abstract getClosedPnl(
    symbol: string,
    orderId: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    orderId: string;
    symbol: string;
    totalPnl: number;
    slippage: number;
    orderPrice: number;
    avgExitPrice: number;
    totalFee: number;
    closeFee: number;
    totalVolume: number;
  }>;
}
