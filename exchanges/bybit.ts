// Bybit balance fetcher using Bybit Node.js SDK
import { RestClientV5 } from "bybit-api";
import axios from "axios";
import type { CandleData } from "./upbit";
import { ExchangeAdapter } from "./base";

export class BybitAdapter extends ExchangeAdapter {
  private client: RestClientV5;

  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret);
    this.client = new RestClientV5({
      key: apiKey,
      secret: apiSecret,
    });
  }

  async getBalance(): Promise<number> {
    const res = await this.client.getWalletBalance({
      accountType: "UNIFIED",
      coin: "USDT",
    });
    const usdt = res.result.list?.[0]?.totalAvailableBalance;
    return usdt ? parseFloat(usdt) : 0;
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
}
