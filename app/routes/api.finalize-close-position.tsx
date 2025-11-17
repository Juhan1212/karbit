import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { getCache } from "../core/redisCache";
import axios from "axios";
import { insertClosedPosition } from "~/database/position";
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
      krOrderId,
      frOrderId,
      userId,
      strategyId,
      leverage,
      positionSettlement,
    }: {
      coinSymbol: string;
      krExchange: UppercaseExchangeType;
      frExchange: UppercaseExchangeType;
      krOrderId: string;
      frOrderId: string;
      userId: number;
      strategyId: number;
      leverage: number;
      positionSettlement: {
        avgEntryRate: number;
        totalKrVolume: number;
        totalKrFunds: number;
        totalFrFunds: number;
        positionsCount: number;
      };
    } = await request.json();

    // 검증
    if (
      !coinSymbol ||
      !krOrderId ||
      !frOrderId ||
      !userId ||
      !strategyId ||
      !positionSettlement
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
      const MAX_RETRIES = 5;
      const RETRY_DELAY_MS = 2000; // 2초 대기

      let krSellOrder;
      let frBuyOrder;
      let frBuyOrderDetail;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(
          `[Finalize] 주문 정보 조회 시도 ${attempt}/${MAX_RETRIES} (${RETRY_DELAY_MS}ms 대기 후)`
        );

        // 대기
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

        // 동시에 주문 상세 정보 조회
        const [krSellOrderResult, frBuyOrderResult, frBuyOrderDetailResult] =
          await Promise.allSettled([
            krAdapter.getOrder(krOrderId, coinSymbol),
            frAdapter.getClosedPnl(coinSymbol, frOrderId),
            frAdapter.getOrder(frOrderId, coinSymbol),
          ]);

        // 한국 거래소 매도 주문 결과 처리
        if (krSellOrderResult.status === "fulfilled") {
          krSellOrder = krSellOrderResult.value;
        } else {
          console.warn(
            `[Finalize] 한국 거래소 주문 조회 실패 (시도 ${attempt}):`,
            krSellOrderResult.reason
          );
          if (attempt === MAX_RETRIES) {
            throw new Error("한국 거래소 주문 정보를 조회할 수 없습니다.");
          }
          continue;
        }

        // 해외 거래소 실현 손익 조회
        if (frBuyOrderResult.status === "fulfilled") {
          frBuyOrder = frBuyOrderResult.value;
        } else {
          console.warn(
            `[Finalize] 해외 거래소 실현 손익 조회 실패 (시도 ${attempt}):`,
            frBuyOrderResult.reason
          );
          if (attempt === MAX_RETRIES) {
            throw new Error("해외 거래소 실현 손익 정보를 조회할 수 없습니다.");
          }
          continue;
        }

        // 해외 거래소 주문 상세 조회
        if (frBuyOrderDetailResult.status === "fulfilled") {
          frBuyOrderDetail = frBuyOrderDetailResult.value;
        } else {
          console.warn(
            `[Finalize] 해외 거래소 주문 상세 조회 실패 (시도 ${attempt}):`,
            frBuyOrderDetailResult.reason
          );
          if (attempt === MAX_RETRIES) {
            throw new Error("해외 거래소 주문 상세 정보를 조회할 수 없습니다.");
          }
          continue;
        }

        // 실현 손익 정보가 제대로 업데이트되었는지 확인
        const isValidPnlData =
          frBuyOrder.totalPnl !== 0 ||
          frBuyOrder.avgExitPrice !== 0 ||
          frBuyOrder.totalVolume !== 0;

        if (isValidPnlData) {
          console.log(
            `[Finalize] ✅ 주문 정보 조회 성공 (시도 ${attempt}/${MAX_RETRIES})`
          );
          console.log("[Finalize] 한국 거래소 매도 주문 결과:", krSellOrder);
          console.log("[Finalize] 해외 거래소 매수 주문 결과:", frBuyOrder);
          break; // 성공 시 루프 탈출
        }

        if (attempt < MAX_RETRIES) {
          console.warn(
            `[Finalize] ⚠️ 실현 손익 정보가 아직 업데이트되지 않음 (시도 ${attempt}/${MAX_RETRIES}). 재시도합니다...`
          );
          console.log("[Finalize] 현재 조회된 데이터:", frBuyOrder);
        } else {
          console.error(
            `[Finalize] ❌ 최대 재시도 횟수(${MAX_RETRIES})를 초과했습니다. 마지막 조회 결과를 사용합니다.`
          );
          console.log("[Finalize] 최종 조회된 데이터:", frBuyOrder);
        }
      }

      // 재시도 후에도 데이터를 가져오지 못한 경우 에러 처리
      if (!krSellOrder || !frBuyOrder || !frBuyOrderDetail) {
        throw new Error(
          "최대 재시도 후에도 주문 정보를 조회할 수 없습니다."
        );
      }

      // USDT 가격 조회
      let currentUsdtPrice: number = 0;
      try {
        const cached = await getCache<{ data: any; timestamp: number }>(
          "upbit:KRW-USDT"
        );
        if (cached && Date.now() - cached.timestamp < 10000) {
          currentUsdtPrice = Number(cached.data[0]?.trade_price) || 0;
        } else {
          const upbitUrl = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";
          const response = await axios.get(upbitUrl);
          currentUsdtPrice = Number(response.data[0]?.trade_price) || 0;
        }
      } catch (err) {
        console.error("[Finalize] Upbit USDT-KRW 시세 조회 실패:", err);
        currentUsdtPrice = 0;
      }

      // 현재 환율 조회 (실제 수익률 계산용)
      const exitRate = preciseDivide(
        safeNumeric(krSellOrder.price, 0),
        safeNumeric(frBuyOrder.avgExitPrice, 0),
        CRYPTO_DECIMALS.RATE
      );

      // 수익률 계산
      const krFundsTotal = safeNumeric(positionSettlement.totalKrFunds, 0);
      const frFundsInKrw = preciseMultiply(
        safeNumeric(positionSettlement.totalFrFunds, 0),
        currentUsdtPrice,
        CRYPTO_DECIMALS.FUNDS
      );
      const totalInvested =
        preciseAdd(krFundsTotal, frFundsInKrw, CRYPTO_DECIMALS.FUNDS) / 2;

      // 최종 수익 계산
      const krSettlementAmount = preciseSubtract(
        safeNumeric(krSellOrder.filled, 0),
        safeNumeric(krSellOrder.fee, 0),
        CRYPTO_DECIMALS.FUNDS
      );

      const krProfit = preciseSubtract(
        krSettlementAmount,
        safeNumeric(positionSettlement.totalKrFunds, 0),
        CRYPTO_DECIMALS.PROFIT
      );

      const frPnlInKrw = preciseMultiply(
        safeNumeric(frBuyOrder.totalPnl, 0),
        currentUsdtPrice,
        CRYPTO_DECIMALS.PROFIT
      );

      const profit = preciseAdd(krProfit, frPnlInKrw, CRYPTO_DECIMALS.PROFIT);

      const profitRate =
        totalInvested > 0
          ? preciseProfitRate(
              totalInvested,
              preciseAdd(totalInvested, profit, CRYPTO_DECIMALS.PROFIT)
            )
          : 0;

      console.log(
        `[Finalize] 수익률 계산 - 한국 수익: ${krProfit}, 해외 PnL(KRW): ${frPnlInKrw}, 총 수익: ${profit}, 수익률: ${profitRate}%`
      );

      // DB에 종료된 포지션 기록
      await insertClosedPosition({
        userId: user.id,
        strategyId: strategyId,
        coinSymbol: coinSymbol,
        leverage: leverage,
        krExchange: krExchange,
        krOrderId: krSellOrder.id,
        krPrice: krSellOrder.price,
        krVolume: krSellOrder.amount,
        krFunds: krSellOrder.filled,
        krFee: krSellOrder.fee || 0,
        frExchange: frExchange,
        frOrderId: frOrderId,
        frOriginalPrice: frBuyOrder.orderPrice,
        frPrice: frBuyOrder.avgExitPrice,
        frSlippage: frBuyOrderDetail.slippage,
        frVolume: frBuyOrder.totalVolume,
        frFunds: safeNumeric(
          positionSettlement.totalFrFunds + frBuyOrder.totalPnl,
          0
        ),
        frFee: frBuyOrder.closeFee || 0,
        entryRate: exitRate,
        exitRate: exitRate,
        usdtPrice: currentUsdtPrice,
        profit: profit,
        profitRate: profitRate,
        entryTime: new Date(),
        exitTime: new Date(),
      });

      // 사용자 통계 업데이트
      const totalClosed = preciseAdd(
        preciseSubtract(
          safeNumeric(krSellOrder.filled, 0),
          safeNumeric(krSellOrder.fee, 0),
          CRYPTO_DECIMALS.FUNDS
        ),
        preciseMultiply(
          safeNumeric(positionSettlement.totalFrFunds + frBuyOrder.totalPnl, 0),
          currentUsdtPrice,
          CRYPTO_DECIMALS.FUNDS
        ),
        CRYPTO_DECIMALS.FUNDS
      );
      await updateUserStatsAfterPosition(user.id, totalClosed);

      // 전략 성과 업데이트
      await updateStrategyStatsAfterPositionClose(
        strategyId,
        profit,
        profitRate
      );

      console.log(
        `[Finalize] ✅ ${coinSymbol} 포지션 결과 DB 저장 완료 - 수익: ${profit.toFixed(2)}원, 수익률: ${profitRate.toFixed(2)}%`
      );

      return Response.json({
        success: true,
        message: `${coinSymbol} 포지션 결과가 성공적으로 기록되었습니다.`,
        data: {
          profit: profit.toFixed(2),
          profitRate: profitRate.toFixed(2),
          settlementInfo: {
            avgEntryRate: positionSettlement.avgEntryRate,
            totalKrVolume: positionSettlement.totalKrVolume,
            totalKrFunds: positionSettlement.totalKrFunds,
            totalFrFunds: positionSettlement.totalFrFunds,
            positionsCount: positionSettlement.positionsCount,
          },
          krOrder: {
            id: krSellOrder.id,
            filled: krSellOrder.filled,
            price: krSellOrder.price,
            fee: krSellOrder.fee,
          },
          frOrder: {
            id: frOrderId,
            filled: frBuyOrder.totalVolume,
            price: frBuyOrder.avgExitPrice,
            fee: frBuyOrder.closeFee,
          },
          exitRate: exitRate,
        },
      });
    } catch (finalizeError) {
      console.error("[Finalize] 포지션 결과 기록 오류:", finalizeError);

      return Response.json(
        {
          success: false,
          message: "포지션 결과 기록 중 오류가 발생했습니다.",
          error:
            finalizeError instanceof Error
              ? finalizeError.message
              : String(finalizeError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Finalize] 포지션 마무리 오류:", error);

    return Response.json(
      {
        success: false,
        message: "포지션 마무리 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
