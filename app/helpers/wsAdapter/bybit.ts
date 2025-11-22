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
   * symbols와 symbol을 머지하여 단일 구독 메시지 생성
   * @param symbols - orderbook만 구독할 심볼들 (포지션)
   * @param symbol - orderbook + kline + ticker 구독할 심볼 (selectedTickerItem)
   * @param interval - 캔들 인터벌
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

    const args: string[] = [];

    // 모든 심볼에 대해 orderbook 구독 (Bybit은 depth 1, 50, 500만 지원)
    allSymbols.forEach((s) => {
      args.push(`orderbook.50.${s}USDT`);
    });

    // symbol이 있으면 kline + ticker 추가 구독
    if (symbol) {
      const convertedInterval =
        interval_map[interval as keyof typeof interval_map] || "1";
      args.push(`kline.${convertedInterval}.${symbol}USDT`);
      args.push(`tickers.${symbol}USDT`);
    }

    return {
      op: "subscribe",
      args,
    };
  }

  /**
   * 구독 해제 메시지 생성
   * @param symbols - 구독 해제할 심볼들
   * @param symbol - 구독 해제할 selectedTickerItem 심볼 (kline/ticker 포함)
   * @param interval - 캔들 인터벌
   */
  getUnsubscribeMessage(
    symbols: string[],
    symbol: string | null,
    interval: string = "1m"
  ) {
    const args: string[] = [];

    // symbols에 대해 orderbook 구독 해제
    symbols.forEach((s) => {
      args.push(`orderbook.50.${s}USDT`);
    });

    // symbol이 있으면 kline + ticker도 구독 해제
    if (symbol) {
      const convertedInterval =
        interval_map[interval as keyof typeof interval_map] || "1";
      args.push(`kline.${convertedInterval}.${symbol}USDT`);
      args.push(`tickers.${symbol}USDT`);
    }

    return {
      op: "unsubscribe",
      args,
    };
  }

  /**
   * 특정 심볼의 특정 채널만 구독 해제
   * @param symbol - 심볼
   * @param channels - 구독 해제할 채널 목록 ['kline', 'ticker', 'orderbook']
   * @param interval - 캔들 인터벌
   */
  getUnsubscribeChannelsMessage(
    symbol: string,
    channels: string[],
    interval: string = "1m"
  ) {
    const args: string[] = [];
    const convertedInterval =
      interval_map[interval as keyof typeof interval_map] || "1";

    channels.forEach((channel) => {
      if (channel === "kline") {
        args.push(`kline.${convertedInterval}.${symbol}USDT`);
      } else if (channel === "ticker") {
        args.push(`tickers.${symbol}USDT`);
      } else if (channel === "orderbook") {
        args.push(`orderbook.50.${symbol}USDT`);
      }
    });

    return {
      op: "unsubscribe",
      args,
    };
  }

  /**
   * 특정 심볼의 특정 채널만 구독
   * @param symbol - 심볼
   * @param channels - 구독할 채널 목록 ['kline', 'ticker', 'orderbook']
   * @param interval - 캔들 인터벌
   */
  getSubscribeChannelsMessage(
    symbol: string,
    channels: string[],
    interval: string = "1m"
  ) {
    const args: string[] = [];
    const convertedInterval =
      interval_map[interval as keyof typeof interval_map] || "1";

    channels.forEach((channel) => {
      if (channel === "kline") {
        args.push(`kline.${convertedInterval}.${symbol}USDT`);
      } else if (channel === "ticker") {
        args.push(`tickers.${symbol}USDT`);
      } else if (channel === "orderbook") {
        args.push(`orderbook.50.${symbol}USDT`);
      }
    });

    return {
      op: "subscribe",
      args,
    };
  }

  getRequestMessage(type: string, params: WebSocketParams) {
    if (!params.symbol) {
      throw new Error("티커를 지정해야 합니다.");
    }
    const symbols = Array.isArray(params.symbol)
      ? params.symbol
      : [params.symbol];

    switch (type) {
      case "kline": {
        if (!params.interval) {
          throw new Error("인터벌을 지정해야 합니다.");
        }
        const interval =
          interval_map[params.interval as keyof typeof interval_map];
        return {
          op: "subscribe",
          args: symbols.map((symbol) => `kline.${interval}.${symbol}USDT`),
        };
      }
      case "ticker": {
        return {
          op: "subscribe",
          args: symbols.map((symbol) => `tickers.${symbol}USDT`),
        };
      }
      case "orderbook": {
        // orderbook 구독 args 생성 (Bybit은 depth 1, 50, 500만 지원)
        const args = symbols.map((symbol) => `orderbook.50.${symbol}USDT`);

        // selectedSymbol이 있으면, kline과 ticker 추가
        if (params.selectedSymbol) {
          if (params.interval) {
            const interval =
              interval_map[params.interval as keyof typeof interval_map];
            args.push(`kline.${interval}.${params.selectedSymbol}USDT`);
          }
          args.push(`tickers.${params.selectedSymbol}USDT`);
        }

        return {
          op: "subscribe",
          args,
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

        // 원본 데이터가 있으면 반환 (그룹화는 UI에서 처리)
        if (rawOrderBook) {
          // 정렬만 수행
          const sortedBids = [...rawOrderBook.bids].sort(
            (a, b) => b.price - a.price
          );
          const sortedAsks = [...rawOrderBook.asks].sort(
            (a, b) => a.price - b.price
          );

          return {
            channel: "orderbook",
            symbol,
            bids: sortedBids,
            asks: sortedAsks,
            timestamp: Date.now(),
          } as OrderBookData;
        }

        return null;
      }
    }
    return null;
  }
}
