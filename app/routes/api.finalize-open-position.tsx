import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { getCache } from "../core/redisCache";
import axios from "axios";
import { insertOpenPosition } from "~/database/position";
import { getUserExchangeCredentials } from "~/database/exchange";
import { updateUserStatsAfterPosition } from "~/database/user";
import { getUserActiveStrategy } from "~/database/strategy";
import { createExchangeAdapter } from "~/exchanges";
import { ExchangeTypeConverter, UppercaseExchangeType } from "~/types/exchange";
import {
  preciseAdd,
  preciseMultiply,
  safeNumeric,
  CRYPTO_DECIMALS,
} from "~/utils/decimal";

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

    if (request.method !== "POST") {
      return Response.json(
        { success: false, message: "잘못된 요청 방식입니다." },
        { status: 405 }
      );
    }

    const {
      coinSymbol,
      krExchange,
      frExchange,
      krOrderId,
      frOrderId,
      userId,
      leverage,
      amount,
    }: {
      coinSymbol: string;
      krExchange: UppercaseExchangeType;
      frExchange: UppercaseExchangeType;
      krOrderId: string;
      frOrderId: string;
      userId: number;
      leverage: number;
      amount: number;
    } = await request.json();

    // 검증
    if (
      !coinSymbol ||
      !krOrderId ||
      !frOrderId ||
      !userId ||
      !leverage ||
      !amount
    ) {
      return Response.json(
        {
          success: false,
          message: "필수 정보가 누락되었습니다.",
        },
        { status: 400 }
      );
    }

    // 사용자 확인
    if (user.id !== userId) {
      return Response.json(
        {
          success: false,
          message: "권한이 없습니다.",
        },
        { status: 403 }
      );
    }

    try {
      // 거래소 인증 정보 조회
      const krCredentials = await getUserExchangeCredentials(
        user.id,
        ExchangeTypeConverter.fromUppercaseToKorean(krExchange)
      );
      if (!krCredentials) {
        return Response.json(
          {
            success: false,
            message: `한국 거래소(${krExchange}) 인증 정보를 찾을 수 없습니다.`,
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
            message: `해외 거래소(${frExchange}) 인증 정보를 찾을 수 없습니다.`,
          },
          { status: 400 }
        );
      }

      const krAdapter = createExchangeAdapter(krExchange as any, krCredentials);
      const frAdapter = createExchangeAdapter(frExchange as any, frCredentials);

      // 재시도 로직으로 주문 정보 조회
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1000; // 1초 대기

      let krBuyOrder;
      let frSellOrder;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(
          `[FinalizeOpen] 주문 정보 조회 시도 ${attempt}/${MAX_RETRIES} (${RETRY_DELAY_MS}ms 대기 후)`
        );

        // 대기
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

        // 동시에 주문 상세 정보 조회
        const [krBuyOrderResult, frSellOrderResult] = await Promise.allSettled([
          krAdapter.getOrder(krOrderId, coinSymbol),
          frAdapter.getOrder(frOrderId, coinSymbol),
        ]);

        // 한국 거래소 매수 주문 결과 처리
        if (krBuyOrderResult.status === "fulfilled") {
          krBuyOrder = krBuyOrderResult.value;
        } else {
          console.warn(
            `[FinalizeOpen] 한국 거래소 주문 조회 실패 (시도 ${attempt}):`,
            krBuyOrderResult.reason
          );
          if (attempt === MAX_RETRIES) {
            throw new Error("한국 거래소 주문 정보를 조회할 수 없습니다.");
          }
          continue;
        }

        // 해외 거래소 매도 주문 조회
        if (frSellOrderResult.status === "fulfilled") {
          frSellOrder = frSellOrderResult.value;
        } else {
          console.warn(
            `[FinalizeOpen] 해외 거래소 주문 조회 실패 (시도 ${attempt}):`,
            frSellOrderResult.reason
          );
          if (attempt === MAX_RETRIES) {
            throw new Error("해외 거래소 주문 정보를 조회할 수 없습니다.");
          }
          continue;
        }

        // 주문 정보가 유효한지 확인
        const isValidOrderData =
          krBuyOrder.amount > 0 &&
          krBuyOrder.filled > 0 &&
          frSellOrder.amount > 0 &&
          frSellOrder.filled > 0;

        if (isValidOrderData) {
          console.log(
            `[FinalizeOpen] ✅ 주문 정보 조회 성공 (시도 ${attempt}/${MAX_RETRIES})`
          );
          console.log("[FinalizeOpen] 한국 거래소 매수 주문 결과:", krBuyOrder);
          console.log(
            "[FinalizeOpen] 해외 거래소 매도 주문 결과:",
            frSellOrder
          );
          break; // 성공 시 루프 탈출
        }

        if (attempt < MAX_RETRIES) {
          console.warn(
            `[FinalizeOpen] ⚠️ 주문 정보가 아직 완전하지 않음 (시도 ${attempt}/${MAX_RETRIES}). 재시도합니다...`
          );
        } else {
          console.error(
            `[FinalizeOpen] ❌ 최대 재시도 횟수(${MAX_RETRIES})를 초과했습니다. 마지막 조회 결과를 사용합니다.`
          );
        }
      }

      // 재시도 후에도 데이터를 가져오지 못한 경우 에러 처리
      if (!krBuyOrder || !frSellOrder) {
        throw new Error("최대 재시도 후에도 주문 정보를 조회할 수 없습니다.");
      }

      // USDT 가격 조회
      let usdtPrice: number | undefined = undefined;
      try {
        const cached = await getCache<{ data: any; timestamp: number }>(
          "upbit:KRW-USDT"
        );
        if (cached && Date.now() - cached.timestamp < 10000) {
          usdtPrice = Number(cached.data[0]?.trade_price) || undefined;
        } else {
          const upbitUrl = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";
          const response = await axios.get(upbitUrl);
          usdtPrice = Number(response.data[0]?.trade_price) || undefined;
        }
      } catch (err) {
        console.error("[FinalizeOpen] Upbit USDT-KRW 시세 조회 실패:", err);
        usdtPrice = undefined;
      }

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

      // 총 투자금액 계산
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

      // DB에 OPEN 포지션 기록
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
        frOriginalPrice: frSellOrder.original_price,
        frVolume: frSellOrder.amount,
        frFunds: frSellOrder.filled,
        frFee: frSellOrder.fee || 0,
        entryRate:
          Math.round((krBuyOrder.filled / frSellOrder.filled) * 100) / 100,
        usdtPrice,
        entryTime: new Date(),
        frSlippage: frSellOrder.slippage,
      });

      // 사용자 통계 업데이트
      await updateUserStatsAfterPosition(user.id, totalClosed);

      console.log(
        `[FinalizeOpen] ✅ ${coinSymbol} 포지션 진입 결과 DB 저장 완료 - 투자금액: ${totalClosed.toFixed(2)}원`
      );

      return Response.json({
        success: true,
        message: `${coinSymbol} 포지션 진입 결과가 성공적으로 기록되었습니다.`,
        data: {
          krBuyOrder,
          frSellOrder,
          entryRate:
            Math.round((krBuyOrder.filled / frSellOrder.filled) * 100) / 100,
          totalInvested: totalClosed,
        },
      });
    } catch (finalizeError) {
      console.error(
        "[FinalizeOpen] 포지션 진입 결과 기록 오류:",
        finalizeError
      );

      return Response.json(
        {
          success: false,
          message: "포지션 진입 결과 기록 중 오류가 발생했습니다.",
          error:
            finalizeError instanceof Error
              ? finalizeError.message
              : String(finalizeError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[FinalizeOpen] 포지션 진입 마무리 오류:", error);

    return Response.json(
      {
        success: false,
        message: "포지션 진입 마무리 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
