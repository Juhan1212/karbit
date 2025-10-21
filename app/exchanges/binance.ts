// Binance balance fetcher using Binance Node.js SDK
import Binance from "node-binance-api";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
  BalanceResult,
} from "./base";
import { createExchangeAdapter } from "./index";
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

  /**
   * 심볼별 주문 최소 단위(lot size) 조회
   */
  async getLotSize(symbol: string): Promise<number | null> {
    try {
      const symbolInfo = `${symbol.toUpperCase()}USDT`;
      const exchangeInfo = await this.client.futuresExchangeInfo();

      const symbolData = exchangeInfo.symbols.find(
        (s: any) => s.symbol === symbolInfo
      );

      if (!symbolData) {
        console.warn(`[BinanceAdapter] Symbol not found: ${symbolInfo}`);
        return null;
      }

      // LOT_SIZE 필터에서 최소 수량 조회
      const lotSizeFilter = symbolData.filters.find(
        (f: any) => f.filterType === "LOT_SIZE"
      );

      if (!lotSizeFilter) {
        console.warn(
          `[BinanceAdapter] LOT_SIZE filter not found for ${symbolInfo}`
        );
        return null;
      }

      return parseFloat(lotSizeFilter.minQty);
    } catch (err) {
      console.error("[BinanceAdapter] getLotSize error:", err);
      return null;
    }
  }

  /**
   * 레버리지 설정
   */
  async setLeverage(symbol: string, leverage: string): Promise<any> {
    try {
      const symbolInfo = `${symbol.toUpperCase()}USDT`;
      const result = await this.client.futuresLeverage(
        symbolInfo,
        parseInt(leverage, 10)
      );

      return {
        success: true,
        symbol: symbolInfo,
        leverage: result.leverage,
        maxNotionalValue: result.maxNotionalValue,
      };
    } catch (err: any) {
      console.error("[BinanceAdapter] setLeverage error:", err);
      return {
        success: false,
        error: err.message || "레버리지 설정 실패",
      };
    }
  }

  async getBalance(): Promise<BalanceResult> {
    try {
      // USDT futures balance fetch
      const account = await this.client.futuresBalance();
      const usdt = account.find((a: any) => a.asset === "USDT");
      return {
        balance: usdt ? parseFloat(usdt.balance) : 0,
      };
    } catch (err: any) {
      console.error("[BinanceAdapter] getBalance error:", err);

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
        const upbitAdapter = createExchangeAdapter("업비트");
        const usdtKrwRes = await upbitAdapter.getTicker("USDT");
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
      // Binance 공개 REST API 사용 (현물)
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}USDT`
      );
      const data = await res.json();
      if (data && data.price) {
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.price),
          timestamp: Date.now(),
        };
      }
      throw new Error(`No ticker data found for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from Binance:`, error);
      throw error;
    }
  }

  /**
   * 포지션 정보 조회
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
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;

      // Binance 선물 포지션 정보 조회
      const positions = await this.client.futuresPositionRisk();
      const position = positions.find((p: any) => p.symbol === binanceSymbol);

      if (!position) {
        // 심볼을 찾을 수 없는 경우
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

      const positionAmt = parseFloat(position.positionAmt || "0");
      const side: "long" | "short" | "none" =
        positionAmt === 0 ? "none" : positionAmt > 0 ? "long" : "short";

      return {
        symbol: symbol.toUpperCase(),
        side,
        size: Math.abs(positionAmt),
        entryPrice: parseFloat(position.entryPrice || "0"),
        markPrice: parseFloat(position.markPrice || "0"),
        leverage: parseFloat(position.leverage || "0"),
        unrealizedPnl: parseFloat(position.unRealizedProfit || "0"),
        realizedPnl: 0, // Binance는 별도 API로 조회 필요
        liquidationPrice: parseFloat(position.liquidationPrice || "0"),
        marginMode: position.marginType?.toLowerCase() || "cross",
      };
    } catch (error: any) {
      console.error("Binance getPositionInfo error:", error);
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
    orderPrice: number;
    avgExitPrice: number;
    totalFee: number;
    closeFee: number;
    totalVolume: number;
  }> {
    try {
      const binanceSymbol = `${symbol.toUpperCase()}USDT`;

      // Binance에서는 orderId로 직접 주문 정보 조회
      const orderInfo = await this.client.futuresGetOrder({
        symbol: binanceSymbol,
        orderId: orderId,
      });

      if (!orderInfo) {
        return {
          orderId,
          symbol: symbol.toUpperCase(),
          totalPnl: 0,
          slippage: 0,
          orderPrice: 0,
          avgExitPrice: 0,
          totalFee: 0,
          closeFee: 0,
          totalVolume: 0,
        };
      }

      // 실현 손익 계산 (Binance는 주문 정보에서 realizedPnl 제공)
      const totalPnl = parseFloat(orderInfo.realizedPnl || "0");

      // 평균 종료 가격 (avgPrice가 종료 가격)
      const avgExitPrice = parseFloat(orderInfo.avgPrice || "0");

      // 총 수수료 (Binance는 commission 필드 사용)
      const totalFee = parseFloat(orderInfo.commission || "0");

      // 청산 수수료 (Binance는 단일 commission만 제공, 청산 수수료 = 총 수수료)
      const closeFee = parseFloat(orderInfo.commission || "0");

      // 총 거래량 (executedQty: 체결된 수량)
      const totalVolume = parseFloat(orderInfo.executedQty || "0");

      // 슬리피지 계산: |((avgPrice - price) / price) * 100|
      const orderPrice = parseFloat(orderInfo.price || "0");
      const avgPrice = parseFloat(orderInfo.avgPrice || "0");
      const slippage =
        orderPrice > 0
          ? Math.abs(((avgPrice - orderPrice) / orderPrice) * 100)
          : 0;

      return {
        orderId,
        symbol: symbol.toUpperCase(),
        totalPnl,
        slippage,
        orderPrice,
        avgExitPrice,
        totalFee,
        closeFee,
        totalVolume,
      };
    } catch (error: any) {
      console.error("Binance getClosedPnl error:", error);
      throw error;
    }
  }
}
