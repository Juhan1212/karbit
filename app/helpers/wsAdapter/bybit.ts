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
  // symbol별 원본 orderbook 상태 관리 (그룹화 전)
  private rawOrderBookStates: Map<
    string,
    {
      bids: { price: number; amount: number; total: number }[];
      asks: { price: number; amount: number; total: number }[];
    }
  > = new Map();

  /**
   * 원래 호가 단위(tick size)를 감지합니다.
   * 연속된 가격들의 최소 차이를 계산하여 판단합니다.
   */
  private detectTickSize(
    orders: { price: number; amount: number; total: number }[]
  ): number {
    if (orders.length < 2) return 0.001; // 기본값

    // 가격 차이들을 계산
    const differences: number[] = [];
    for (let i = 1; i < Math.min(orders.length, 20); i++) {
      const diff = Math.abs(orders[i].price - orders[i - 1].price);
      if (diff > 0) {
        // 부동소수점 오차 보정: 소수점 8자리로 반올림
        differences.push(Number(diff.toFixed(8)));
      }
    }

    if (differences.length === 0) return 0.001;

    // 최소 차이 찾기
    const minDiff = Math.min(...differences);

    // 일반적인 tick size 중에서 가장 가까운 값 찾기
    const commonTickSizes = [0.00001, 0.0001, 0.001, 0.01, 0.1, 1, 10, 100];

    for (const tickSize of commonTickSizes) {
      // minDiff가 tickSize의 0.5배 이상이면 해당 tickSize로 판단
      if (minDiff >= tickSize * 0.5) {
        return tickSize;
      }
    }

    return 0.001; // 기본값
  }

  /**
   * 호가를 특정 단위로 그룹화
   * 예: 1.1234, 1.1233, 1.1232 -> 1.123으로 합침
   *
   * @param orders 원본 호가 데이터
   * @param targetTickSize 그룹화할 목표 단위 (예: 0.001)
   * @returns 그룹화된 호가 데이터
   */
  private groupOrderBookByPrice(
    orders: { price: number; amount: number; total: number }[],
    targetTickSize: number = 0.001
  ): { price: number; amount: number; total: number }[] {
    if (orders.length === 0) return [];

    // 원래 호가 단위 감지
    const originalTickSize = this.detectTickSize(orders);

    // 원래 호가 단위가 목표 단위보다 크거나 같으면 그룹화하지 않음
    if (originalTickSize >= targetTickSize) {
      return orders;
    }

    // 그룹화 실행
    const grouped = new Map<number, { amount: number; total: number }>();

    orders.forEach(({ price, amount, total }) => {
      // 가격을 targetTickSize 단위로 내림 (floor)
      // 부동소수점 오차 방지를 위해 반올림 처리
      const groupedPrice = Number(
        (Math.floor(price / targetTickSize) * targetTickSize).toFixed(8)
      );

      if (grouped.has(groupedPrice)) {
        const existing = grouped.get(groupedPrice)!;
        grouped.set(groupedPrice, {
          amount: existing.amount + amount,
          total: existing.total + total,
        });
      } else {
        grouped.set(groupedPrice, { amount, total });
      }
    });

    // Map을 배열로 변환
    return Array.from(grouped.entries()).map(([price, { amount, total }]) => ({
      price,
      amount,
      total,
    }));
  }

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
          args: [`orderbook.200.${params.symbol}USDT`],
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

        // 현재 저장된 원본 orderbook 상태 가져오기
        let rawOrderBook = this.rawOrderBookStates.get(symbol);

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

          // 원본 데이터 저장
          rawOrderBook = { bids, asks };
          this.rawOrderBookStates.set(symbol, rawOrderBook);
        } else if (messageType === "delta" && rawOrderBook) {
          // delta: 기존 원본 상태 업데이트
          const updatedBids = [...rawOrderBook.bids];
          const updatedAsks = [...rawOrderBook.asks];

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
          // updatedBids.sort((a, b) => b.price - a.price);
          // updatedAsks.sort((a, b) => a.price - b.price);

          // 원본 데이터 업데이트
          rawOrderBook = { bids: updatedBids, asks: updatedAsks };
          this.rawOrderBookStates.set(symbol, rawOrderBook);
        } else if (messageType === "delta" && !rawOrderBook) {
          // delta인데 기존 상태가 없으면 무시 (snapshot부터 시작해야 함)
          return null;
        }

        // 원본 데이터가 있으면 그룹화하여 반환
        if (rawOrderBook) {
          // 0.001 단위로 그룹화
          const groupedBids = this.groupOrderBookByPrice(
            rawOrderBook.bids,
            0.001
          );
          const groupedAsks = this.groupOrderBookByPrice(
            rawOrderBook.asks,
            0.001
          );

          // 그룹화 후 정렬
          groupedBids.sort((a, b) => b.price - a.price);
          groupedAsks.sort((a, b) => a.price - b.price);

          return {
            channel: "orderbook",
            symbol,
            bids: groupedBids,
            asks: groupedAsks,
            timestamp: Date.now(),
          } as OrderBookData;
        }

        return null;
      }
    }
    return null;
  }
}
