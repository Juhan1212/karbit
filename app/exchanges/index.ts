// Facade for all exchange adapters (Adapter + Facade pattern)
import { UpbitAdapter } from "./upbit";
import { BithumbAdapter } from "./bithumb";
import { BinanceAdapter } from "./binance";
import { BybitAdapter } from "./bybit"; // BybitAdapter import
// 다른 Adapter도 동일하게 import 및 타입 보장 필요
import { OkxAdapter } from "./okx";
import { ExchangeAdapter } from "./base";
import {
  KoreanExchangeType,
  UppercaseExchangeType,
  LowercaseExchangeType,
  ExchangeTypeConverter,
} from "~/types/exchange";

export {
  KoreanExchangeType,
  UppercaseExchangeType,
  LowercaseExchangeType,
} from "~/types/exchange";
export { ExchangeAdapter } from "./base";

export function createExchangeAdapter(
  exchangeName:
    | KoreanExchangeType
    | UppercaseExchangeType
    | LowercaseExchangeType,
  credentials?: { apiKey: string; apiSecret: string; passphrase?: string }
): ExchangeAdapter {
  const apiKey = credentials?.apiKey || "";
  const apiSecret = credentials?.apiSecret || "";
  const passphrase = credentials?.passphrase || "";

  // 모든 타입을 KoreanExchangeType으로 변환
  let koreanType: KoreanExchangeType;

  // 입력 타입에 따라 적절한 변환 함수 사용
  if (
    Object.values(KoreanExchangeType).includes(
      exchangeName as KoreanExchangeType
    )
  ) {
    koreanType = exchangeName as KoreanExchangeType;
  } else if (
    Object.values(UppercaseExchangeType).includes(
      exchangeName as UppercaseExchangeType
    )
  ) {
    koreanType = ExchangeTypeConverter.fromUppercaseToKorean(
      exchangeName as UppercaseExchangeType
    );
  } else if (
    Object.values(LowercaseExchangeType).includes(
      exchangeName as LowercaseExchangeType
    )
  ) {
    const uppercaseType = ExchangeTypeConverter.fromLowercaseToUppercase(
      exchangeName as LowercaseExchangeType
    );
    koreanType = ExchangeTypeConverter.fromUppercaseToKorean(uppercaseType);
  } else {
    throw new Error(`Unsupported exchange: ${exchangeName}`);
  }

  switch (koreanType) {
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
      throw new Error(`Unsupported exchange: ${koreanType}`);
  }
}
