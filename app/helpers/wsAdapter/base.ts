import type {
  CandleBarData,
  TickerData,
  PositionData,
  OrderBookData,
} from "../../types/marketInfo";
import { UppercaseExchangeType } from "../../types/exchange";
import { BybitWebSocketAdapter } from "./bybit";
import { GateioAdapter } from "./gateio";
import { UpbitWebSocketAdapter } from "./upbit";
import { BithumbWebSocketAdapter } from "./bithumb";
import { BinanceWebSocketAdapter } from "./binance";

export interface WebSocketAdapter {
  getResponseMessage(
    message: object
  ): TickerData | CandleBarData | PositionData | OrderBookData | null;
  getRequestMessage(type: string, params: WebSocketParams): object | undefined;
}

export interface WebSocketParams {
  interval?: string;
  symbol?: string | string[]; // 단일 또는 배열 지원
  selectedSymbol?: string; // selectedTickerItem의 symbol (추가 kline/ticker 구독용)
}

export class WebSocketAdapterFactory {
  static getAdapter(exchange: UppercaseExchangeType): WebSocketAdapter {
    switch (exchange) {
      case UppercaseExchangeType.GATEIO:
        return new GateioAdapter();
      case UppercaseExchangeType.UPBIT:
        return new UpbitWebSocketAdapter();
      case UppercaseExchangeType.BYBIT:
        return new BybitWebSocketAdapter();
      case UppercaseExchangeType.BITHUMB:
        return new BithumbWebSocketAdapter();
      case UppercaseExchangeType.BINANCE:
        return new BinanceWebSocketAdapter();
      default:
        throw new Error(`No adapter found for exchange: ${exchange}`);
    }
  }
}
