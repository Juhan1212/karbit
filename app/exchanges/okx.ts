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

  /**
   * 심볼별 주문 최소 단위(lot size) 조회
   */
  async getLotSize(symbol: string): Promise<number | null> {
    try {
      const instId = `${symbol.toUpperCase()}-USDT-SWAP`; // OKX 무기한 선물

      // OKX API로 거래소 정보 조회
      const response = await fetch(
        `https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${instId}`
      );
      const data = await response.json();

      if (data.code !== "0" || !data.data || data.data.length === 0) {
        console.warn(`[OkxAdapter] Instrument not found: ${instId}`);
        return null;
      }

      const instrument = data.data[0];
      // minSz: 최소 주문 수량
      return parseFloat(instrument.minSz);
    } catch (err) {
      console.error("[OkxAdapter] getLotSize error:", err);
      return null;
    }
  }

  /**
   * 레버리지 설정
   */
  async setLeverage(symbol: string, leverage: string): Promise<any> {
    try {
      const instId = `${symbol.toUpperCase()}-USDT-SWAP`;

      // OKX 레버리지 설정 API
      const result = await this.client.setLeverage({
        instId,
        lever: leverage,
        mgnMode: "cross", // cross: 교차 마진, isolated: 격리 마진
      });

      if (!result || result.length === 0) {
        throw new Error("레버리지 설정 실패");
      }

      return {
        success: true,
        symbol: instId,
        leverage: result[0].lever,
        marginMode: result[0].mgnMode,
      };
    } catch (err: any) {
      console.error("[OkxAdapter] setLeverage error:", err);
      return {
        success: false,
        error: err.message || "레버리지 설정 실패",
      };
    }
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
      const instId = `${symbol.toUpperCase()}-USDT-SWAP`;

      // OKX 포지션 정보 조회
      const response = await fetch(
        `https://www.okx.com/api/v5/account/positions?instType=SWAP&instId=${instId}`,
        {
          headers: {
            "OK-ACCESS-KEY": this.apiKey,
            "OK-ACCESS-SIGN": "", // 실제로는 서명 필요
            "OK-ACCESS-TIMESTAMP": new Date().toISOString(),
            "OK-ACCESS-PASSPHRASE": this.passphrase || "",
          },
        }
      );

      const data = await response.json();

      if (data.code !== "0" || !data.data || data.data.length === 0) {
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

      const position = data.data[0];
      const posSize = parseFloat(position.pos || "0");

      // OKX는 posSide로 방향 구분 ("long" | "short" | "net")
      let side: "long" | "short" | "none" = "none";
      if (posSize !== 0) {
        if (position.posSide === "long") {
          side = "long";
        } else if (position.posSide === "short") {
          side = "short";
        } else {
          // net 모드인 경우 수량의 부호로 판단
          side = posSize > 0 ? "long" : "short";
        }
      }

      return {
        symbol: symbol.toUpperCase(),
        side,
        size: Math.abs(posSize),
        entryPrice: parseFloat(position.avgPx || "0"),
        markPrice: parseFloat(position.markPx || "0"),
        leverage: parseFloat(position.lever || "0"),
        unrealizedPnl: parseFloat(position.upl || "0"),
        realizedPnl: parseFloat(position.realizedPnl || "0"),
        liquidationPrice: parseFloat(position.liqPx || "0"),
        marginMode: position.mgnMode || "cross",
      };
    } catch (error: any) {
      console.error("OKX getPositionInfo error:", error);
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
      const instId = `${symbol.toUpperCase()}-USDT-SWAP`;

      // OKX Bills Details API 호출 (실현 손익 타입)
      let url = `https://www.okx.com/api/v5/account/bills?instType=SWAP&instId=${instId}&type=8`; // type=8: 실현손익

      if (startTime) {
        url += `&begin=${startTime}`;
      }
      if (endTime) {
        url += `&end=${endTime}`;
      }

      const response = await fetch(url, {
        headers: {
          "OK-ACCESS-KEY": this.apiKey,
          "OK-ACCESS-SIGN": "", // 실제로는 서명 필요
          "OK-ACCESS-TIMESTAMP": new Date().toISOString(),
          "OK-ACCESS-PASSPHRASE": this.passphrase || "",
        },
      });

      const data = await response.json();

      if (data.code !== "0" || !data.data) {
        throw new Error(`OKX getClosedPnl failed: ${data.msg}`);
      }

      const bills = data.data || [];

      // orderId와 일치하는 레코드 찾기
      const matchedRecord = bills.find(
        (record: any) => record.ordId === orderId
      );

      if (!matchedRecord) {
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

      // 실현 손익
      const totalPnl = parseFloat(matchedRecord.pnl || "0");

      // 평균 종료 가격 (fillPx가 체결 가격)
      const avgExitPrice = parseFloat(matchedRecord.fillPx || "0");

      // 총 수수료 (OKX는 fee 필드 사용)
      const totalFee = Math.abs(parseFloat(matchedRecord.fee || "0"));

      // 청산 수수료 (OKX는 단일 fee만 제공, 청산 수수료 = 총 수수료)
      const closeFee = Math.abs(parseFloat(matchedRecord.fee || "0"));

      // 총 거래량 (fillSz: 체결된 수량)
      const totalVolume = parseFloat(matchedRecord.fillSz || "0");

      // 슬리피지 계산: |((fillPx - px) / px) * 100|
      const orderPrice = parseFloat(matchedRecord.px || "0");
      const avgPrice = parseFloat(matchedRecord.fillPx || "0");
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
      console.error("OKX getClosedPnl error:", error);
      throw error;
    }
  }
}
