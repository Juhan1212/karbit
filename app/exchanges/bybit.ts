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

  /**
   * 심볼별 주문 최소 단위(lot size) 조회
   */
  async getLotSize(symbol: string): Promise<number | null> {
    try {
      // Bybit symbol info API
      const res = await this.client.getInstrumentsInfo({
        category: "linear",
        symbol: `${symbol.toUpperCase()}USDT`,
      });
      if (res.retCode !== 0) return null;
      const info = res.result.list?.[0];
      return info ? parseFloat(info.lotSizeFilter.minOrderQty) : null;
    } catch (err) {
      console.error("Bybit getLotSize error:", err);
      return null;
    }
  }

  /**
   * 레버리지 설정
   */
  async setLeverage(symbol: string, leverage: string): Promise<any> {
    try {
      const res = await this.client.setLeverage({
        category: "linear",
        symbol: `${symbol.toUpperCase()}USDT`,
        buyLeverage: leverage,
        sellLeverage: leverage,
      });
      return res;
    } catch (err) {
      console.error("Bybit setLeverage error:", err);
      return { retMsg: "ERROR", error: err };
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

      console.log("Bybit placeOrder params:", orderParams);
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
        const originalPrice = parseFloat(
          historyOrder.price ?? historyOrder.lastPriceOnCreated ?? "0"
        );
        const avgPrice = parseFloat(
          historyOrder.avgPrice ?? historyOrder.lastPriceOnCreated ?? "0"
        );
        let slippage = 0;
        if (originalPrice > 0) {
          slippage = (Math.abs(avgPrice - originalPrice) / originalPrice) * 100;
        }

        return {
          id: historyOrder.orderId,
          symbol: symbol,
          type: (historyOrder.orderType || "").toLowerCase(),
          side: (historyOrder.side || "").toLowerCase(),
          amount: parseFloat(historyOrder.qty),
          filled: parseFloat(historyOrder.cumExecValue),
          price: parseFloat(
            historyOrder.lastPriceOnCreated || historyOrder.avgPrice || "0"
          ),
          fee: parseFloat(historyOrder.cumExecFee || "0"),
          timestamp: parseInt(historyOrder.updatedTime),
          slippage: parseFloat(slippage.toFixed(4)),
        };
      }

      const originalPrice = parseFloat(
        order.price ?? order.lastPriceOnCreated ?? "0"
      );
      const avgPrice = parseFloat(
        order.avgPrice ?? order.lastPriceOnCreated ?? "0"
      );
      let slippage = 0;
      if (originalPrice > 0) {
        slippage = (Math.abs(avgPrice - originalPrice) / originalPrice) * 100;
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
        slippage: parseFloat(slippage.toFixed(4)),
      };
    } catch (error: any) {
      console.error("Bybit getOrder error:", error);
      throw error;
    }
  }

  /**
   * 포지션 정보 조회
   * @param symbol - 심볼 (예: "BTC", "ETH")
   * @returns 포지션 정보 (사이즈, 진입가, 레버리지, PnL 등)
   */
  async getPositionInfo(symbol: string): Promise<{
    symbol: string;
    side: "long" | "short" | "none";
    size: number;
    entryPrice: number;
    markPrice: number;
    leverage: number;
    unrealizedPnl: number;
    realizedPnl: number;
    liquidationPrice: number;
    marginMode: string;
  }> {
    try {
      const bybitSymbol = `${symbol.toUpperCase()}USDT`;
      const result = await this.client.getPositionInfo({
        category: "linear",
        symbol: bybitSymbol,
      });

      if (result.retCode !== 0) {
        throw new Error(`Bybit getPositionInfo failed: ${result.retMsg}`);
      }

      const position = result.result.list[0];

      if (!position) {
        // 포지션이 없는 경우
        return {
          symbol: symbol.toUpperCase(),
          side: "none",
          size: 0,
          entryPrice: 0,
          markPrice: 0,
          leverage: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
          liquidationPrice: 0,
          marginMode: "cross",
        };
      }

      // 포지션 방향 결정 (Bybit는 "Buy" 또는 "Sell"로 표시)
      const size = parseFloat(position.size);
      const side: "long" | "short" | "none" =
        size === 0 ? "none" : position.side === "Buy" ? "long" : "short";

      return {
        symbol: symbol.toUpperCase(),
        side,
        size: Math.abs(size),
        entryPrice: parseFloat(position.avgPrice || "0"),
        markPrice: parseFloat(position.markPrice || "0"),
        leverage: parseFloat(position.leverage || "0"),
        unrealizedPnl: parseFloat(position.unrealisedPnl || "0"),
        realizedPnl: parseFloat(position.cumRealisedPnl || "0"),
        liquidationPrice: parseFloat(position.liqPrice || "0"),
        marginMode: position.tradeMode === 0 ? "cross" : "isolated",
      };
    } catch (error: any) {
      console.error("Bybit getPositionInfo error:", error);
      throw error;
    }
  }

  /**
   * 종료된 포지션의 실현 손익(Closed PnL) 조회
   */
  async getClosedPnl(
    symbol: string,
    orderId: string,
    startTime?: number,
    endTime?: number
  ): Promise<{
    orderId: string;
    symbol: string;
    totalPnl: number;
    slippage: number;
    avgExitPrice: number;
    totalFee: number;
    closeFee: number;
    totalVolume: number;
  }> {
    try {
      const bybitSymbol = `${symbol.toUpperCase()}USDT`;

      // Bybit Closed P&L API 호출
      const params: any = {
        category: "linear",
        symbol: bybitSymbol,
      };

      if (startTime) {
        params.startTime = startTime;
      }
      if (endTime) {
        params.endTime = endTime;
      }

      const result = await this.client.getClosedPnL(params);

      if (result.retCode !== 0) {
        throw new Error(`Bybit getClosedPnl failed: ${result.retMsg}`);
      }

      const pnlList = result.result.list || [];

      // orderId와 일치하는 레코드 찾기
      const matchedRecord = pnlList.find(
        (record: any) => record.orderId === orderId
      );

      if (!matchedRecord) {
        return {
          orderId,
          symbol: symbol.toUpperCase(),
          totalPnl: 0,
          slippage: 0,
          avgExitPrice: 0,
          totalFee: 0,
          closeFee: 0,
          totalVolume: 0,
        };
      }

      // 실현 손익
      const totalPnl = parseFloat(matchedRecord.closedPnl || "0");

      // 평균 종료 가격
      const avgExitPrice = parseFloat(matchedRecord.avgExitPrice || "0");

      // 총 수수료 (Bybit의 closedPnL API에는 fee 정보가 별도로 없으므로 0으로 설정)
      const totalFee =
        parseFloat(matchedRecord.openFee || "0") +
        parseFloat(matchedRecord.closeFee || "0");

      // 청산 수수료
      const closeFee = parseFloat(matchedRecord.closeFee || "0");

      // 총 거래량 (closedSize: 청산된 포지션 크기)
      const totalVolume = parseFloat(matchedRecord.closedSize || "0");

      // 슬리피지 계산: |((avgEntryPrice - orderPrice) / orderPrice) * 100|
      const orderPrice = parseFloat(matchedRecord.orderPrice || "0");
      const avgEntryPrice = parseFloat(matchedRecord.avgEntryPrice || "0");
      const slippage =
        orderPrice > 0
          ? Math.abs(((avgEntryPrice - orderPrice) / orderPrice) * 100)
          : 0;

      return {
        orderId,
        symbol: symbol.toUpperCase(),
        totalPnl,
        slippage,
        avgExitPrice,
        totalFee,
        closeFee,
        totalVolume,
      };
    } catch (error: any) {
      console.error("Bybit getClosedPnl error:", error);
      throw error;
    }
  }
}
