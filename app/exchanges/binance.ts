// Binance balance fetcher using Binance Node.js SDK
import Binance from "node-binance-api";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
} from "./base";
import type { CandleData } from "./upbit";

export class BinanceAdapter extends ExchangeAdapter {
  private client: any;

  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
    this.client = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
    });
  }

  async getBalance(): Promise<number> {
    // USDT futures balance fetch
    const account = await this.client.futuresBalance();
    const usdt = account.find((a: any) => a.asset === "USDT");
    return usdt ? parseFloat(usdt.balance) : 0;
  }

  // Instance method for getting candle data
  async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Binance에서 캔들 데이터를 가져오는 로직을 구현
    // 현재는 빈 배열 반환 (추후 구현 필요)
    return [];
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Binance에서 USDT 캔들 데이터를 가져오는 로직을 구현
    // 현재는 빈 배열 반환 (추후 구현 필요)
    return [];
  }

  async placeOrder(params: OrderRequest): Promise<string> {
    try {
      const symbol = `${params.symbol}USDT`; // BTC -> BTCUSDT
      const orderParams: any = {
        symbol: symbol,
        side: params.side.toUpperCase(), // BUY or SELL
        type: params.type.toUpperCase(), // MARKET or LIMIT
      };

      if (params.type === "market") {
        if (params.side === "buy") {
          orderParams.quoteOrderQty = params.amount; // 매수 시 USDT 금액
        } else {
          orderParams.quantity = params.amount; // 매도 시 코인 수량
        }
      } else {
        orderParams.quantity = params.amount;
        orderParams.price = params.price;
        orderParams.timeInForce = "GTC"; // Good Till Canceled
      }

      const result = await this.client.futuresOrder(orderParams);

      // 주문 ID만 반환
      return result.orderId.toString();
    } catch (error: any) {
      console.error("Binance placeOrder error:", error);
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResult> {
    try {
      if (!symbol) {
        throw new Error("Symbol is required for Binance order query");
      }

      const binanceSymbol = `${symbol}USDT`;
      const result = await this.client.futuresGetOrder({
        symbol: binanceSymbol,
        orderId: orderId,
      });

      return {
        id: result.orderId.toString(),
        symbol: symbol,
        type: result.type.toLowerCase(),
        side: result.side.toLowerCase(),
        amount: parseFloat(result.origQty),
        filled: parseFloat(result.executedQty),
        price: parseFloat(result.price || result.avgPrice || "0"),
        fee: 0, // 수수료는 별도 API로 조회 필요
        timestamp: result.updateTime,
      };
    } catch (error: any) {
      console.error("Binance getOrder error:", error);
      throw error;
    }
  }

  async getTicker(symbol: string): Promise<TickerResult> {
    try {
      // 모의 데이터 반환 (실제로는 Binance API 호출)
      return {
        symbol: symbol,
        price: 50000, // 모의 가격
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from Binance:`, error);
      throw error;
    }
  }
}
