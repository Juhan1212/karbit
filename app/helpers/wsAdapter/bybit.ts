import type { WebSocketAdapter, WebSocketParams } from "./base";
import type {
  CandleBarData,
  TickerData,
  OrderBookData,
} from "../../types/marketInfo";

interface BybitKlineData {
  symbol: string;
  start: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface BybitTickerData {
  symbol: string;
  mark_price?: string;
  index_price?: string;
  funding_rate?: string;
  price24hPcnt?: string;
  lastPrice?: string;
  [key: string]: unknown;
}

interface BybitOrderBookData {
  s: string; // symbol
  b: [string, string][]; // bids: [[price, amount], ...]
  a: [string, string][]; // asks: [[price, amount], ...]
  u: number; // update id
  seq?: number; // sequence number
}

type BybitWebSocketMessage = {
  topic: string;
  data: BybitKlineData | BybitTickerData | BybitOrderBookData;
  type?: "snapshot" | "delta"; // orderbook 메시지 타입
  ts?: number; // timestamp
  cts?: number; // client timestamp
  [key: string]: unknown;
};

const interval_map = {
  "1m": "1",
  "3m": "3",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  "8h": "480",
  "1d": "D",
  "1w": "W",
};

export class BybitWebSocketAdapter implements WebSocketAdapter {
  // symbol별 orderbook 상태 관리
  private orderBookStates: Map<string, OrderBookData> = new Map();
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
          op: "subscribe",
          args: [
            `kline.${interval_map[params.interval as keyof typeof interval_map]}.${params.symbol}USDT`,
          ],
        };
      }
      case "ticker": {
        return {
          op: "subscribe",
          args: [`tickers.${params.symbol}USDT`],
        };
      }
      case "orderbook": {
        return {
          op: "subscribe",
          args: [`orderbook.50.${params.symbol}USDT`],
        };
      }
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  getResponseMessage(
    message: BybitWebSocketMessage
  ): CandleBarData | TickerData | OrderBookData | null {
    if (message.topic && message.data) {
      if (message.topic.startsWith("kline.")) {
        let d = message.data as BybitKlineData | BybitKlineData[];
        if (Array.isArray(d)) {
          d = d[0];
        }
        if (!d) return null;
        return {
          channel: "kline",
          symbol: d.symbol || (message.topic.split(".")[2] ?? ""),
          time: Number(d.start),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume),
        } as CandleBarData;
      } else if (message.topic.startsWith("tickers.")) {
        const d = message.data as BybitTickerData;
        return {
          channel: "futures.tickers",
          change_percentage: d.price24hPcnt,
          funding_rate: d.fundingRate,
          mark_price: d.markPrice ?? d.lastPrice,
          index_price: d.indexPrice,
        } as TickerData;
      } else if (message.topic.startsWith("orderbook.")) {
        const d = message.data as BybitOrderBookData;
        const symbol = d.s.replace(/USDT$/, ""); // data.s에서 심볼 가져와서 USDT 제거
        const messageType = message.type || "snapshot"; // message.type에서 타입 가져오기

        // 현재 저장된 orderbook 상태 가져오기
        let currentOrderBook = this.orderBookStates.get(symbol);

        if (messageType === "snapshot") {
          // snapshot: 전체 orderbook 교체
          const bids = d.b.map(([price, amount]) => ({
            price: Number(price),
            amount: Number(amount),
            total: Number(price) * Number(amount),
          }));

          const asks = d.a.map(([price, amount]) => ({
            price: Number(price),
            amount: Number(amount),
            total: Number(price) * Number(amount),
          }));

          currentOrderBook = {
            channel: "orderbook",
            symbol,
            bids,
            asks,
            timestamp: Date.now(),
          } as OrderBookData;
        } else if (messageType === "delta" && currentOrderBook) {
          // delta: 기존 상태 업데이트
          const updatedBids = [...currentOrderBook.bids];
          const updatedAsks = [...currentOrderBook.asks];

          // bids 업데이트
          d.b.forEach(([priceStr, amountStr]) => {
            const price = Number(priceStr);
            const amount = Number(amountStr);

            if (amount === 0) {
              // amount가 0이면 삭제
              const index = updatedBids.findIndex((bid) => bid.price === price);
              if (index !== -1) {
                updatedBids.splice(index, 1);
              }
            } else {
              // amount가 0이 아니면 업데이트 또는 추가
              const existingIndex = updatedBids.findIndex(
                (bid) => bid.price === price
              );
              const newBid = {
                price,
                amount,
                total: price * amount,
              };

              if (existingIndex !== -1) {
                updatedBids[existingIndex] = newBid;
              } else {
                updatedBids.push(newBid);
              }
            }
          });

          // asks 업데이트
          d.a.forEach(([priceStr, amountStr]) => {
            const price = Number(priceStr);
            const amount = Number(amountStr);

            if (amount === 0) {
              // amount가 0이면 삭제
              const index = updatedAsks.findIndex((ask) => ask.price === price);
              if (index !== -1) {
                updatedAsks.splice(index, 1);
              }
            } else {
              // amount가 0이 아니면 업데이트 또는 추가
              const existingIndex = updatedAsks.findIndex(
                (ask) => ask.price === price
              );
              const newAsk = {
                price,
                amount,
                total: price * amount,
              };

              if (existingIndex !== -1) {
                updatedAsks[existingIndex] = newAsk;
              } else {
                updatedAsks.push(newAsk);
              }
            }
          });

          // 정렬 유지 (bids: 가격 내림차순, asks: 가격 오름차순)
          updatedBids.sort((a, b) => b.price - a.price);
          updatedAsks.sort((a, b) => a.price - b.price);

          currentOrderBook = {
            ...currentOrderBook,
            bids: updatedBids,
            asks: updatedAsks,
            timestamp: Date.now(),
          };
        } else if (messageType === "delta" && !currentOrderBook) {
          // delta인데 기존 상태가 없으면 무시 (snapshot부터 시작해야 함)
          return null;
        }

        // 상태 저장
        if (currentOrderBook) {
          this.orderBookStates.set(symbol, currentOrderBook);
        }

        return currentOrderBook || null;
      }
    }
    return null;
  }
}
