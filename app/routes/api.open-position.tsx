import type { ActionFunctionArgs } from "react-router";
import { insertOpenPosition } from "~/database/position";
import { getUserActiveStrategy } from "~/database/strategy";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { getUserExchangeCredentials } from "~/database/exchange";
import {
  canUserEnterPosition,
  updateUserStatsAfterPosition,
} from "~/database/user";
import { createExchangeAdapter } from "~/exchanges";
import { ExchangeTypeConverter, UppercaseExchangeType } from "~/types/exchange";
import {
  CRYPTO_DECIMALS,
  preciseAdd,
  preciseMultiply,
  roundVolumeToLotSize,
  safeNumeric,
} from "~/utils/decimal";
import { getCache } from "../core/redisCache";
import axios from "axios";

export async function action({ request }: ActionFunctionArgs) {
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

    // ⭐ 일일 포지션 진입 제한 확인 (Free 플랜)
    const entryCheck = await canUserEnterPosition(user.id);
    if (!entryCheck.canEnter) {
      return Response.json(
        {
          success: false,
          message: entryCheck.reason || "일일 진입 횟수를 초과했습니다.",
          remainingEntries: entryCheck.remainingEntries,
        },
        { status: 403 }
      );
    }

    const {
      coinSymbol,
      krExchange,
      frExchange,
      amount, // 시드 금액 (KRW)
      leverage,
    }: {
      coinSymbol: string;
      krExchange: UppercaseExchangeType;
      frExchange: UppercaseExchangeType;
      amount: number;
      leverage: number;
    } = await request.json();

    if (!coinSymbol || typeof coinSymbol !== "string") {
      return Response.json(
        { success: false, message: "코인 심볼이 필요합니다." },
        { status: 400 }
      );
    }
    if (!krExchange || !frExchange) {
      return Response.json(
        { success: false, message: "거래소 정보가 필요합니다." },
        { status: 400 }
      );
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return Response.json(
        { success: false, message: "시드 금액이 필요합니다." },
        { status: 400 }
      );
    }

    // 1. 거래소 인증 정보 조회
    const krCredentials = await getUserExchangeCredentials(
      user.id,
      ExchangeTypeConverter.fromUppercaseToKorean(krExchange)
    );
    if (!krCredentials) {
      return Response.json(
        {
          success: false,
          message: `한국 거래소(${krExchange}) 인증 정보를 찾을 수 없습니다. 거래소 연결 페이지로 이동합니다.`,
          redirectTo: "/exchanges",
        },
        { status: 400 }
      );
    }
    const frCredentials = await getUserExchangeCredentials(
      user.id,
      ExchangeTypeConverter.fromUppercaseToKorean(frExchange)
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

    // 2. 거래소 어댑터 생성
    const krAdapter = createExchangeAdapter(krExchange as any, krCredentials);
    const frAdapter = createExchangeAdapter(frExchange as any, frCredentials);

    // 3. 한국거래소 주문 먼저 실행
    const krBuyOrderId = await krAdapter.placeOrder({
      symbol: coinSymbol,
      type: "price",
      side: "buy",
      amount: String(amount), // KRW 기준
    });

    // for mock test
    // const krBuyOrderId = "C1139000000000564138";

    console.log("한국 거래소 매수 주문 ID:", krBuyOrderId);

    // 3.5. 주문 결과 조회 및 수량 추출
    await new Promise((resolve) => setTimeout(resolve, 500));
    const krBuyOrderResult = await krAdapter.getOrder(krBuyOrderId, coinSymbol);
    console.log("한국 거래소 매수 주문 결과:", krBuyOrderResult);
    if (!krBuyOrderResult || !krBuyOrderResult.amount) {
      throw new Error("한국 거래소 주문 정보를 조회할 수 없습니다.");
    }
    const krOrderVolume = Number(krBuyOrderResult.amount);

    // 4. 해외거래소 주문 최소 단위(lot size) 조회
    const lotSize = await (frAdapter.getLotSize
      ? frAdapter.getLotSize(coinSymbol)
      : null);
    if (lotSize == null) {
      throw new Error("해외거래소 주문 최소 가능 단위 조회 실패");
    }

    // 5. 주문수량 반올림
    const roundedVolume = roundVolumeToLotSize(krOrderVolume, lotSize);
    if (roundedVolume <= 0) {
      throw new Error(
        `해외거래소 주문 가능한 최소 수량 미만: ${krOrderVolume} -> ${roundedVolume}`
      );
    }

    // 6. 해외거래소 레버리지 설정
    if (frAdapter.setLeverage) {
      const frLeverageRes = await frAdapter.setLeverage(
        coinSymbol,
        String(leverage)
      );
      if (
        frLeverageRes?.retMsg !== "OK" &&
        frLeverageRes?.retMsg !== "leverage not modified"
      ) {
        throw new Error(
          `해외거래소 레버리지 설정 실패: ${JSON.stringify(frLeverageRes)}`
        );
      }
    }

    // 7. 해외거래소 주문 실행
    const frSellOrderId = await frAdapter.placeOrder({
      symbol: coinSymbol,
      type: "market",
      side: "sell",
      amount: String(roundedVolume),
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const frSellOrderResult = await frAdapter.getOrder(
      frSellOrderId,
      coinSymbol
    );
    if (!frSellOrderResult) {
      throw new Error("해외 거래소 주문 정보를 조회할 수 없습니다.");
    }
    console.log("해외 거래소 매도 주문 결과:", frSellOrderResult);

    // 결과 정리
    const krBuyOrder = krBuyOrderResult;
    const frSellOrder = frSellOrderResult;

    // 5. DB에 OPEN 포지션 기록
    // 전략 정보 조회
    const activeStrategy = await getUserActiveStrategy(user.id);
    if (!activeStrategy) {
      return Response.json(
        {
          success: false,
          message: "활성 전략을 찾을 수 없습니다.",
        },
        { status: 400 }
      );
    }

    // Upbit USDT-KRW 시세 조회 (서버 내부에서 직접)

    let usdtPrice: number | undefined = undefined;
    try {
      // Redis 캐시 우선 조회
      const cached = await getCache<{ data: any; timestamp: number }>(
        "upbit:KRW-USDT"
      );
      if (cached && Date.now() - cached.timestamp < 10000) {
        usdtPrice = Number(cached.data[0]?.trade_price) || undefined;
      } else {
        // 캐시 없으면 직접 Upbit API 호출
        const upbitUrl = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";
        const response = await axios.get(upbitUrl);
        usdtPrice = Number(response.data[0]?.trade_price) || undefined;
      }
    } catch (err) {
      console.error("Upbit USDT-KRW 시세 조회 실패:", err);
      usdtPrice = undefined;
    }

    const krBuyAmount = safeNumeric(krBuyOrder.filled, 0);
    const frSellAmountInKrw = preciseMultiply(
      safeNumeric(frSellOrder.filled, 0),
      usdtPrice ?? 0,
      CRYPTO_DECIMALS.FUNDS
    );
    const totalClosed = preciseAdd(
      krBuyAmount,
      frSellAmountInKrw,
      CRYPTO_DECIMALS.FUNDS
    );

    await insertOpenPosition({
      userId: user.id,
      strategyId: activeStrategy.id,
      coinSymbol,
      leverage: leverage,
      krExchange,
      krOrderId: krBuyOrder.id,
      krPrice: krBuyOrder.price,
      krVolume: krBuyOrder.amount,
      krFunds: krBuyOrder.filled,
      krFee: krBuyOrder.fee || 0,
      frExchange,
      frOrderId: frSellOrder.id,
      frPrice: frSellOrder.price,
      frOriginalPrice: frSellOrder.original_price, // 주문 시점 가격
      frVolume: frSellOrder.amount,
      frFunds: frSellOrder.filled,
      frFee: frSellOrder.fee || 0,
      entryRate:
        Math.round((krBuyOrder.filled / frSellOrder.filled) * 100) / 100,
      usdtPrice,
      entryTime: new Date(),
      frSlippage: frSellOrder.slippage,
    });

    await updateUserStatsAfterPosition(user.id, totalClosed);

    // 6. 결과 반환
    return Response.json({
      success: true,
      message: "포지션 진입 성공",
      krBuyOrder,
      frSellOrder,
    });
  } catch (error) {
    console.error("포지션 진입 오류:", error);
    return Response.json(
      {
        success: false,
        message: "포지션 진입 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
