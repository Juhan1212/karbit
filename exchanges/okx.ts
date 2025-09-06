// OKX balance fetcher using OKX Node.js SDK
import { RestClient } from "okx-api";

export class OkxAdapter {
  private client: RestClient;
  constructor(
    private apiKey: string,
    private apiSecret: string,
    private passphrase: string
  ) {
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
}
