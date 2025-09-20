import type { Request, Response } from "express";
import { LoaderFunctionArgs } from "react-router";
import { createExchangeAdapter } from "~/exchanges";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const krExchange = url.searchParams.get("krExchange");
    const frExchange = url.searchParams.get("frExchange");
    const coinSymbol = url.searchParams.get("coinSymbol");

    if (!krExchange || !frExchange || !coinSymbol) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
        }
      );
    }
    // 어댑터 인스턴스 생성
    const krAdapterInstance = createExchangeAdapter(krExchange as any);
    const frAdapterInstance = createExchangeAdapter(frExchange as any);
    // 가격 동시 조회
    const [krTicker, frTicker] = await Promise.all([
      krAdapterInstance.getTicker(coinSymbol as string),
      frAdapterInstance.getTicker(coinSymbol as string),
    ]);
    return new Response(
      JSON.stringify({
        coinSymbol,
        krPrice: krTicker.price,
        frPrice: frTicker.price,
        krTimestamp: krTicker.timestamp,
        frTimestamp: frTicker.timestamp,
      }),
      { status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      {
        status: 500,
      }
    );
  }
}
