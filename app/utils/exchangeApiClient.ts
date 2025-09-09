/**
 * 클라이언트에서 거래소 공개 API를 직접 호출하는 유틸리티
 */

export interface TickerData {
  symbol: string;
  price: number;
  timestamp: number;
}

/**
 * 업비트 티커 가격 조회
 */
export async function fetchUpbitTicker(symbol: string): Promise<TickerData> {
  try {
    const response = await fetch(
      `https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        symbol,
        price: data[0].trade_price,
        timestamp: Date.now(),
      };
    }

    throw new Error(`No ticker data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching Upbit ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 빗썸 티커 가격 조회
 */
export async function fetchBithumbTicker(symbol: string): Promise<TickerData> {
  try {
    const response = await fetch(
      `https://api.bithumb.com/v1/ticker?markets=KRW-${symbol}`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        symbol,
        price: data[0].trade_price,
        timestamp: Date.now(),
      };
    }

    throw new Error(`No ticker data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching Bithumb ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 바이비트 티커 가격 조회 (USDT 기준)
 */
export async function fetchBybitTicker(symbol: string): Promise<TickerData> {
  try {
    const response = await fetch(
      `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}USDT`
    );
    const data = await response.json();

    if (
      data &&
      data.result &&
      data.result.list &&
      data.result.list.length > 0
    ) {
      return {
        symbol,
        price: parseFloat(data.result.list[0].lastPrice),
        timestamp: Date.now(),
      };
    }

    throw new Error(`No ticker data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching Bybit ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 바이낸스 티커 가격 조회 (USDT 기준)
 */
export async function fetchBinanceTicker(symbol: string): Promise<TickerData> {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
    );
    const data = await response.json();

    if (data && data.price) {
      return {
        symbol,
        price: parseFloat(data.price),
        timestamp: Date.now(),
      };
    }

    throw new Error(`No ticker data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching Binance ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * OKX 티커 가격 조회 (USDT 기준)
 */
export async function fetchOkxTicker(symbol: string): Promise<TickerData> {
  try {
    const response = await fetch(
      `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`
    );
    const data = await response.json();

    if (data && data.data && data.data.length > 0) {
      return {
        symbol,
        price: parseFloat(data.data[0].last),
        timestamp: Date.now(),
      };
    }

    throw new Error(`No ticker data found for ${symbol}`);
  } catch (error) {
    console.error(`Error fetching OKX ticker for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 거래소별 티커 가격 조회 통합 함수
 */
export async function fetchExchangeTicker(
  exchange: string,
  symbol: string
): Promise<TickerData> {
  switch (exchange.toLowerCase()) {
    case "upbit":
      return await fetchUpbitTicker(symbol);
    case "bithumb":
      return await fetchBithumbTicker(symbol);
    case "bybit":
      return await fetchBybitTicker(symbol);
    case "binance":
      return await fetchBinanceTicker(symbol);
    case "okx":
      return await fetchOkxTicker(symbol);
    default:
      throw new Error(`Unsupported exchange: ${exchange}`);
  }
}
