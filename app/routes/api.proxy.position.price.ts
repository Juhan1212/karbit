import { LoaderFunctionArgs } from "react-router";
import { getUserExchangeCredentials } from "~/database/exchange";
import { validateSession } from "~/database/session";
import { createExchangeAdapter } from "~/exchanges";
import { ExchangeTypeConverter, UppercaseExchangeType } from "~/types/exchange";
import { getAuthTokenFromRequest } from "~/utils/cookies";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return Response.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      );
    }

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

    const frCredentials = await getUserExchangeCredentials(
      user.id,
      ExchangeTypeConverter.fromUppercaseToKorean(
        frExchange as UppercaseExchangeType
      )
    );

    if (!frCredentials) {
      return Response.json(
        {
          success: false,
          message: `해외 거래소(${frExchange}) 인증 정보를 찾을 수 없습니다. 거래소 연결 페이지로 이동합니다.`,
          redirectTo: "/exchanges",
        },
        { status: 400 }
      );
    }
    // 어댑터 인스턴스 생성
    const krAdapterInstance = createExchangeAdapter(krExchange as any);
    const frAdapterInstance = createExchangeAdapter(
      frExchange as any,
      frCredentials
    );

    // 가격 동시 조회
    const [krTicker, frTicker, frPositionInfo] = await Promise.all([
      krAdapterInstance.getTicker(coinSymbol as string),
      frAdapterInstance.getTicker(coinSymbol as string),
      frAdapterInstance.getPositionInfo(coinSymbol as string),
    ]);

    return new Response(
      JSON.stringify({
        coinSymbol,
        krPrice: krTicker.price,
        frPrice: frTicker.price,
        frUnrealizedPnl: frPositionInfo.unrealizedPnl,
        krTimestamp: krTicker.timestamp,
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
