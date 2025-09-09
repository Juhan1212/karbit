// Binance balance fetcher using Binance Node.js SDK
import Binance from "node-binance-api";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
} from "./base";
import { UpbitAdapter, type CandleData } from "./upbit";

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

  async getTotalBalance(): Promise<number> {
    try {
      // 모든 선물 잔액 조회
      const futuresAccount = await this.client.futuresBalance();
      let totalUsdtValue = 0;

      for (const asset of futuresAccount) {
        const balance = parseFloat(asset.balance || "0");
        if (balance === 0) continue;

        const assetSymbol = asset.asset;

        if (assetSymbol === "USDT") {
          // USDT는 그대로 추가
          totalUsdtValue += balance;
        } else {
          // 다른 자산은 USDT로 변환
          try {
            const tickerSymbol = `${assetSymbol}USDT`;
            const ticker = await this.client.futuresPrices(tickerSymbol);

            if (ticker && ticker[tickerSymbol]) {
              const currentPrice = parseFloat(ticker[tickerSymbol]);
              const usdtValue = balance * currentPrice;
              totalUsdtValue += usdtValue;
            }
          } catch (tickerError) {
            console.warn(
              `[BinanceAdapter] 티커 조회 실패 (${assetSymbol}):`,
              tickerError
            );
            // 실패한 경우 0으로 처리
          }
        }
      }

      // USDT를 원화로 변환 (업비트 USDT-KRW 시세 사용)
      try {
        const usdtKrwRes = await UpbitAdapter.getTicker("USDT");
        if (usdtKrwRes.price) {
          return totalUsdtValue * usdtKrwRes.price;
        }
      } catch (usdtError) {
        console.warn("[BinanceAdapter] USDT-KRW 시세 조회 실패:", usdtError);
        // USDT-KRW 시세 조회 실패 시 대략적인 환율 사용 (1300원)
        return totalUsdtValue * 1300;
      }

      return 0;
    } catch (err: any) {
      console.error("[BinanceAdapter] getTotalBalance error:", err);
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
