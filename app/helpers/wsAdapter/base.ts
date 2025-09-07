import type {
  CandleBarData,
  TickerData,
  PositionData,
} from "../../types/marketInfo";
import { UppercaseExchangeType } from "../../types/exchange";
import { BybitWebSocketAdapter } from "./bybit";
import { GateioAdapter } from "./gateio";
import { UpbitWebSocketAdapter } from "./upbit";
import { BithumbWebSocketAdapter } from "./bithumb";

export interface WebSocketAdapter {
  getResponseMessage(
    message: object
  ): TickerData | CandleBarData | PositionData | null;
  getRequestMessage(type: string, params: WebSocketParams): object | undefined;
}

export interface WebSocketParams {
  interval?: string;
  symbol?: string;
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
      default:
        throw new Error(`No adapter found for exchange: ${exchange}`);
    }
  }
}
