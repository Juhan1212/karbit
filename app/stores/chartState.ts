import { createStore } from "zustand";
import {
  WebSocketAdapterFactory,
  type WebSocketParams,
} from "../helpers/wsAdapter/base";
import type {
  CandleBarData,
  ExchangeType,
  PositionData,
  TickerData,
  OrderBookData,
} from "../types/marketInfo";
import { UppercaseExchangeType, ExchangeInfoMap } from "../types/exchange";

interface WebSocketState {
  exchange: string;
  symbol: string; // selectedTickerItem용 (단일 심볼)
  symbols: string[]; // positions용 (다중 심볼)
  interval: string;
  listeners: ((
    data: TickerData | CandleBarData | PositionData | OrderBookData
  ) => void)[];
  pendingOperations: { type: string; params: WebSocketParams }[];
  socket: WebSocket | null;
  reconnectTimeout: NodeJS.Timeout | null;
  isConnected: boolean;
  isReconnecting: boolean;
  onReconnect?: (exchange: string) => void; // 재연결 시 콜백

  setExchange: (exchange: string) => void;
  setSymbol: (symbol: string) => void;
  setSymbolWithoutReconnect: (symbol: string) => void;
  setSymbols: (symbols: string[]) => void;
  updateSubscriptions: (symbols: string[]) => void; // 동적 구독 변경
  setInterval: (interval: string) => void;
  addMessageListener: (
    listener: (
      data: TickerData | CandleBarData | PositionData | OrderBookData
    ) => void
  ) => void;
  removeMessageListener: (
    listener: (
      data: TickerData | CandleBarData | PositionData | OrderBookData
    ) => void
  ) => void;
  sendMessage: (type: string, message: WebSocketParams) => void;
  sendMessages: (messages: object | object[]) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  subscribeToTicker: (symbol: string) => void;
  unsubscribeFromTicker: (symbol: string) => void;
  subscribeToCandleBars: (symbol?: string) => void;
  unsubscribeFromCandleBars: (symbol: string, interval: string) => void;
  subscribeToOrderBook: (symbol: string) => void;
  unsubscribeFromOrderBook: (symbol: string) => void;
}

export type { WebSocketState };

const socketMap: Record<string, string> = {
  GATEIO: "wss://fx-ws.gateio.ws/v4/ws/usdt",
  BITGET: "wss://ws.bitget.com/v2/ws/public",
  BINGX: "wss://open-api-cswap-ws.bingx.com/market",
  BINANCE: "wss://ws-fapi.binance.com/ws-fapi/v1",
  BYBIT: "wss://stream.bybit.com/v5/public/linear",
  OKX: "wss://ws.okx.com:8443/ws/v5/public",
  UPBIT: "wss://api.upbit.com/websocket/v1",
  BITHUMB: "wss://ws-api.bithumb.com/websocket/v1",
};

// 스토어 생성 함수
export const createWebSocketStore = (initialState: Partial<WebSocketState>) =>
  createStore<WebSocketState>((set, get) => ({
    exchange: initialState.exchange!,
    symbol: initialState.symbol || "",
    symbols: initialState.symbols || [],
    interval: initialState.interval || "1m",
    listeners: [],
    pendingOperations: [],
    socket: null,
    reconnectTimeout: null,
    isConnected: false,
    isReconnecting: false,
    onReconnect: initialState.onReconnect,

    setExchange: (exchange) => set({ exchange }),
    setSymbol: (symbol) => {
      // 심볼 변경: 상태만 변경 후 ws 재연결
      set({ symbol });
      get().disconnectWebSocket();
      get().connectWebSocket();
    },
    setSymbolWithoutReconnect: (symbol) => {
      // 심볼만 변경 (재연결 없이) - coordinator용
      // symbols 배열로 이미 구독되어 있는 경우 사용
      set({ symbol });
    },
    setSymbols: (symbols) => {
      // symbols 변경: 상태만 변경 (구독은 updateSubscriptions로)
      set({ symbols });
    },
    updateSubscriptions: (symbols) => {
      // 웹소켓 연결 유지하면서 구독만 업데이트
      const { socket, exchange } = get();

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn("[updateSubscriptions] WebSocket not connected");
        // 연결되지 않았으면 symbols만 업데이트하고 나중에 연결 시 구독
        set({ symbols });
        return;
      }

      // symbols 상태 업데이트
      set({ symbols });

      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;
      const exchangeAdapter =
        WebSocketAdapterFactory.getAdapter(uppercaseExchange);

      // 한국 거래소: kline 구독 (orderbook 자동 포함)
      if (
        uppercaseExchange === UppercaseExchangeType.UPBIT ||
        uppercaseExchange === UppercaseExchangeType.BITHUMB
      ) {
        const klineMsg = exchangeAdapter.getRequestMessage("kline", {
          symbol: symbols,
          interval: get().interval,
        });
        socket.send(JSON.stringify(klineMsg));
        // console.log(
        //   `[updateSubscriptions] ${exchange} kline subscribed:`,
        //   symbols
        // );
      }
      // 해외 거래소: orderbook 구독
      else {
        const orderbookMsg = exchangeAdapter.getRequestMessage("orderbook", {
          symbol: symbols,
        });
        socket.send(JSON.stringify(orderbookMsg));
        // console.log(
        //   `[updateSubscriptions] ${exchange} orderbook subscribed:`,
        //   symbols
        // );
      }
    },
    setInterval: (interval) => {
      // 인터벌만 변경 (재연결 없이) - coordinator에서 관리
      set({ interval });
    },

    addMessageListener: (listener) => {
      set((state) => ({
        listeners: [...state.listeners, listener],
      }));
    },

    removeMessageListener: (listener) => {
      set((state) => ({
        listeners: state.listeners.filter((l) => l !== listener),
      }));
    },

    sendMessage: (type: string, params: WebSocketParams) => {
      const { exchange, socket, pendingOperations } = get();
      if (!exchange) return;

      // 소문자 exchange를 대문자로 변환
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;

      if (socket && socket.readyState === WebSocket.OPEN) {
        const exchangeAdapter =
          WebSocketAdapterFactory.getAdapter(uppercaseExchange);
        const transformedMessage = exchangeAdapter.getRequestMessage(
          type,
          params
        );
        socket.send(JSON.stringify(transformedMessage));
      } else {
        // 소켓이 열려 있지 않으면 대기 중인 작업에 추가
        set({ pendingOperations: [...pendingOperations, { type, params }] });
      }
    },

    sendMessages: (messages: object | object[]) => {
      const { socket } = get();
      const MAX_RETRIES = 5;
      let idx = 0;

      while (idx <= MAX_RETRIES) {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          // console.log(
          //   `WebSocket not connected, retrying sendMessages... (${idx + 1}/${MAX_RETRIES})`
          // );
          idx++;
          setTimeout(() => {}, 500);
          continue;
        } else {
          socket.send(JSON.stringify(messages));
          break;
        }
      }
    },

    connectWebSocket: () => {
      const {
        exchange,
        socket,
        reconnectTimeout,
        pendingOperations,
        listeners,
      } = get();
      if (!exchange) return;

      // 이미 연결된 소켓이 있고 OPEN 상태라면 재연결하지 않음
      if (socket && socket.readyState === WebSocket.OPEN) {
        // console.log("WebSocket already connected, skipping reconnection");
        return;
      }

      // 연결 중인 소켓이 있다면 재연결하지 않음
      if (socket && socket.readyState === WebSocket.CONNECTING) {
        // console.log("WebSocket is connecting, skipping reconnection");
        return;
      }

      // 소문자 exchange를 대문자로 변환
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;

      const ws = new WebSocket(socketMap[uppercaseExchange]);
      const exchangeAdapter =
        WebSocketAdapterFactory.getAdapter(uppercaseExchange);

      ws.onopen = () => {
        set({ isConnected: true });

        // 재연결 타이머가 있다면 제거
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          set({ reconnectTimeout: null });
        }

        // 재연결 콜백 호출 (MultiWebSocketCoordinator가 구독 메시지 전송)
        const { onReconnect, exchange } = get();
        if (onReconnect) {
          // console.log(`[chartState] Calling onReconnect for ${exchange}`);
          onReconnect(exchange);
        }

        // 대기 중인 메시지 전송
        pendingOperations.forEach((operation) => {
          get().sendMessage(operation.type, operation.params);
        });
        // 대기 중인 작업 초기화
        set({ pendingOperations: [] });

        const { symbol, symbols, interval } = get();
        const uppercaseExchange =
          exchange.toUpperCase() as UppercaseExchangeType;

        // // symbols 배열이 있으면 다중 심볼 구독
        // if (symbols && symbols.length > 0) {
        //   // 한국 거래소: orderbook 구독 (kline 자동 포함)
        //   if (
        //     uppercaseExchange === UppercaseExchangeType.UPBIT ||
        //     uppercaseExchange === UppercaseExchangeType.BITHUMB
        //   ) {
        //     const requestMessage = exchangeAdapter.getRequestMessage(
        //       "orderbook",
        //       {
        //         symbol: symbols,
        //         selectedSymbol: symbol, // selectedTickerItem의 symbol 전달
        //         interval,
        //       }
        //     );
        //     ws.send(JSON.stringify(requestMessage));
        //     console.log(
        //       `[WebSocket] Subscribed to orderbook for symbols: ${symbols.join(", ")}${symbol ? ` + kline for ${symbol}` : ""}`
        //     );
        //   } else {
        //     // 해외 거래소: orderbook + symbol이 있으면 kline + ticker도 구독
        //     const orderbookMessage = exchangeAdapter.getRequestMessage(
        //       "orderbook",
        //       {
        //         symbol: symbols,
        //         selectedSymbol: symbol, // selectedTickerItem의 symbol 전달
        //         interval,
        //       }
        //     );
        //     ws.send(JSON.stringify(orderbookMessage));
        //     console.log(
        //       `[WebSocket] Subscribed to orderbook for symbols: ${symbols.join(", ")}${symbol ? ` + kline/ticker for ${symbol}` : ""}`
        //     );
        //   }
        // } else if (symbol) {
        //   // 기존 단일 심볼 구독 로직 유지
        //   get().subscribeToCandleBars();
        //   if (
        //     uppercaseExchange !== UppercaseExchangeType.UPBIT &&
        //     uppercaseExchange !== UppercaseExchangeType.BITHUMB
        //   ) {
        //     get().subscribeToOrderBook(symbol);
        //   }
        //   if (ExchangeInfoMap[uppercaseExchange]?.isForeign) {
        //     get().subscribeToTicker(symbol);
        //   }
        // }
      };

      ws.onclose = () => {
        set({ isConnected: false });
        // 재연결 타이머 설정
        if (!get().reconnectTimeout) {
          const timeout = setTimeout(() => {
            set({ socket: null, reconnectTimeout: null });
            get().connectWebSocket();
          }, 2000);
          set({ reconnectTimeout: timeout });
        }
      };

      ws.onerror = (error) => {
        console.error("웹소켓 에러", error);
        ws.close();
      };

      ws.onmessage = async (event) => {
        let jsonStr: string;
        if (typeof event.data === "string") {
          jsonStr = event.data;
        } else if (event.data instanceof Blob) {
          // 브라우저 환경
          jsonStr = await event.data.text();
        } else {
          // fallback
          jsonStr = String(event.data);
        }
        const data = JSON.parse(jsonStr);
        const transformedData = exchangeAdapter.getResponseMessage(data);

        // 디버깅: transformedData가 null인 경우 로그
        if (!transformedData) {
          // console.log(
          //   `[${get().exchange}] transformedData is null, raw data:`,
          //   data
          // );
          return;
        }

        // 클로저 문제 해결: 최신 listeners 배열을 가져와서 호출
        const currentListeners = get().listeners;
        currentListeners.forEach((listener) => listener(transformedData));
      };

      set({ socket: ws });
    },

    disconnectWebSocket: () => {
      const { socket, reconnectTimeout } = get();

      // 재연결 타이머가 있다면 제거
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        set({ reconnectTimeout: null });
      }

      // onReconnect 콜백 제거 (재연결 방지)
      set({ onReconnect: undefined });

      // 소켓이 열려있거나 연결 중인 경우에만 닫기
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        // console.log("disconnectWebSocket called, closing socket");
        socket.close();
      }

      set({ socket: null, isConnected: false, isReconnecting: false });
    },

    subscribeToTicker: (symbol) => {
      if (!symbol) return;
      const { exchange, sendMessage } = get();

      // 해외 거래소인지 확인
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;
      if (!ExchangeInfoMap[uppercaseExchange]?.isForeign) return;

      sendMessage("ticker", {
        symbol,
      });
    },

    // 구독 해제 지원하는 거래소만 가능
    unsubscribeFromTicker: (symbol) => {
      if (!symbol) return;
      const { exchange } = get();

      // 해외 거래소인지 확인
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;
      if (!ExchangeInfoMap[uppercaseExchange]?.isForeign) return;

      return;
      // const { sendMessage } = get();

      // sendMessage({
      //   action: "unsubscribe",
      //   channel: "futures.tickers",
      //   params: { symbol: symbol },
      // });
    },

    subscribeToCandleBars: (symbolParam?: string) => {
      const { symbol: stateSymbol, interval, sendMessage, exchange } = get();
      const symbol = symbolParam || stateSymbol;
      if (!symbol || !interval) return;

      // Bithumb은 candle API가 없으므로 구독하지 않음
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;
      if (uppercaseExchange === UppercaseExchangeType.BITHUMB) {
        console.log(
          `[subscribeToCandleBars] Skipping kline subscription for ${exchange} (not supported)`
        );
        return;
      }

      // console.log(`[subscribeToCandleBars] Subscribing to kline for ${symbol}`);
      sendMessage("kline", {
        symbol,
        interval,
      });
    },

    // 구독 해제 지원하는 거래소만 가능
    unsubscribeFromCandleBars: (symbol, interval) => {
      if (!symbol || !interval) return;
      // const { sendMessage } = get();

      // sendMessage({
      //   action: "unsubscribe",
      //   channel: "futures.candlesticks",
      //   params: { symbol, interval },
      // });
    },

    subscribeToOrderBook: (symbol) => {
      if (!symbol) return;
      const { exchange, sendMessage } = get();

      // upbit, bithumb는 kline 구독 시 이미 orderbook도 함께 구독하므로 별도 구독 불필요
      const uppercaseExchange = exchange.toUpperCase() as UppercaseExchangeType;
      if (
        uppercaseExchange === UppercaseExchangeType.UPBIT ||
        uppercaseExchange === UppercaseExchangeType.BITHUMB
      ) {
        return;
      }

      sendMessage("orderbook", {
        symbol,
      });
    },

    // 구독 해제 지원하는 거래소만 가능
    unsubscribeFromOrderBook: (symbol) => {
      if (!symbol) return;
      // const { sendMessage } = get();

      // sendMessage({
      //   action: "unsubscribe",
      //   channel: "orderbook",
      //   params: { symbol },
      // });
    },
  }));
