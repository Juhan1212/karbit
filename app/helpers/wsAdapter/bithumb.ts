import type { WebSocketAdapter, WebSocketParams } from "./base";
import type { CandleBarData } from "../../types/marketInfo";
import { toUppercaseKRWSymbol } from "../common";

export class BithumbWebSocketAdapter implements WebSocketAdapter {
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
          { format: "JSON_LIST" },
        ];
      }
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  getResponseMessage(message: any) {
    try {
      // 배열인지 확인하고, 첫 번째 요소가 존재하는지 확인
      if (
        Array.isArray(message) &&
        message[0] &&
        message[0].type?.startsWith("candle")
      ) {
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
      }
    } catch (error) {
      console.log("Bithumb adapter error - received message:", message);
      console.error("WebSocket message parsing error:", error);
    }
    return null;
  }
}
