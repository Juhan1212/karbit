// OKX balance fetcher using OKX Node.js SDK
import { RestClient } from "okx-api";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
  BalanceResult,
} from "./base";
import { createExchangeAdapter } from "./index";
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

  async getBalance(): Promise<BalanceResult> {
    try {
      // USDT balance fetch
      const res = await this.client.getBalance();
      const usdt = res.find((a: any) => a.ccy === "USDT");
      return {
        balance: usdt ? parseFloat(usdt.notionalUsdForFutures) : 0,
      };
    } catch (err: any) {
      console.error("[OkxAdapter] getBalance error:", err);

      // 401 에러 처리
      if (err.response?.status === 401) {
        return {
          balance: 0,
          error:
            "거래소 API Key 등록 페이지에서 IP 등록이 정상적으로 되었는지 확인해주세요",
        };
      }

      return {
        balance: 0,
        error: "잔액 조회 중 오류가 발생했습니다",
      };
    }
  }

  async getTotalBalance(): Promise<number> {
    try {
      // 모든 자산 잔액 조회
      const balances = await this.client.getBalance();
      let totalUsdtValue = 0;

      for (const balance of balances) {
        const currency = (balance as any).ccy;
        const totalBalance = parseFloat((balance as any).bal || "0");

        if (totalBalance === 0) continue;

        if (currency === "USDT") {
          // USDT는 그대로 추가
          totalUsdtValue += totalBalance;
        } else {
          // 다른 자산은 USDT로 변환
          try {
            const tickerSymbol = `${currency}-USDT`;
            const tickerResponse = await this.client.getTicker({
              instId: tickerSymbol,
            });

            if (Array.isArray(tickerResponse) && tickerResponse.length > 0) {
              const ticker = tickerResponse[0] as any;
              const currentPrice = parseFloat(ticker.last || "0");
              if (currentPrice > 0) {
                const usdtValue = totalBalance * currentPrice;
                totalUsdtValue += usdtValue;
              }
            }
          } catch (tickerError) {
            console.warn(
              `[OkxAdapter] 티커 조회 실패 (${currency}):`,
              tickerError
            );
            // 실패한 경우 0으로 처리
          }
        }
      }

      // USDT를 원화로 변환 (업비트 USDT-KRW 시세 사용)
      try {
        const upbitAdapter = createExchangeAdapter("업비트");
        const usdtKrwRes = await upbitAdapter.getTicker("USDT");
        if (usdtKrwRes.price) {
          return totalUsdtValue * usdtKrwRes.price;
        }
      } catch (usdtError) {
        console.warn("[OkxAdapter] USDT-KRW 시세 조회 실패:", usdtError);
        // USDT-KRW 시세 조회 실패 시 대략적인 환율 사용 (1300원)
        return totalUsdtValue * 1300;
      }

      return 0;
    } catch (err: any) {
      console.error("[OkxAdapter] getTotalBalance error:", err);
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
      // OKX 공개 REST API 사용 (선물)
      const res = await fetch(
        `https://www.okx.com/api/v5/market/ticker?instId=${symbol.toUpperCase()}-USDT`
      );
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.data[0].last),
          timestamp: Date.now(),
        };
      }
      throw new Error(`No ticker data found for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from OKX:`, error);
      throw error;
    }
  }
}
