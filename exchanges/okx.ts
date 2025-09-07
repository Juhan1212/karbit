// OKX balance fetcher using OKX Node.js SDK
import { RestClient } from "okx-api";
import { ExchangeAdapter } from "./base";
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

  async getBalance(): Promise<number> {
    // USDT balance fetch
    const res = await this.client.getBalance();
    const usdt = res.find((a: any) => a.ccy === "USDT");
    return usdt ? parseFloat(usdt.notionalUsdForFutures) : 0;
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
}
