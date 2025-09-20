// Bybit balance fetcher using Bybit Node.js SDK
import { RestClientV5 } from "bybit-api";
import axios from "axios";
import { createExchangeAdapter } from "./index";
import type { CandleData } from "./upbit";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
  BalanceResult,
} from "./base";
import { preciseMultiply } from "../utils/decimal";

export class BybitAdapter extends ExchangeAdapter {
  private client: RestClientV5;

  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
    if (!apiKey || !apiSecret) {
      this.client = null as any; // 인증이 필요 없는 공개 데이터용
    } else {
      this.client = new RestClientV5({
        key: apiKey,
        secret: apiSecret,
      });
    }
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      const res = await this.client.getWalletBalance({
        accountType: "UNIFIED",
        coin: "USDT",
      });
      const usdt = res.result.list?.[0]?.totalAvailableBalance;
      return {
        balance: usdt ? parseFloat(usdt) : 0,
      };
    } catch (err: any) {
      console.error("[BybitAdapter] getBalance error:", err);

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
      // 모든 코인의 지갑 잔액 조회
      const res = await this.client.getWalletBalance({
        accountType: "UNIFIED",
      });

      if (!res.result.list || res.result.list.length === 0) {
        return 0;
      }

      const walletInfo = res.result.list[0];
      let totalUsdtValue = Number(walletInfo.totalEquity);

      // USDT를 원화로 변환 (업비트 USDT-KRW 시세 사용)
      try {
        const upbitAdapter = createExchangeAdapter("업비트");
        const usdtKrwRes = await upbitAdapter.getTicker("USDT");
        if (usdtKrwRes.price) {
          return preciseMultiply(totalUsdtValue, usdtKrwRes.price, 2);
        }
      } catch (usdtError) {
        console.warn("[BybitAdapter] USDT-KRW 시세 조회 실패:", usdtError);
        // USDT-KRW 시세 조회 실패 시 대략적인 환율 사용 (1300원)
        return totalUsdtValue * 1300;
      }

      return 0;
    } catch (err: any) {
      console.error("[BybitAdapter] getTotalBalance error:", err);
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
    return BybitAdapter.getTickerCandles(ticker, interval, to, count);
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Bybit에서는 USDT 캔들 데이터를 직접 제공하지 않으므로 빈 배열 반환
    return [];
  }

  // Static method for getting candle data (no authentication needed for public data)
  static async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    const BASE_URL = "https://api.bybit.com";

    try {
      const symbol = `${ticker.toUpperCase()}USDT`;

      // Bybit interval mapping
      const intervalMap: Record<string, string> = {
        "1m": "1",
        "5m": "5",
        "15m": "15",
        "30m": "30",
        "1h": "60",
        "4h": "240",
        "1d": "D",
        "1w": "W",
        "1M": "M",
      };

      const bybitInterval = intervalMap[interval] || "1";

      const params = new URLSearchParams({
        category: "linear",
        symbol,
        interval: bybitInterval,
        limit: Math.min(count, 1000).toString(), // Bybit max limit is 1000
      });

      if (to > 0) {
        // Bybit uses milliseconds
        params.set("end", (to * 1000).toString());
      }

      const url = `${BASE_URL}/v5/market/kline?${params}`;

      const response = await axios.get(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (response.data.retCode !== 0) {
        throw new Error(`Bybit API error: ${response.data.retMsg}`);
      }

      // Convert Bybit format to our format
      const candles = response.data.result.list.map((item: string[]) => ({
        timestamp: Math.floor(parseInt(item[0]) / 1000), // Convert ms to seconds
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5]),
      }));

      // Bybit returns data in descending order, so reverse it
      return candles.reverse();
    } catch (error) {
      console.error("Error fetching Bybit candle data:", error);
      throw error;
    }
  }

  async getTicker(symbol: string): Promise<TickerResult> {
    try {
      // Bybit 공개 REST API 사용 (선물)
      const res = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol.toUpperCase()}USDT`
      );
      const data = await res.json();
      if (
        data &&
        data.result &&
        data.result.list &&
        data.result.list.length > 0
      ) {
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.result.list[0].lastPrice),
          timestamp: Date.now(),
        };
      }
      throw new Error(`No ticker data found for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from Bybit:`, error);
      throw error;
    }
  }

  async placeOrder(params: OrderRequest): Promise<string> {
    try {
      const symbol = `${params.symbol}USDT`; // BTC -> BTCUSDT
      const orderParams: any = {
        category: "linear",
        symbol: symbol,
        side: params.side === "buy" ? "Buy" : "Sell",
        orderType: params.type === "market" ? "Market" : "Limit",
        qty: params.amount.toString(),
      };

      if (orderParams.qty === "0") {
        orderParams.reduceOnly = true;
        orderParams.closeOnTrigger = true;
      }

      if (params.type === "limit" && params.price) {
        orderParams.price = params.price.toString();
      }
      const result = await this.client.submitOrder(orderParams);

      if (result.retCode !== 0) {
        throw new Error(`Bybit order failed: ${result.retMsg}`);
      }

      // 주문 ID만 반환
      return result.result.orderId;
    } catch (error: any) {
      console.error("Bybit placeOrder error:", error);
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResult> {
    try {
      if (!symbol) {
        throw new Error("Symbol is required for Bybit order query");
      }

      const bybitSymbol = `${symbol}USDT`;
      const result = await this.client.getActiveOrders({
        category: "linear",
        symbol: bybitSymbol,
        orderId: orderId,
      });

      if (result.retCode !== 0) {
        throw new Error(`Bybit getOrder failed: ${result.retMsg}`);
      }

      const order = result.result.list[0];
      if (!order) {
        // 활성 주문에 없으면 체결된 주문에서 조회
        const historyResult = await this.client.getHistoricOrders({
          category: "linear",
          symbol: bybitSymbol,
          orderId: orderId,
        });

        if (historyResult.retCode !== 0 || !historyResult.result.list[0]) {
          throw new Error("Order not found");
        }

        const historyOrder = historyResult.result.list[0];
        return {
          id: historyOrder.orderId,
          symbol: symbol,
          type: historyOrder.orderType.toLowerCase(),
          side: historyOrder.side.toLowerCase(),
          amount: parseFloat(historyOrder.qty),
          filled: parseFloat(historyOrder.cumExecValue),
          price: parseFloat(
            historyOrder.lastPriceOnCreated || historyOrder.avgPrice || "0"
          ),
          fee: parseFloat(historyOrder.cumExecFee || "0"),
          timestamp: parseInt(historyOrder.updatedTime),
        };
      }

      return {
        id: order.orderId,
        symbol: symbol,
        type: order.orderType.toLowerCase(),
        side: order.side.toLowerCase(),
        amount: parseFloat(order.qty),
        filled: parseFloat(order.cumExecValue),
        price: parseFloat(order.lastPriceOnCreated || order.avgPrice || "0"),
        fee: parseFloat(order.cumExecFee || "0"),
        timestamp: parseInt(order.updatedTime),
      };
    } catch (error: any) {
      console.error("Bybit getOrder error:", error);
      throw error;
    }
  }
}
