import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { getCache } from "../core/redisCache";
import axios from "axios";
import {
  getUserPositionsForSettlement,
  insertClosedPosition,
  getCoinActivePositionDetails,
} from "~/database/position";
import { getUserExchangeCredentials } from "~/database/exchange";
import { updateUserStatsAfterPosition } from "~/database/user";
import { updateStrategyStatsAfterPositionClose } from "~/database/strategy";
import { createExchangeAdapter } from "~/exchanges";
import { ExchangeTypeConverter, UppercaseExchangeType } from "~/types/exchange";
import {
  preciseAdd,
  preciseSubtract,
  preciseMultiply,
  preciseDivide,
  preciseProfitRate,
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
    }: {
      coinSymbol: string;
      krExchange: UppercaseExchangeType;
      frExchange: UppercaseExchangeType;
    } = await request.json();

    if (!coinSymbol || typeof coinSymbol !== "string") {
      return Response.json(
        {
          success: false,
          message: "코인 심볼이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 1. 정산용 활성 포지션 집계 정보 조회
    const positionSettlement = await getUserPositionsForSettlement(
      user.id,
      coinSymbol
    );

    if (!positionSettlement) {
      return Response.json(
        {
          success: false,
          message: `${coinSymbol}에 대한 활성 포지션이 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 1-1. 실제 포지션 정보 조회 (strategyId, leverage 등을 위해)
    const activePositions = await getCoinActivePositionDetails(
      user.id,
      coinSymbol
    );

    if (activePositions.length === 0) {
      return Response.json(
        {
          success: false,
          message: `${coinSymbol}에 대한 활성 포지션 상세 정보를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 첫 번째 포지션의 strategyId와 leverage를 사용 (어차피 같은 심볼이기 때문에 동일할 것)
    const firstPosition = activePositions[0];
    const strategyId = firstPosition.strategyId;
    const leverage = firstPosition.leverage;

    try {
      // 2. 한국 거래소 인증 정보 조회
      const krCredentials = await getUserExchangeCredentials(
        user.id,
        ExchangeTypeConverter.fromUppercaseToKorean(krExchange)
      );
      if (!krCredentials) {
        return Response.json(
          {
            success: false,
            message: `한국 거래소(${krExchange}) 인증 정보를 찾을 수 없습니다. 거래소 연결을 확인해주세요.`,
          },
          { status: 400 }
        );
      }

      // 해외 거래소 인증 정보 조회
      const frCredentials = await getUserExchangeCredentials(
        user.id,
        ExchangeTypeConverter.fromUppercaseToKorean(frExchange)
      );
      if (!frCredentials) {
        return Response.json(
          {
            success: false,
            message: `해외 거래소(${frExchange}) 인증 정보를 찾을 수 없습니다. 거래소 연결을 확인해주세요.`,
          },
          { status: 400 }
        );
      }

      // 3. 한국 거래소와 해외 거래소 주문을 동시에 실행
      console.log(
        `한국 거래소(${krExchange})와 해외 거래소(${frExchange})에서 ${coinSymbol} 포지션 종료 주문을 동시에 실행`
      );

      const krAdapter = createExchangeAdapter(krExchange as any, krCredentials);
      const frAdapter = createExchangeAdapter(frExchange as any, frCredentials);

      // 동시에 주문 실행 (집계된 수량 사용)
      const [krSellOrderId, frBuyOrderId] = await Promise.all([
        // 한국 거래소 매도 주문 (집계된 전체 수량)
        krAdapter.placeOrder({
          symbol: coinSymbol,
          type: "market",
          side: "sell",
          amount: String(positionSettlement.totalKrVolume),
        }),
        // 해외 거래소 매수 주문 (포지션 청산) - USDT 기준 계산 필요
        frAdapter.placeOrder({
          symbol: coinSymbol,
          type: "market",
          side: "buy",
          amount: "0", // USDT 기준 투자액
        }),
      ]);

      console.log(
        `주문 완료 - 한국 거래소: ${krSellOrderId}, 해외 거래소: ${frBuyOrderId}`
      );

      // 4. 주문 체결 완료 - 즉시 응답 (Phase 1)
      // DB 저장은 별도 엔드포인트에서 처리
      return Response.json({
        success: true,
        message: `${coinSymbol} 포지션이 성공적으로 종료되었습니다.`,
        data: {
          needsFinalization: true,
          coinSymbol,
          krExchange,
          frExchange,
          krOrderId: krSellOrderId,
          frOrderId: frBuyOrderId,
          userId: user.id,
          strategyId: strategyId,
          leverage: leverage,
          positionSettlement: {
            avgEntryRate: positionSettlement.avgEntryRate,
            totalKrVolume: positionSettlement.totalKrVolume,
            totalKrFunds: positionSettlement.totalKrFunds,
            totalFrFunds: positionSettlement.totalFrFunds,
            positionsCount: positionSettlement.positionsCount,
          },
        },
      });
    } catch (orderError) {
      console.error("거래 실행 오류:", orderError);

      return Response.json(
        {
          success: false,
          message:
            "거래 실행 중 오류가 발생했습니다. 포지션이 부분적으로 종료되었을 수 있습니다.",
          error:
            orderError instanceof Error
              ? orderError.message
              : String(orderError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("포지션 종료 오류:", error);

    return Response.json(
      {
        success: false,
        message: "포지션 종료 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
