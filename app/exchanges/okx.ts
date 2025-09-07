// OKX balance fetcher using OKX Node.js SDK
import { RestClient } from "okx-api";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
} from "./base";
import type { CandleData } from "./upbit";

export class OkxAdapter extends ExchangeAdapter {
  private client: RestClient;

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    super(apiKey, apiSecret, passphrase);
    this.client = new RestClient({
      apiKey,
      apiSecret,
    });
  }

  async getBalance(): Promise<number> {
    // USDT balance fetch
    const res = await this.client.getBalance();
    const usdt = res.find((a: any) => a.ccy === "USDT");
    return usdt ? parseFloat(usdt.notionalUsdForFutures) : 0;
  }

  // Instance method for getting candle data
  async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // OKX에서 캔들 데이터를 가져오는 로직을 구현
    // 현재는 빈 배열 반환 (추후 구현 필요)
    return [];
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // OKX에서 USDT 캔들 데이터를 가져오는 로직을 구현
    // 현재는 빈 배열 반환 (추후 구현 필요)
    return [];
  }

  async placeOrder(params: OrderRequest): Promise<string> {
    try {
      const instId = `${params.symbol}-USDT`; // BTC-USDT
      const orderParams: any = {
        instId: instId,
        tdMode: "cash" as any, // 현물 거래
        side: params.side, // buy or sell
        ordType: params.type, // market or limit
        sz: params.amount.toString(),
      };

      if (params.type === "limit" && params.price) {
        (orderParams as any).px = params.price.toString();
      }

      const result = await this.client.submitOrder(orderParams);

      if (!result || result.length === 0) {
        throw new Error(`OKX order failed`);
      }

      const orderData = result[0];

      // 주문 ID만 반환
      return orderData.ordId || `okx_${Date.now()}`;
    } catch (error: any) {
      console.error("OKX placeOrder error:", error);
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResult> {
    try {
      if (!symbol) {
        throw new Error("Symbol is required for OKX order query");
      }

      const instId = `${symbol}-USDT`;

      // OKX에서는 주문 조회를 위한 별도 메서드 사용
      // 실제 구현에서는 해당 거래소의 정확한 API 메서드를 사용해야 함

      return {
        id: orderId,
        symbol: symbol,
        type: "market",
        side: "buy",
        amount: 0,
        filled: 0,
        price: 0,
        fee: 0,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error("OKX getOrder error:", error);
      throw error;
    }
  }

  async getTicker(symbol: string): Promise<TickerResult> {
    try {
      // 모의 데이터 반환 (실제로는 OKX API 호출)
      return {
        symbol: symbol,
        price: 1.0, // 모의 USDT 가격
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from OKX:`, error);
      throw error;
    }
  }
}
