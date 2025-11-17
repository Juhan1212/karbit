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

      // 4. 주문 완료 후 상세 정보 조회 (체결 정보 포함)
      // 시장가 주문의 경우 즉시 체결되지만, 안전을 위해 짧은 대기 후 조회
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1000ms 대기

      // for mock test
      // const krSellOrderId = "1fc437c5-4fb6-42f6-843e-b1d3a23eaa19";
      // const frBuyOrderId = "2560f9ff-2065-4c36-9ae4-ff3018e1e310";

      // 동시에 주문 상세 정보 조회
      const [krSellOrderResult, frBuyOrderResult, frBuyOrderDetailResult] =
        await Promise.allSettled([
          krAdapter.getOrder(krSellOrderId, coinSymbol),
          frAdapter.getClosedPnl(coinSymbol, frBuyOrderId),
          frAdapter.getOrder(frBuyOrderId, coinSymbol), // 추가된 부분
        ]);

      // 한국 거래소 매도 주문 결과 처리
      let krSellOrder;
      if (krSellOrderResult.status === "fulfilled") {
        krSellOrder = krSellOrderResult.value;
      } else {
        console.warn(
          "한국 거래소 주문 조회 실패, 기본값 사용:",
          krSellOrderResult.reason
        );
        throw new Error("한국 거래소 주문 정보를 조회할 수 없습니다.");
      }

      console.log("한국 거래소 매도 주문 결과:", krSellOrder);

      let frBuyOrder;
      if (frBuyOrderResult.status === "fulfilled") {
        frBuyOrder = frBuyOrderResult.value;
      } else {
        console.warn(
          "해외 거래소 주문 조회 실패, 기본값 사용:",
          frBuyOrderResult.reason
        );
        throw new Error("해외 거래소 주문 정보를 조회할 수 없습니다.");
      }

      let frBuyOrderDetail;
      if (frBuyOrderDetailResult.status === "fulfilled") {
        frBuyOrderDetail = frBuyOrderDetailResult.value;
      } else {
        console.warn(
          "해외 거래소 주문 상세 조회 실패, 기본값 사용:",
          frBuyOrderDetailResult.reason
        );
        throw new Error("해외 거래소 주문 상세 정보를 조회할 수 없습니다.");
      }

      console.log("해외 거래소 매수 주문 결과:", frBuyOrder);

      // USDT 가격 조회 (업비트 인스턴스 사용)
      // Upbit USDT-KRW 시세 조회 (캐시 우선)
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
        console.error("Upbit USDT-KRW 시세 조회 실패:", err);
        currentUsdtPrice = 0;
      }

      // 5. 현재 환율 조회 (실제 수익률 계산용) - 정밀한 나눗셈 사용
      const exitRate = preciseDivide(
        safeNumeric(krSellOrder.price, 0),
        safeNumeric(frBuyOrder.avgExitPrice, 0),
        CRYPTO_DECIMALS.RATE
      );

      // 6. 수익률 계산 (실제 체결 결과 기반) - 정밀한 연산 사용
      // 총 투자금액 = 한국 거래소 투자금 + 해외 거래소 투자금 * USDT 가격
      const krFundsTotal = safeNumeric(positionSettlement.totalKrFunds, 0);
      const frFundsInKrw = preciseMultiply(
        safeNumeric(positionSettlement.totalFrFunds, 0),
        currentUsdtPrice,
        CRYPTO_DECIMALS.FUNDS
      );
      const totalInvested =
        preciseAdd(krFundsTotal, frFundsInKrw, CRYPTO_DECIMALS.FUNDS) / 2;

      // 최종 수익 계산
      // 최종수익 = positionSettlement.totalKrFunds - (krSellOrder.filled - krSellOrder.fee) + frBuyOrder.totalPnl * currentUsdtPrice
      // 종료 시점의 수수료를 뺀 금액이 정산금액
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

      // 해외 거래소 PnL은 이미 수수료가 반영된 값
      const frPnlInKrw = preciseMultiply(
        safeNumeric(frBuyOrder.totalPnl, 0),
        currentUsdtPrice,
        CRYPTO_DECIMALS.PROFIT
      );

      // 최종 수익 = 한국 거래소 수익 + 해외 거래소 PnL (KRW 환산)
      const profit = preciseAdd(krProfit, frPnlInKrw, CRYPTO_DECIMALS.PROFIT);

      // 수익률 = (수익 / 투자금액) * 100
      const profitRate =
        totalInvested > 0
          ? preciseProfitRate(
              totalInvested,
              preciseAdd(totalInvested, profit, CRYPTO_DECIMALS.PROFIT)
            )
          : 0;

      console.log(
        `[수익률 계산] 한국 수익: ${krProfit}, 해외 PnL(KRW): ${frPnlInKrw}, 총 수익: ${profit}, 수익률: ${profitRate}%`
      );

      // 7. 종료된 포지션을 DB에 기록
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
        frOrderId: frBuyOrderId,
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

      // 사용자 통계 업데이트 - 총 회수 금액 계산
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

      return Response.json({
        success: true,
        message: `${coinSymbol} 포지션이 성공적으로 종료되었습니다.`,
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
            id: frBuyOrderId,
            filled: frBuyOrder.totalVolume,
            price: frBuyOrder.avgExitPrice,
            fee: frBuyOrder.closeFee,
          },
          exitRate: exitRate,
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
