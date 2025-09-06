// Binance balance fetcher using Binance Node.js SDK
import Binance from "node-binance-api";

export class BinanceAdapter {
  private client: any;
  constructor(
    private apiKey: string,
    private apiSecret: string
  ) {
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
}
