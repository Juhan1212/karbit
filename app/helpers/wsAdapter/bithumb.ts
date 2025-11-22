import type { WebSocketAdapter, WebSocketParams } from "./base";
import type { CandleBarData, OrderBookData } from "../../types/marketInfo";
import { toUppercaseKRWSymbol } from "../common";

export class BithumbWebSocketAdapter implements WebSocketAdapter {
  /**
   * symbols와 symbol을 머지하여 단일 구독 메시지 생성
   * 빗썸은 candle 웹소켓을 제공하지 않으므로 orderbook만 구독
   * @param symbols - orderbook 구독할 심볼들 (포지션)
   * @param symbol - orderbook 구독할 심볼 (selectedTickerItem)
   * @param interval - 사용되지 않음 (빗썸은 candle 미지원)
   */
  getUpdateSubscriptionMessage(
    symbols: string[],
    symbol: string | null,
    interval: string = "1m"
  ) {
    // 모든 심볼 수집 (중복 제거)
    const allSymbols = new Set<string>(symbols);
    if (symbol) {
      allSymbols.add(symbol);
    }

    const symbolArray = Array.from(allSymbols);
    const codes = symbolArray.map((s) => toUppercaseKRWSymbol(s));
    codes.push("KRW-USDT"); // 환율용

    return [
      { ticket: "test" },
      {
        type: "orderbook",
        codes,
      },
    ];
  }
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

        // 빗썸은 아직 candle 웹소켓 지원 안 함
        // selectedSymbol이 있고 symbols에 포함되지 않은 경우 kline도 구독
        // if (params.selectedSymbol) {
        //   let interval = params.interval || "1m";
        //   if (interval === "1h") interval = "60m";
        //   if (interval === "4h") interval = "240m";

        //   return [
        //     { ticket: "test" },
        //     {
        //       type: "orderbook",
        //       codes: symbols.map((symbol) => toUppercaseKRWSymbol(symbol)),
        //     },
        //     {
        //       type: `candle.${interval}`,
        //       codes: [toUppercaseKRWSymbol(params.selectedSymbol)],
        //     },
        //     { format: "JSON_LIST" },
        //   ];
        // }

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

  getResponseMessage(message: any): CandleBarData | OrderBookData | null {
    try {
      // 배열로 데이터를 받는 경우 첫 번째 요소 사용
      const data = Array.isArray(message) ? message[0] : message;

      if (!data || !data.type) {
        return null;
      }

      if (data.type.startsWith("candle")) {
        return {
          channel: "kline",
          symbol: data.code.replace("KRW-", ""),
          time: new Date(data.candle_date_time_utc + "Z").getTime(),
          open: Number(data.opening_price),
          high: Number(data.high_price),
          low: Number(data.low_price),
          close: Number(data.trade_price),
          volume: Number(data.candle_acc_trade_volume),
        } as CandleBarData;
      } else if (data.type === "orderbook") {
        const orderbookUnits = data.orderbook_units || [];
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
          symbol: data.code.replace("KRW-", ""),
          bids,
          asks,
          timestamp: Date.now(),
        } as OrderBookData;
      }
    } catch (error) {
      // console.log("Bithumb adapter error - received message:", message);
      console.error("WebSocket message parsing error:", error);
    }
    return null;
  }
}
