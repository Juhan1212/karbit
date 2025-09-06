import { BaseWebSocketAdapter, WebSocketConfig } from "./base-adapter";

export class BinanceWebSocketAdapter extends BaseWebSocketAdapter {
  constructor() {
    const config: WebSocketConfig = {
      url: "wss://stream.binance.com:9443/ws",
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    };
    super(config);
  }

  connect(pair: string): void {
    this.currentPair = pair;
    this.reconnectAttempts = 0;

    try {
      const formattedPair = this.formatPairForExchange(pair);
      const wsUrl = `${this.url}/${formattedPair.toLowerCase()}@ticker/${formattedPair.toLowerCase()}@depth/${formattedPair.toLowerCase()}@trade`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("Binance WebSocket connected");
      };

      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
    } catch (error) {
      console.error("Failed to connect to Binance WebSocket:", error);
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
    // Binance uses BTCUSDT format
    return pair.replace("/", "").replace("-", "");
  }

  protected parseMessage(data: any): any {
    if (!data) return null;

    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    // Binance 24hr ticker data
    if (parsedData.e === "24hrTicker") {
      return {
        type: "ticker",
        symbol: parsedData.s,
        price: parseFloat(parsedData.c),
        change: parsedData.P.startsWith("-")
          ? "FALL"
          : parsedData.P === "0.00000000"
            ? "EVEN"
            : "RISE",
        changeRate: parseFloat(parsedData.P) / 100,
        volume: parseFloat(parsedData.v),
        timestamp: parsedData.E,
        high: parseFloat(parsedData.h),
        low: parseFloat(parsedData.l),
      };
    }

    // Binance depth data (orderbook)
    if (parsedData.e === "depthUpdate") {
      return {
        type: "orderbook",
        symbol: parsedData.s,
        bids: parsedData.b.map((bid: string[]) => ({
          price: parseFloat(bid[0]),
          size: parseFloat(bid[1]),
        })),
        asks: parsedData.a.map((ask: string[]) => ({
          price: parseFloat(ask[0]),
          size: parseFloat(ask[1]),
        })),
        timestamp: parsedData.E,
      };
    }

    // Binance trade data
    if (parsedData.e === "trade") {
      return {
        type: "trade",
        symbol: parsedData.s,
        price: parseFloat(parsedData.p),
        size: parseFloat(parsedData.q),
        side: parsedData.m ? "sell" : "buy", // m: true if buyer is market maker
        timestamp: parsedData.T,
      };
    }

    return null;
  }
}
