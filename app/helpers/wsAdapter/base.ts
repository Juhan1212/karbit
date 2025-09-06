import type {
  CandleBarData,
  TickerData,
  PositionData,
} from "../../types/marketInfo";
import { ExchangeType } from "../../types/exchange";
import { BybitWebSocketAdapter } from "./bybit";
import { GateioAdapter } from "./gateio";
import { UpbitWebSocketAdapter } from "./upbit";

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
  static getAdapter(exchange: ExchangeType): WebSocketAdapter {
    switch (exchange) {
      case ExchangeType.GATEIO:
        return new GateioAdapter();
      case ExchangeType.UPBIT:
        return new UpbitWebSocketAdapter();
      case ExchangeType.BYBIT:
        return new BybitWebSocketAdapter();
      default:
        throw new Error(`No adapter found for exchange: ${exchange}`);
    }
  }
}
