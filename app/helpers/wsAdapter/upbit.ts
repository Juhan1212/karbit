import type { WebSocketAdapter, WebSocketParams } from "./base";
import type { CandleBarData, OrderBookData } from "../../types/marketInfo";
import { toUppercaseKRWSymbol } from "../common";

export class UpbitWebSocketAdapter implements WebSocketAdapter {
  getRequestMessage(type: string, params: WebSocketParams) {
    switch (type) {
      case "kline": {
        if (!params.symbol || !params.interval) {
          throw new Error("티커와 인터벌을 모두 지정해야 합니다.");
        }
        const symbols = Array.isArray(params.symbol)
          ? params.symbol
          : [params.symbol];
        symbols.push("KRW-USDT");
        let interval = params["interval"] || "1m";
        if (interval === "1h") interval = "60m";
        if (interval === "4h") interval = "240m";
        return [
          { ticket: "test" },
          {
            type: `candle.${interval}`,
            codes: symbols.map((symbol) => toUppercaseKRWSymbol(symbol)),
          },
          {
            type: "orderbook",
            codes: symbols.map((symbol) => toUppercaseKRWSymbol(symbol)),
          },
          { format: "JSON_LIST" },
        ];
      }
      case "orderbook": {
        if (!params.symbol) {
          throw new Error("심볼을 지정해야 합니다.");
        }
        const symbols = Array.isArray(params.symbol)
          ? params.symbol
          : [params.symbol];
        return [
          { ticket: "test" },
          {
            type: "orderbook",
            codes: symbols.map((symbol) => toUppercaseKRWSymbol(symbol)),
          },
        ];
      }
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  getResponseMessage(
    message: {
      type: string;
      code: string;
      [key: string]: any;
    }[]
  ): CandleBarData | OrderBookData | null {
    try {
      if (message[0].type.startsWith("candle")) {
        return {
          channel: "kline",
          symbol: message[0].code.replace("KRW-", ""),
          time: new Date(message[0].candle_date_time_utc + "Z").getTime(),
          open: Number(message[0].opening_price),
          high: Number(message[0].high_price),
          low: Number(message[0].low_price),
          close: Number(message[0].trade_price),
          volume: Number(message[0].candle_acc_trade_volume),
        } as CandleBarData;
      } else if (message[0].type === "orderbook") {
        const orderbookUnits = message[0].orderbook_units || [];
        const bids: { price: number; amount: number; total: number }[] = [];
        const asks: { price: number; amount: number; total: number }[] = [];

        orderbookUnits.forEach((unit: any) => {
          if (unit.bid_price && unit.bid_size) {
            const price = Number(unit.bid_price);
            const amount = Number(unit.bid_size);
            bids.push({ price, amount, total: price * amount });
          }
          if (unit.ask_price && unit.ask_size) {
            const price = Number(unit.ask_price);
            const amount = Number(unit.ask_size);
            asks.push({ price, amount, total: price * amount });
          }
        });

        return {
          channel: "orderbook",
          symbol: message[0].code.replace("KRW-", ""),
          bids,
          asks,
          timestamp: Date.now(),
        } as OrderBookData;
      }
    } catch (error) {
      console.log(message);
      console.error("WebSocket message parsing error:", error);
    }
    return null;
  }
}
