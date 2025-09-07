import type { LoaderFunctionArgs } from "react-router";
import { UpbitAdapter } from "~/exchanges/upbit";
import { BybitAdapter } from "~/exchanges/bybit";
import type { CandleData } from "~/exchanges/upbit";
import {
  createExchangeAdapter,
  KoreanExchangeType,
  LowercaseExchangeType,
  UppercaseExchangeType,
} from "~/exchanges";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const exchangesParam = url.searchParams.get("exchanges");
  const exchanges = exchangesParam
    ? exchangesParam.split(",").map((e) => e.toLowerCase().trim())
    : [];
  const symbol = url.searchParams.get("symbol") || "BTC";
  const interval = url.searchParams.get("interval") || "1m";
  const to = parseInt(url.searchParams.get("to") || "0");

  try {
    // Prepare promises for all requested exchanges
    const promises: Promise<CandleData[]>[] = [];
    const exchangeNames: string[] = [];

    exchanges.forEach((name) => {
      const adapter = createExchangeAdapter(
        name as
          | KoreanExchangeType
          | UppercaseExchangeType
          | LowercaseExchangeType
      );
      if (adapter) {
        promises.push(adapter.getTickerCandles(symbol, interval, to));
        exchangeNames.push(name);
      }
    });

    // Add USDT data promise
    promises.push(UpbitAdapter.getUSDTCandles(interval, to));
    exchangeNames.push("usdt");

    // Execute all API calls in parallel
    const results = await Promise.allSettled(promises);

    // Process results
    const exchangeData: { [key: string]: CandleData[] } = {};
    let usdtCandles: CandleData[] = [];

    results.forEach((result, index) => {
      const exchangeName = exchangeNames[index];

      if (result.status === "fulfilled") {
        if (exchangeName === "usdt") {
          usdtCandles = result.value;
        } else {
          exchangeData[exchangeName] = result.value;
        }
      } else {
        console.error(`Error fetching ${exchangeName} data:`, result.reason);
      }
    });

    // Merge the data from all exchanges
    const mergedData = mergeExchangeData(exchangeData);

    // Separate Korean and foreign exchange data for response
    const koreanExchanges = ["upbit", "bithumb"];
    const koreanData: CandleData[] = [];
    const foreignData: CandleData[] = [];

    Object.keys(exchangeData).forEach((exchange) => {
      if (koreanExchanges.includes(exchange)) {
        koreanData.push(...exchangeData[exchange]);
      } else {
        foreignData.push(...exchangeData[exchange]);
      }
    });

    // Use Python-style data transformation
    const response = toCandleData(
      mergedData,
      koreanData.length > 0 ? koreanData : null,
      foreignData.length > 0 ? foreignData : null,
      usdtCandles
    );

    return Response.json(response);
  } catch (error) {
    console.error("Error in kline API:", error);
    return Response.json(
      { error: "Failed to fetch kline data" },
      { status: 500 }
    );
  }
}

function mergeExchangeData(exchangeData: {
  [key: string]: CandleData[];
}): CandleData[] {
  if (Object.keys(exchangeData).length === 0) return [];

  const koreanExchanges = ["upbit", "bithumb"];
  const foreignExchanges = Object.keys(exchangeData).filter(
    (exchange) => !koreanExchanges.includes(exchange)
  );

  // Separate Korean and foreign exchange data
  const koreanData: CandleData[] = [];
  const foreignData: CandleData[] = [];

  koreanExchanges.forEach((exchange) => {
    if (exchangeData[exchange]) {
      koreanData.push(...exchangeData[exchange]);
    }
  });

  foreignExchanges.forEach((exchange) => {
    if (exchangeData[exchange]) {
      foreignData.push(...exchangeData[exchange]);
    }
  });

  if (koreanData.length === 0 || foreignData.length === 0) {
    // If we don't have both Korean and foreign data, return merged data without kimchi premium calculation
    const allData = Object.values(exchangeData).flat();
    return [];
  }

  // Create maps for easier lookup
  const koreanMap = createTimestampMap(koreanData);
  const foreignMap = createTimestampMap(foreignData);

  // Get all unique timestamps
  const allTimestamps = new Set([...koreanMap.keys(), ...foreignMap.keys()]);

  // Calculate kimchi premium for each timestamp
  const result: CandleData[] = [];

  for (const timestamp of allTimestamps) {
    const koreanCandle = koreanMap.get(timestamp);
    const foreignCandle = foreignMap.get(timestamp);

    if (koreanCandle && foreignCandle) {
      // Calculate kimchi premium: Korean price / Foreign price
      const kimchiPremium = {
        timestamp,
        open: koreanCandle.open / foreignCandle.open,
        high: koreanCandle.high / foreignCandle.high,
        low: koreanCandle.low / foreignCandle.low,
        close: koreanCandle.close / foreignCandle.close,
        volume: koreanCandle.volume + foreignCandle.volume, // Sum volumes
      };
      result.push(kimchiPremium);
    }
  }

  return result.sort((a, b) => a.timestamp - b.timestamp);
}

function createTimestampMap(candleData: CandleData[]): Map<number, CandleData> {
  const map = new Map<number, CandleData>();

  candleData.forEach((candle) => {
    const timestamp = candle.timestamp;

    if (!map.has(timestamp)) {
      map.set(timestamp, candle);
    } else {
      // If multiple candles for the same timestamp, average the prices
      const existing = map.get(timestamp)!;
      map.set(timestamp, {
        timestamp,
        open: (existing.open + candle.open) / 2,
        high: Math.max(existing.high, candle.high),
        low: Math.min(existing.low, candle.low),
        close: (existing.close + candle.close) / 2,
        volume: existing.volume + candle.volume,
      });
    }
  });

  return map;
}

function toCandleData(
  merged: CandleData[],
  koreanData?: CandleData[] | null,
  foreignData?: CandleData[] | null,
  usdtCandle?: CandleData[] | null
) {
  const candleData = merged.map((item) => ({
    time: item.timestamp,
    open: parseFloat(item.open.toString()),
    high: parseFloat(item.high.toString()),
    low: parseFloat(item.low.toString()),
    close: parseFloat(item.close.toString()),
  }));

  const volumeData = merged.map((item) => ({
    time: item.timestamp,
    value: parseFloat(item.volume.toString()),
  }));

  const result: any = {
    candleData,
    volumeData,
  };

  if (koreanData && koreanData.length > 0) {
    const koreanSorted = koreanData.sort(
      (a: CandleData, b: CandleData) => a.timestamp - b.timestamp
    );
    result.ex1VolumeData = koreanSorted.map((item: CandleData) => ({
      time: item.timestamp,
      value: parseFloat(item.volume.toString()),
    }));
  }

  if (foreignData && foreignData.length > 0) {
    const foreignSorted = foreignData.sort(
      (a: CandleData, b: CandleData) => a.timestamp - b.timestamp
    );
    result.ex2VolumeData = foreignSorted.map((item: CandleData) => ({
      time: item.timestamp,
      value: parseFloat(item.volume.toString()),
    }));
  }

  if (usdtCandle && usdtCandle.length > 0) {
    const usdtSorted = usdtCandle.sort((a, b) => a.timestamp - b.timestamp);
    result.usdtCandleData = usdtSorted.map((item) => ({
      time: item.timestamp,
      value: parseFloat(item.close.toString()),
    }));
  }

  return result;
}
