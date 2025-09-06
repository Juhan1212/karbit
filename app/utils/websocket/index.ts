import { WebSocketAdapter } from "./base-adapter";
import { UpbitWebSocketAdapter } from "./upbit-adapter";
import { BinanceWebSocketAdapter } from "./binance-adapter";
import { WebSocketExchangeType } from "../../types/exchange";

export { WebSocketExchangeType } from "../../types/exchange";

export class WebSocketAdapterFactory {
  private static adapters: Map<WebSocketExchangeType, WebSocketAdapter> =
    new Map();

  static getAdapter(exchange: WebSocketExchangeType): WebSocketAdapter {
    if (!this.adapters.has(exchange)) {
      const adapter = this.createAdapter(exchange);
      this.adapters.set(exchange, adapter);
    }
    return this.adapters.get(exchange)!;
  }

  private static createAdapter(
    exchange: WebSocketExchangeType
  ): WebSocketAdapter {
    switch (exchange) {
      case "upbit":
        return new UpbitWebSocketAdapter();
      case "binance":
        return new BinanceWebSocketAdapter();
      case "bybit":
        // TODO: Implement BybitWebSocketAdapter
        throw new Error("Bybit adapter not implemented yet");
      case "okx":
        // TODO: Implement OkxWebSocketAdapter
        throw new Error("OKX adapter not implemented yet");
      case "bithumb":
        // TODO: Implement BithumbWebSocketAdapter
        throw new Error("Bithumb adapter not implemented yet");
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  }

  static disconnectAll(): void {
    this.adapters.forEach((adapter) => {
      adapter.disconnect();
    });
    this.adapters.clear();
  }

  static disconnectAdapter(exchange: WebSocketExchangeType): void {
    const adapter = this.adapters.get(exchange);
    if (adapter) {
      adapter.disconnect();
      this.adapters.delete(exchange);
    }
  }
}

export { WebSocketAdapter } from "./base-adapter";
