// Upbit balance fetcher using Upbit REST API

import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  ExchangeAdapter,
  OrderRequest,
  OrderResult,
  TickerResult,
  BalanceResult,
} from "./base";
// @ts-ignore
import { getCache, setCache } from "../core/redisCache";

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class UpbitAdapter extends ExchangeAdapter {
  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
  }

  /**
   * SHA512 해시 생성
   */
  private sha512(text: string): string {
    return crypto.createHash("sha512").update(text, "utf8").digest("hex");
  }

  /**
   * JWT 토큰 생성
   */
  private createJwt(queryString = ""): string {
    const payload: any = {
      access_key: this.apiKey,
      nonce: uuidv4(),
    };
    if (queryString) {
      payload.query_hash = this.sha512(queryString);
      payload.query_hash_alg = "SHA512";
    }
    return jwt.sign(payload, this.apiSecret, { algorithm: "HS512" });
  }

  /**
   * Dictionary 파라미터를 쿼리 문자열 형식으로 변환
   */
  private buildQueryStrings(params: Record<string, any>): {
    encoded: string;
    raw: string;
  } {
    const encoded = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]]
      )
    ).toString();
    const raw = decodeURIComponent(encoded);
    return { encoded, raw };
  }

  async getBalance(): Promise<BalanceResult> {
    const BASE_URL = "https://api.upbit.com";

    // 계좌 조회는 쿼리 파라미터 없음
    const token = this.createJwt();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    try {
      const res = await axios.get(`${BASE_URL}/v1/accounts`, { headers });
      // KRW 잔액 반환 (없으면 0)
      const krwAccount = res.data.find((acc: any) => acc.currency === "KRW");
      return {
        balance: krwAccount ? parseFloat(krwAccount.balance) : 0,
      };
    } catch (err: any) {
      console.error(
        "[UpbitAdapter] getBalance error:",
        err.response?.data || err.message
      );

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
    const BASE_URL = "https://api.upbit.com";

    // 계좌 조회는 쿼리 파라미터 없음
    const token = this.createJwt();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    try {
      // 모든 계좌 정보 조회
      const accountsRes = await axios.get(`${BASE_URL}/v1/accounts`, {
        headers,
      });
      const accounts = accountsRes.data;

      let totalKrwValue = 0;
      const tickersToQuery: string[] = [];
      const accountsToConvert: Array<{
        currency: string;
        totalBalance: number;
      }> = [];

      // 각 계좌별로 처리 - 1차: KRW 계산 및 티커 목록 수집
      for (const account of accounts) {
        const currency = account.currency;
        const balance = parseFloat(account.balance);
        const locked = parseFloat(account.locked || 0);
        const totalBalance = balance + locked;

        if (totalBalance === 0) continue;

        if (currency === "KRW") {
          // KRW는 그대로 추가
          totalKrwValue += totalBalance;
        } else {
          // 다른 통화는 나중에 변환하기 위해 저장
          const ticker = `${currency}-KRW`;
          tickersToQuery.push(ticker);
          accountsToConvert.push({ currency, totalBalance });
        }
      }

      // 2차: 모든 티커를 한 번에 조회
      if (tickersToQuery.length > 0) {
        try {
          const marketsParam = tickersToQuery.join(",");
          const tickerRes = await axios.get(
            `${BASE_URL}/v1/ticker?markets=${marketsParam}`
          );

          if (tickerRes.data && Array.isArray(tickerRes.data)) {
            // 티커 데이터를 맵으로 변환 (빠른 조회를 위해)
            const priceMap = new Map<string, number>();
            for (const tickerData of tickerRes.data) {
              priceMap.set(tickerData.market, tickerData.trade_price);
            }

            // 각 계좌의 KRW 가치 계산
            for (const account of accountsToConvert) {
              const ticker = `${account.currency}-KRW`;
              const currentPrice = priceMap.get(ticker);

              if (currentPrice) {
                const krwValue = account.totalBalance * currentPrice;
                totalKrwValue += krwValue;
              } else {
                console.warn(`[UpbitAdapter] 티커 가격 없음: ${ticker}`);
              }
            }
          }
        } catch (tickerError) {
          console.error(`[UpbitAdapter] 일괄 티커 조회 실패:`, tickerError);
          // 실패한 경우 개별적으로 조회하는 fallback 로직
          for (const account of accountsToConvert) {
            try {
              const ticker = `${account.currency}-KRW`;
              const tickerRes = await axios.get(
                `${BASE_URL}/v1/ticker?markets=${ticker}`
              );

              if (tickerRes.data && tickerRes.data.length > 0) {
                const currentPrice = tickerRes.data[0].trade_price;
                const krwValue = account.totalBalance * currentPrice;
                totalKrwValue += krwValue;
              }
            } catch (individualError) {
              console.warn(
                `[UpbitAdapter] 개별 티커 조회 실패 (${account.currency}):`,
                individualError
              );
            }
          }
        }
      }

      return totalKrwValue;
    } catch (err: any) {
      console.error(
        "[UpbitAdapter] getTotalBalance error:",
        err.response?.data || err.message
      );
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
    return UpbitAdapter.getTickerCandles(ticker, interval, to, count);
  }

  // Instance method for getting USDT candle data
  async getUSDTCandles(
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    // Static 메서드를 호출
    return UpbitAdapter.getUSDTCandles(interval, to, count);
  }

  // Static method for getting candle data (no authentication needed)
  static async getTickerCandles(
    ticker: string,
    interval: string = "1m",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const market = `KRW-${ticker.toUpperCase()}`;
      let endpoint: string;

      // Upbit interval mapping
      switch (interval) {
        case "1m":
          endpoint = `/v1/candles/minutes/1`;
          break;
        case "5m":
          endpoint = `/v1/candles/minutes/5`;
          break;
        case "15m":
          endpoint = `/v1/candles/minutes/15`;
          break;
        case "30m":
          endpoint = `/v1/candles/minutes/30`;
          break;
        case "1h":
          endpoint = `/v1/candles/minutes/60`;
          break;
        case "4h":
          endpoint = `/v1/candles/minutes/240`;
          break;
        case "1d":
          endpoint = `/v1/candles/days`;
          break;
        case "1w":
          endpoint = `/v1/candles/weeks`;
          break;
        case "1M":
          endpoint = `/v1/candles/months`;
          break;
        default:
          endpoint = `/v1/candles/minutes/1`;
      }

      const params = new URLSearchParams({
        market,
        count: count.toString(),
      });

      if (to > 0) {
        // Convert timestamp to ISO string for Upbit API
        const toDate = new Date(to * 1000).toISOString();
        params.set("to", toDate);
      }

      const url = `${BASE_URL}${endpoint}?${params}`;

      const response = await axios.get(url, {
        headers: {
          Accept: "application/json",
        },
      });

      // Convert Upbit format to our format
      return response.data.map((item: any) => ({
        timestamp: Math.floor(
          new Date(item.candle_date_time_kst).getTime() / 1000
        ),
        open: item.opening_price,
        high: item.high_price,
        low: item.low_price,
        close: item.trade_price,
        volume: item.candle_acc_trade_volume,
      }));
    } catch (error) {
      console.error("Error fetching Upbit candle data:", error);
      throw error;
    }
  }

  static async getUSDTCandles(
    interval: string = "1",
    to: number = 0,
    count: number = 200
  ): Promise<CandleData[]> {
    return this.getTickerCandles("USDT", interval, to, count);
  }

  async placeOrder(params: OrderRequest): Promise<string> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const market = `KRW-${params.symbol}`;
      const upbitSide = params.side === "buy" ? "bid" : "ask"; // buy -> bid, sell -> ask
      const orderData: any = {
        market: market,
        side: upbitSide,
        ord_type: params.type,
      };

      if (upbitSide === "bid") {
        // 매수
        if (params.type === "price") {
          orderData.price = params.amount; // 매수 금액
        } else {
          orderData.volume = params.amount; // 매수 수량
          orderData.price = params.price;
        }
      } else {
        // 매도
        if (params.type === "market") {
          orderData.volume = params.amount; // 매도 수량
        } else {
          orderData.volume = params.amount; // 매도 수량
          orderData.price = params.price;
        }
      }

      const { raw } = this.buildQueryStrings(orderData);
      const token = this.createJwt(raw);

      const response = await axios.post(`${BASE_URL}/v1/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // 주문 UUID만 반환
      const orderResult = response.data;
      return orderResult.uuid;
    } catch (error: any) {
      console.error(
        "Upbit placeOrder error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getOrder(orderId: string, symbol?: string): Promise<OrderResult> {
    const BASE_URL = "https://api.upbit.com";

    try {
      const queryParams = { uuid: orderId };
      const { encoded, raw } = this.buildQueryStrings(queryParams);
      const token = this.createJwt(raw);

      const response = await axios.get(`${BASE_URL}/v1/order?${encoded}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const order = response.data;
      const symbolFromMarket = order.market.replace("KRW-", "");

      // trades 배열 집계
      let totalFunds = 0;
      let totalVolume = 0;
      if (Array.isArray(order.trades)) {
        for (const trade of order.trades) {
          totalFunds += parseFloat(trade.funds);
          totalVolume += parseFloat(trade.volume);
        }
      }

      // 평균 가격 계산 (totalFunds / totalVolume)
      const avgPrice =
        totalVolume > 0 ? totalFunds / totalVolume : parseFloat(order?.price);

      return {
        id: order.uuid,
        symbol: symbolFromMarket,
        type: order.ord_type,
        side: order.side,
        amount: parseFloat(order.executed_volume),
        filled: totalFunds,
        price: avgPrice,
        fee: parseFloat(
          order?.reserved_fee && order.reserved_fee !== "0"
            ? order.reserved_fee
            : order.paid_fee
        ),
        timestamp: new Date(order.created_at).getTime(),
      };
    } catch (error: any) {
      console.error(
        "Upbit getOrder error:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getTicker(symbol: string): Promise<TickerResult> {
    const cacheKey = `upbit:KRW-${symbol}`;
    const now = Date.now();
    const cached = await getCache(cacheKey);
    if (cached && now - cached.timestamp < 1000) {
      return cached.data;
    }
    try {
      const response = await axios.get(
        `https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`
      );
      if (response.data && response.data.length > 0) {
        const ticker: TickerResult = {
          symbol: symbol,
          price: response.data[0].trade_price,
          timestamp: now,
        };
        await setCache(cacheKey, { data: ticker, timestamp: now });
        return ticker;
      }
      throw new Error(`No ticker data found for ${symbol}`);
    } catch (error) {
      console.error(`Error fetching ${symbol} ticker from Upbit:`, error);
      throw error;
    }
  }

  async getLotSize(symbol: string): Promise<number | null> {
    // Upbit는 고정된 최소 주문 단위를 제공하지 않음
    return null;
  }

  async setLeverage(symbol: string, leverage: string): Promise<any> {
    throw new Error("Upbit does not support leverage settings.");
  }
}
