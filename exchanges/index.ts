// Facade for all exchange adapters (Adapter + Facade pattern)
import { UpbitAdapter } from "./upbit";
import { BithumbAdapter } from "./bithumb";
import { BinanceAdapter } from "./binance";
import { BybitAdapter } from "./bybit";
import { OkxAdapter } from "./okx";
import { KoreanExchangeType } from "../app/types/exchange";

export { KoreanExchangeType } from "../app/types/exchange";

export interface ExchangeAdapter {
  getBalance(): Promise<number>;
}

export function createExchangeAdapter(
  exchangeName: KoreanExchangeType,
  credentials?: { apiKey: string; apiSecret: string; passphrase?: string }
): ExchangeAdapter {
  const apiKey = credentials?.apiKey || "";
  const apiSecret = credentials?.apiSecret || "";
  const passphrase = credentials?.passphrase || "";

  switch (exchangeName) {
    case KoreanExchangeType.업비트:
      return new UpbitAdapter(apiKey, apiSecret);
    case KoreanExchangeType.빗썸:
      return new BithumbAdapter(apiKey, apiSecret);
    case KoreanExchangeType.바이낸스:
      return new BinanceAdapter(apiKey, apiSecret);
    case KoreanExchangeType.바이빗:
      return new BybitAdapter(apiKey, apiSecret);
    case KoreanExchangeType.OKX:
      return new OkxAdapter(apiKey, apiSecret, passphrase);
    default:
      throw new Error(`Unsupported exchange: ${exchangeName}`);
  }
}
