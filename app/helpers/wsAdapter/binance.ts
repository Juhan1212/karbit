import type { WebSocketAdapter, WebSocketParams } from "./base";
import type {
  CandleBarData,
  TickerData,
  OrderBookData,
} from "../../types/marketInfo";

interface BinanceOrderBookData {
  e: string; // event type
  E: number; // event time
  s: string; // symbol
  U: number; // first update ID
  u: number; // final update ID
  b: [string, string][]; // bids: [[price, quantity], ...]
  a: [string, string][]; // asks: [[price, quantity], ...]
}

type BinanceWebSocketMessage = BinanceOrderBookData;

export class BinanceWebSocketAdapter implements WebSocketAdapter {
  getRequestMessage(type: string, params: WebSocketParams) {
    if (!params.symbol) {
      throw new Error("티커를 지정해야 합니다.");
    }
    switch (type) {
      case "kline": {
        if (!params.interval) {
          throw new Error("인터벌을 지정해야 합니다.");
        }
        return {
          method: "SUBSCRIBE",
          params: [`${params.symbol}usdt@kline_${params.interval}`],
          id: Date.now(),
        };
      }
      case "ticker": {
        return {
          method: "SUBSCRIBE",
          params: [`${params.symbol}usdt@ticker`],
          id: Date.now(),
        };
      }
      case "orderbook": {
        return {
          method: "SUBSCRIBE",
          params: [`${params.symbol}usdt@depth20`],
          id: Date.now(),
        };
      }
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  getResponseMessage(
    message: BinanceWebSocketMessage
  ): CandleBarData | TickerData | null {
    // 아직 구현되지 않음
    return null;
  }
}
