import { BaseWebSocketAdapter, WebSocketConfig } from "./base-adapter";

export class UpbitWebSocketAdapter extends BaseWebSocketAdapter {
  constructor() {
    const config: WebSocketConfig = {
      url: "wss://api.upbit.com/websocket/v1",
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    };
    super(config);
  }

  connect(pair: string): void {
    this.currentPair = pair;
    this.reconnectAttempts = 0;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("Upbit WebSocket connected");
        this.subscribeTicker(pair);
        this.subscribeOrderbook(pair);
        this.subscribeTrade(pair);
      };

      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
    } catch (error) {
      console.error("Failed to connect to Upbit WebSocket:", error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.currentPair = undefined;
    this.reconnectAttempts = 0;
  }

  protected formatPairForExchange(pair: string): string {
    // Upbit uses KRW-BTC format
    return `KRW-${pair.replace("USDT", "").replace("KRW", "")}`;
  }

  protected parseMessage(data: any): any {
    if (!data) return null;

    // Upbit ticker data
    if (data.type === "ticker") {
      return {
        type: "ticker",
        symbol: data.code,
        price: data.trade_price,
        change: data.change,
        changeRate: data.signed_change_rate,
        volume: data.acc_trade_volume_24h,
        timestamp: data.trade_timestamp,
        high: data.high_price,
        low: data.low_price,
      };
    }

    // Upbit orderbook data
    if (data.type === "orderbook") {
      return {
        type: "orderbook",
        symbol: data.code,
        bids: data.orderbook_units.map((unit: any) => ({
          price: unit.bid_price,
          size: unit.bid_size,
        })),
        asks: data.orderbook_units.map((unit: any) => ({
          price: unit.ask_price,
          size: unit.ask_size,
        })),
        timestamp: data.timestamp,
      };
    }

    // Upbit trade data
    if (data.type === "trade") {
      return {
        type: "trade",
        symbol: data.code,
        price: data.trade_price,
        size: data.trade_volume,
        side: data.ask_bid === "ASK" ? "sell" : "buy",
        timestamp: data.trade_timestamp,
      };
    }

    return null;
  }

  private subscribeTicker(pair: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const market = this.formatPairForExchange(pair);
    const tickerRequest = [
      { ticket: "ticker" },
      { type: "ticker", codes: [market] },
    ];

    this.ws.send(JSON.stringify(tickerRequest));
  }

  private subscribeOrderbook(pair: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const market = this.formatPairForExchange(pair);
    const orderbookRequest = [
      { ticket: "orderbook" },
      { type: "orderbook", codes: [market] },
    ];

    this.ws.send(JSON.stringify(orderbookRequest));
  }

  private subscribeTrade(pair: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const market = this.formatPairForExchange(pair);
    const tradeRequest = [
      { ticket: "trade" },
      { type: "trade", codes: [market] },
    ];

    this.ws.send(JSON.stringify(tradeRequest));
  }
}
