// Binance balance fetcher using Binance Node.js SDK
import Binance from "node-binance-api";
import { ExchangeAdapter } from "./base";
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
}
