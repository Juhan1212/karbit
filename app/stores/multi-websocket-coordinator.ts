import { createWebSocketStore, type WebSocketState } from "./chartState";
import { WebSocketAdapterFactory } from "../helpers/wsAdapter/base";
import { type StoreApi } from "zustand";
import { UppercaseExchangeType } from "~/types/exchange";
import { toUppercaseKRWSymbol } from "~/helpers/common";

/**
 * MultiWebSocketCoordinator
 *
 * 여러 거래소의 WebSocket 스토어를 중앙에서 관리하는 Coordinator 클래스
 * - 포지션 배열을 기반으로 거래소별 WebSocket 스토어 생성 및 관리
 * - selectedTickerItem 변경 시 해당 스토어의 symbol 상태만 업데이트 (재연결 없음)
 * - cleanup 시 모든 스토어의 WebSocket 연결 해제
 */

type Position = {
  coin_symbol: string;
  kr_exchange: string;
  fr_exchange: string;
};

class MultiWebSocketCoordinator {
  // 거래소별 스토어 맵: 'binance', 'bybit', 'upbit', 'bithumb' 등
  private stores: Map<string, StoreApi<WebSocketState>> = new Map();

  // 거래소별 구독 심볼 목록: { 'binance': ['BTCUSDT', 'ETHUSDT'], ... }
  private exchangeSymbols: Map<string, Set<string>> = new Map();

  // 현재 포지션 배열 (원본 데이터 저장)
  private currentPositions: Position[] = [];

  // 이전 selectedTickerItem 추적
  private SelectedTickerItem: {
    korean_ex: string | null;
    foreign_ex: string | null;
    symbol: string | null;
  } = {
    korean_ex: null,
    foreign_ex: null,
    symbol: null,
  };

  // 현재 interval 저장 (재구독 시 사용)
  private currentInterval: string = "1m";

  /**
   * 포지션 배열을 기반으로 거래소별 WebSocket 스토어 초기화
   * @param rawActivePositions - 활성 포지션 배열
   * @param interval - 캠들 인터벌 (기본값: '1m')
   * @param selectedTickerItem - 선택된 티커 아이템 (옵션)
   */
  initialize(
    rawActivePositions: Position[],
    interval: string = "1m",
    selectedTickerItem?: any
  ) {
    // console.log(
    //   "[MultiWebSocketCoordinator] Initializing with positions:",
    //   rawActivePositions.length
    // );
    if (selectedTickerItem) {
      // console.log(
      //   "[MultiWebSocketCoordinator] With selectedTickerItem:",
      //   selectedTickerItem
      // );
    }

    // 현재 interval 저장
    this.currentInterval = interval;

    // 기존 스토어 정리
    this.cleanup();

    // 현재 포지션 배열 저장 (원본 데이터)
    this.currentPositions = rawActivePositions;

    // 거래소별로 심볼 그룹화
    const exchangeGroups = new Map<string, Set<string>>();

    rawActivePositions.forEach((position) => {
      const krEx = position.kr_exchange?.toLowerCase();
      const frEx = position.fr_exchange?.toLowerCase();
      const symbol = position.coin_symbol;

      if (krEx && symbol) {
        if (!exchangeGroups.has(krEx)) {
          exchangeGroups.set(krEx, new Set());
        }
        exchangeGroups.get(krEx)!.add(symbol);
      }

      if (frEx && symbol) {
        if (!exchangeGroups.has(frEx)) {
          exchangeGroups.set(frEx, new Set());
        }
        exchangeGroups.get(frEx)!.add(symbol);
      }
    });

    // selectedTickerItem이 있으면 해당 심볼도 추가
    if (selectedTickerItem) {
      const { korean_ex, foreign_ex, symbol } = selectedTickerItem;

      if (korean_ex && symbol) {
        if (!exchangeGroups.has(korean_ex)) {
          exchangeGroups.set(korean_ex, new Set());
        }
        exchangeGroups.get(korean_ex)!.add(symbol);
      }

      if (foreign_ex && symbol) {
        if (!exchangeGroups.has(foreign_ex)) {
          exchangeGroups.set(foreign_ex, new Set());
        }
        exchangeGroups.get(foreign_ex)!.add(symbol);
      }

      // SelectedTickerItem 저장
      this.SelectedTickerItem = {
        korean_ex,
        foreign_ex,
        symbol,
      };
    }

    // 거래소별 스토어 생성
    exchangeGroups.forEach((symbols, exchange) => {
      const symbolArray = Array.from(symbols);

      //   console.log(
      //     `[MultiWebSocketCoordinator] Creating store for ${exchange} with symbols:`,
      //     symbolArray
      //   );

      // selectedTickerItem의 symbol 추출 (해당 거래소인 경우)
      let selectedSymbol = "";
      if (selectedTickerItem) {
        const { korean_ex, foreign_ex, symbol } = selectedTickerItem;
        if (exchange === korean_ex || exchange === foreign_ex) {
          selectedSymbol = symbol;
        }
      }

      const store = createWebSocketStore({
        exchange,
        onReconnect: (ex) => this.initializeSubscription(ex, null),
      });

      this.stores.set(exchange, store);
      this.exchangeSymbols.set(exchange, symbols);

      // WebSocket 연결 시작 (onopen에서 initializeSubscription 호출됨)
      store.getState().connectWebSocket();
    });
  }

  /**
   * WebSocket 연결 시 호출되는 핸들러 (최초 연결 및 재연결)
   * 현재 상태 기반으로 구독 메시지를 전송
   * @param exchange - 연결된 거래소
   */
  private initializeSubscription(
    exchange: string,
    prevSelectedTickerItem?: any
  ) {
    // console.log(
    //   `[MultiWebSocketCoordinator] Initializing subscription for ${exchange}`
    // );

    const store = this.getStore(exchange);
    if (!store) {
      console.error(
        `[MultiWebSocketCoordinator] Store not found for ${exchange}`
      );
      return;
    }

    const state = store.getState();
    if (!state.isConnected || !state.socket) {
      console.warn(
        `[MultiWebSocketCoordinator] Socket not ready for ${exchange}`
      );
      return;
    }

    const symbols: string[] = Array.from(
      this.exchangeSymbols.get(exchange) || new Set<string>()
    );
    const { SelectedTickerItem, currentInterval } = this;

    // 해당 거래소가 selectedTickerItem의 거래소인지 확인
    let selectedSymbol = "";
    if (SelectedTickerItem.korean_ex === exchange) {
      selectedSymbol = SelectedTickerItem.symbol || "";
    } else if (SelectedTickerItem.foreign_ex === exchange) {
      selectedSymbol = SelectedTickerItem.symbol || "";
    }

    // console.log(`[MultiWebSocketCoordinator] Resubscribing ${exchange}:`, {
    //   symbols,
    //   selectedSymbol,
    //   interval: currentInterval,
    // });

    // 구독 메시지 조립 (initialize와 동일한 로직)
    let subscriptionMessage;
    const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;

    if (uppercaseExchange === UppercaseExchangeType.UPBIT) {
      const messages: any[] = [{ ticket: "test" }];

      // prevSelectedTickerItem이 currentPositions에 있는지 확인 (kr_exchange, fr_exchange, coin_symbol 매칭)
      const isPrevSymbolInPositions = prevSelectedTickerItem?.symbol
        ? this.currentPositions.some(
            (pos) =>
              pos.coin_symbol === prevSelectedTickerItem.symbol &&
              (pos.kr_exchange?.toLowerCase() === exchange ||
                pos.fr_exchange?.toLowerCase() === exchange)
          )
        : false;

      // selectedSymbol이 있고, 포지션에 없는 경우에만 candle 구독 추가
      // prevSelectedTickerItem이 포지션에 있으면 candle 구독 제외
      if (selectedSymbol) {
        messages.push({
          type: `candle.${currentInterval}`,
          codes: [toUppercaseKRWSymbol(selectedSymbol), "KRW-USDT"],
        });
      }

      // 포지션 심볼들의 orderbook 구독
      const orderbookCodes = symbols.map((symbol) =>
        toUppercaseKRWSymbol(symbol)
      );

      // selectedSymbol 처리:
      // - prevSelectedTickerItem이 포지션에 있으면: orderbook 추가
      // - prevSelectedTickerItem이 포지션에 없으면: orderbook 제외
      if (selectedSymbol) {
        if (!orderbookCodes.includes(toUppercaseKRWSymbol(selectedSymbol))) {
          orderbookCodes.push(toUppercaseKRWSymbol(selectedSymbol));
        }

        if (
          !isPrevSymbolInPositions &&
          prevSelectedTickerItem?.symbol &&
          selectedSymbol !== prevSelectedTickerItem.symbol
        ) {
          const prevSymbolIndex = orderbookCodes.indexOf(
            toUppercaseKRWSymbol(prevSelectedTickerItem.symbol)
          );
          if (prevSymbolIndex !== -1) {
            orderbookCodes.splice(prevSymbolIndex, 1);
          }
        }
      }

      messages.push({
        type: "orderbook",
        codes: orderbookCodes,
      });

      messages.push({ format: "JSON_LIST" });
      subscriptionMessage = messages;
    } else if (uppercaseExchange === UppercaseExchangeType.BITHUMB) {
      // prevSelectedTickerItem이 currentPositions에 있는지 확인 (kr_exchange, fr_exchange, coin_symbol 매칭)
      const isPrevSymbolInPositions = prevSelectedTickerItem?.symbol
        ? this.currentPositions.some(
            (pos) =>
              pos.coin_symbol === prevSelectedTickerItem.symbol &&
              (pos.kr_exchange?.toLowerCase() === exchange ||
                pos.fr_exchange?.toLowerCase() === exchange)
          )
        : false;

      const orderbookCodes = symbols.map((symbol) =>
        toUppercaseKRWSymbol(symbol)
      );

      // selectedSymbol 처리:
      // - prevSelectedTickerItem이 포지션에 있으면: orderbook 추가
      // - prevSelectedTickerItem이 포지션에 없으면: orderbook 제외
      if (selectedSymbol) {
        if (!orderbookCodes.includes(toUppercaseKRWSymbol(selectedSymbol))) {
          orderbookCodes.push(toUppercaseKRWSymbol(selectedSymbol));
        }

        if (
          !isPrevSymbolInPositions &&
          prevSelectedTickerItem?.symbol &&
          selectedSymbol !== prevSelectedTickerItem.symbol
        ) {
          console.log(
            "Removing previous symbol from Bithumb subscription:",
            prevSelectedTickerItem.symbol
          );
          const prevSymbolIndex = orderbookCodes.indexOf(
            toUppercaseKRWSymbol(prevSelectedTickerItem.symbol)
          );
          if (prevSymbolIndex !== -1) {
            orderbookCodes.splice(prevSymbolIndex, 1);
          }
        }
      }

      subscriptionMessage = [
        { ticket: "test" },
        {
          type: "orderbook",
          codes: orderbookCodes,
        },
      ];
    } else if (uppercaseExchange === UppercaseExchangeType.BYBIT) {
      const args: string[] = [];

      // selectedSymbol이 있는 경우에만 kline, ticker 구독 추가
      if (selectedSymbol) {
        // Bybit은 interval을 숫자로 변환해야 함 (1m -> 1)
        const intervalMap: Record<string, string> = {
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
        const convertedInterval = intervalMap[currentInterval] || "1";

        args.push(
          `kline.${convertedInterval}.${selectedSymbol}USDT`,
          `tickers.${selectedSymbol}USDT`
        );
      }

      // 포지션 심볼들의 orderbook 구독
      args.push(...symbols.map((symbol) => `orderbook.50.${symbol}USDT`));

      subscriptionMessage = {
        op: "subscribe",
        args,
      };
    }

    if (subscriptionMessage) {
      //   console.log(
      //     `[MultiWebSocketCoordinator] Sending resubscription for ${exchange}:`,
      //     subscriptionMessage
      //   );
      state.socket.send(JSON.stringify(subscriptionMessage));
    }
  }

  /**
   * interval 변경 시 모든 거래소 재구독
   * WebSocket 재연결 없이 새로운 구독 메시지만 전송
   * @param interval - 새로운 캔들 인터벌
   */
  updateInterval(interval: string) {
    console.log(
      `[MultiWebSocketCoordinator] Updating interval to: ${interval}`
    );

    // interval 업데이트
    this.currentInterval = interval;

    // 모든 연결된 거래소에 대해 재구독
    this.stores.forEach((store, exchange) => {
      const state = store.getState();
      if (state.isConnected && state.socket) {
        console.log(
          `[MultiWebSocketCoordinator] Resubscribing ${exchange} with new interval: ${interval}`
        );
        this.initializeSubscription(exchange);
      }
    });
  }

  /**
   * 특정 거래소의 스토어 가져오기
   * @param exchange - 거래소 이름 (소문자, 예: 'binance', 'upbit')
   * @returns WebSocket 스토어 또는 null
   */
  getStore(exchange: string): StoreApi<WebSocketState> | null {
    const lowerExchange = exchange.toLowerCase();
    return this.stores.get(lowerExchange) || null;
  }

  /**
   * 모든 거래소 스토어 배열 반환
   * @returns 모든 스토어 배열
   */
  getAllStores(): StoreApi<WebSocketState>[] {
    return Array.from(this.stores.values());
  }

  /**
   * selectedTickerItem 변경 시 해당 거래소 스토어 업데이트
   *
   * 전략:
   * - 한국 거래소: 전체 재구독 (덮어쓰기 방식)
   * - 해외 거래소: 이전 symbol unsubscribe 후 새 symbol subscribe
   * - 거래소가 변경되면 이전 거래소는 연결 해제
   *
   * @param selectedTickerItem - 선택된 티커 아이템
   * @param interval - 캔들 인터벌 (기본값: '1m')
   */
  updateSelectedTickerItem(selectedTickerItem: any, interval: string = "1m") {
    if (!selectedTickerItem) return;

    const { korean_ex, foreign_ex, symbol } = selectedTickerItem;

    // console.log("[MultiWebSocketCoordinator] Updating selectedTickerItem:", {
    //   korean_ex,
    //   foreign_ex,
    //   symbol,
    //   prev: this.SelectedTickerItem,
    // });

    // 1. 이전 상태를 임시 저장
    const prevSelectedTickerItem = { ...this.SelectedTickerItem };
    const prevInterval = this.currentInterval;

    // 2. 현재 상태로 업데이트
    this.SelectedTickerItem = {
      korean_ex: korean_ex || null,
      foreign_ex: foreign_ex || null,
      symbol: symbol || null,
    };
    this.currentInterval = interval;

    // 3. 거래소별 처리
    const exchangesToProcess = new Set<string>();

    // 이전/현재 한국 거래소
    if (prevSelectedTickerItem.korean_ex)
      exchangesToProcess.add(prevSelectedTickerItem.korean_ex);
    if (korean_ex) exchangesToProcess.add(korean_ex);

    // 이전/현재 해외 거래소
    if (prevSelectedTickerItem.foreign_ex)
      exchangesToProcess.add(prevSelectedTickerItem.foreign_ex);
    if (foreign_ex) exchangesToProcess.add(foreign_ex);

    exchangesToProcess.forEach((exchange) => {
      const store = this.getStore(exchange);
      const isKorean = exchange === korean_ex;
      const isForeign = exchange === foreign_ex;
      const wasPrevKorean = exchange === prevSelectedTickerItem.korean_ex;
      const wasPrevForeign = exchange === prevSelectedTickerItem.foreign_ex;

      // exchangeSymbols 업데이트
      if (!this.exchangeSymbols.has(exchange)) {
        this.exchangeSymbols.set(exchange, new Set());
      }

      if (exchange == korean_ex || exchange == foreign_ex) {
        this.exchangeSymbols.get(exchange)!.add(symbol);
      }

      // 이전 symbol은 포지션에 없으면 제거
      if (prevSelectedTickerItem.symbol) {
        const isPrevSymbolInPositions = this.currentPositions.some(
          (pos) =>
            pos.coin_symbol === prevSelectedTickerItem.symbol &&
            (pos.kr_exchange?.toLowerCase() === exchange ||
              pos.fr_exchange?.toLowerCase() === exchange)
        );
        if (!isPrevSymbolInPositions) {
          this.exchangeSymbols
            .get(exchange)!
            .delete(prevSelectedTickerItem.symbol);
        }
      }

      // 스토어가 없는 경우
      if (!store) {
        // 현재 selectedTickerItem에 포함된 거래소라면 새로 생성
        if (isKorean || isForeign) {
          // console.log(`[Coordinator] Creating new store for ${exchange}`);
          const newStore = createWebSocketStore({
            exchange,
            onReconnect: (ex) => this.initializeSubscription(ex, null),
          });
          this.stores.set(exchange, newStore);

          // WebSocket 연결 (onopen에서 initializeSubscription 호출됨)
          newStore.getState().connectWebSocket();
        }
        return;
      }

      const state = store.getState();

      // 거래소 변경된 경우
      if (!isKorean && !isForeign) {
        // 이 거래소에 포지션이 있는지 확인 (kr_exchange 또는 fr_exchange가 일치하는 포지션)
        const hasPositions = this.currentPositions.some(
          (pos) =>
            (pos.kr_exchange?.toLowerCase() === exchange ||
              pos.fr_exchange?.toLowerCase() === exchange) &&
            pos.coin_symbol
        );

        if (!hasPositions) {
          console.log(
            `[Coordinator] Disconnecting ${exchange} (no longer used)`
          );
          // WebSocket 연결 완전 종료 (재연결 방지)
          state.disconnectWebSocket();
          // 약간의 지연 후 store 삭제 (비동기 정리 완료 대기)
          setTimeout(() => {
            this.stores.delete(exchange);
            this.exchangeSymbols.delete(exchange);
          }, 100);
        } else {
          // 포지션은 있으므로 selectedTickerItem만 제거하고 재구독
          console.log(
            `[Coordinator] Removing selectedTickerItem from ${exchange}`
          );

          const uppercaseExchange =
            exchange.toUpperCase() as UppercaseExchangeType;

          if (
            uppercaseExchange === UppercaseExchangeType.UPBIT ||
            uppercaseExchange === UppercaseExchangeType.BITHUMB
          ) {
            // 한국 거래소: 포지션만으로 재구독 (prevSelectedTickerItem 전달)
            this.initializeSubscription(exchange, prevSelectedTickerItem);
          } else {
            // 해외 거래소: 이전 symbol의 kline/ticker/orderbook unsubscribe
            if (
              wasPrevForeign &&
              prevSelectedTickerItem.symbol &&
              state.socket
            ) {
              const adapter = WebSocketAdapterFactory.getAdapter(
                uppercaseExchange as any
              );
              if (adapter && "getUnsubscribeChannelsMessage" in adapter) {
                const unsubMsg = (adapter as any).getUnsubscribeChannelsMessage(
                  prevSelectedTickerItem.symbol,
                  ["kline", "ticker", "orderbook"],
                  prevInterval
                );
                // console.log(`[Coordinator] Unsubscribe ${exchange}:`, unsubMsg);
                state.socket.send(JSON.stringify(unsubMsg));
              }
            }
          }
        }
        return;
      }

      // 연결되지 않은 경우 재연결
      if (!state.isConnected) {
        // console.log(`[Coordinator] Reconnecting ${exchange}`);
        state.connectWebSocket();
        return;
      }

      // 한국 거래소: 전체 재구독 (initializeSubscription 호출, prevSelectedTickerItem 전달)
      if (isKorean) {
        // console.log(`[Coordinator] Resubscribing Korean exchange: ${exchange}`);
        this.initializeSubscription(exchange, prevSelectedTickerItem);
        return;
      }

      // 해외 거래소: unsubscribe 이전 + subscribe 현재
      if (isForeign && state.socket) {
        const uppercaseExchange =
          exchange.toUpperCase() as UppercaseExchangeType;
        const adapter = WebSocketAdapterFactory.getAdapter(
          uppercaseExchange as any
        );

        const hasPositions = this.currentPositions.some(
          (pos) =>
            pos.fr_exchange?.toLowerCase() === exchange &&
            pos.coin_symbol === symbol
        );

        if (
          adapter &&
          "getUnsubscribeChannelsMessage" in adapter &&
          "getSubscribeChannelsMessage" in adapter
        ) {
          // 이전 symbol unsubscribe
          if (
            wasPrevForeign &&
            prevSelectedTickerItem.symbol &&
            prevSelectedTickerItem.symbol !== symbol
          ) {
            const unsubChannels = hasPositions
              ? ["kline", "ticker"]
              : ["kline", "ticker", "orderbook"];
            const unsubMsg = (adapter as any).getUnsubscribeChannelsMessage(
              prevSelectedTickerItem.symbol,
              unsubChannels,
              prevInterval
            );
            // console.log(`[Coordinator] Unsubscribe ${exchange}:`, unsubMsg);
            state.socket.send(JSON.stringify(unsubMsg));
          }

          // 현재 symbol subscribe
          if (symbol && symbol !== prevSelectedTickerItem.symbol) {
            const subMsg = (adapter as any).getSubscribeChannelsMessage(
              symbol,
              ["kline", "ticker", "orderbook"],
              interval
            );
            // console.log(`[Coordinator] Subscribe ${exchange}:`, subMsg);
            state.socket.send(JSON.stringify(subMsg));
          }
        }
      }
    });

    // console.log("[MultiWebSocketCoordinator] Update complete");
  }

  /**
   * 포지션이 추가/제거될 때 동적으로 구독 업데이트
   * @param rawActivePositions - 업데이트된 활성 포지션 배열
   */
  updatePositions(rawActivePositions: Position[]) {
    // console.log(
    //   "[MultiWebSocketCoordinator] Updating positions:",
    //   rawActivePositions.length
    // );

    // 현재 포지션 배열 업데이트 (원본 데이터 저장)
    this.currentPositions = rawActivePositions;
  }

  /**
   * 모든 스토어의 WebSocket 연결 해제 및 정리
   */
  cleanup() {
    // console.log("[MultiWebSocketCoordinator] Cleaning up all stores");

    this.stores.forEach((store, exchange) => {
      // console.log(`[MultiWebSocketCoordinator] Disconnecting ${exchange}`);
      store.getState().disconnectWebSocket();
    });

    this.stores.clear();
    this.exchangeSymbols.clear();
  }
}

// Singleton 인스턴스 생성
export const multiWebSocketCoordinator = new MultiWebSocketCoordinator();
