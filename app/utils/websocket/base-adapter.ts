export interface WebSocketAdapter {
  connect(pair: string): void;
  disconnect(): void;
  onMessage(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
  onClose(callback: () => void): void;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export abstract class BaseWebSocketAdapter implements WebSocketAdapter {
  protected ws: WebSocket | null = null;
  protected url: string;
  protected reconnectInterval: number;
  protected maxReconnectAttempts: number;
  protected reconnectAttempts: number = 0;
  protected messageCallback?: (data: any) => void;
  protected errorCallback?: (error: Error) => void;
  protected closeCallback?: () => void;
  protected currentPair?: string;

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.reconnectInterval = config.reconnectInterval || 5000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 5;
  }

  abstract connect(pair: string): void;
  abstract disconnect(): void;
  protected abstract formatPairForExchange(pair: string): string;
  protected abstract parseMessage(data: any): any;

  onMessage(callback: (data: any) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }

  protected handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const parsedData = this.parseMessage(data);
      if (parsedData && this.messageCallback) {
        this.messageCallback(parsedData);
      }
    } catch (error) {
      console.error("WebSocket message parsing error:", error);
      if (this.errorCallback) {
        this.errorCallback(error as Error);
      }
    }
  };

  protected handleError = (error: Event) => {
    console.error("WebSocket error:", error);
    if (this.errorCallback) {
      this.errorCallback(new Error("WebSocket connection error"));
    }
  };

  protected handleClose = () => {
    console.log("WebSocket connection closed");
    this.ws = null;
    if (this.closeCallback) {
      this.closeCallback();
    }
    this.attemptReconnect();
  };

  protected attemptReconnect = () => {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.currentPair
    ) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );
      setTimeout(() => {
        this.connect(this.currentPair!);
      }, this.reconnectInterval);
    }
  };
}
