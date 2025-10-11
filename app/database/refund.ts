import { eq, and, desc, sql } from "drizzle-orm";
import { database } from "./context";
import { refunds, users, plans, userPlanHistory } from "./schema";
import { cancelUserPlan } from "./plan";

/* ================================
   환불 요청 및 처리
================================ */

/**
 * 환불 요청 생성
 */
export async function createRefundRequest(refundData: {
  userId: number;
  planId: number;
  paymentId?: number;
  refundAmount: number;
  originalAmount: number;
  remainingDays: number;
  refundReason: string;
  refundComment?: string;
}) {
  const db = database();

  try {
    const result = await db
      .insert(refunds)
      .values({
        userId: refundData.userId,
        planId: refundData.planId,
        paymentId: refundData.paymentId,
        refundAmount: refundData.refundAmount.toString(),
        originalAmount: refundData.originalAmount.toString(),
        remainingDays: refundData.remainingDays,
        refundReason: refundData.refundReason,
        refundComment: refundData.refundComment,
        status: "pending",
      })
      .returning();

    return {
      success: true,
      data: result[0],
      message: "환불 요청이 성공적으로 접수되었습니다.",
    };
  } catch (error: any) {
    console.error("Create refund request error:", error);
    return {
      success: false,
      message: "환불 요청 처리에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 사용자의 환불 요청 목록 조회
 */
export async function getUserRefunds(userId: number, limit = 10) {
  const db = database();

  return await db
    .select({
      refund: refunds,
      plan: plans,
    })
    .from(refunds)
    .innerJoin(plans, eq(refunds.planId, plans.id))
    .where(eq(refunds.userId, userId))
    .orderBy(desc(refunds.createdAt))
    .limit(limit);
}

/**
 * 특정 환불 요청 조회
 */
export async function getRefundById(refundId: number) {
  const db = database();

  const result = await db
    .select({
      refund: refunds,
      plan: plans,
      user: users,
    })
    .from(refunds)
    .innerJoin(plans, eq(refunds.planId, plans.id))
    .innerJoin(users, eq(refunds.userId, users.id))
    .where(eq(refunds.id, refundId))
    .limit(1);

  return result[0] || null;
}

/**
 * 환불 요청 승인 및 처리
 */
export async function approveRefund(
  refundId: number,
  processedBy?: number,
  refundMethod?: string,
  refundTransactionId?: string
) {
  const db = database();

  try {
    // 환불 정보 조회
    const refundInfo = await getRefundById(refundId);
    if (!refundInfo) {
      return {
        success: false,
        message: "환불 요청을 찾을 수 없습니다.",
      };
    }

    if (refundInfo.refund.status !== "pending") {
      return {
        success: false,
        message: "이미 처리된 환불 요청입니다.",
      };
    }

    await db.transaction(async (tx) => {
      // 1. 환불 상태 업데이트
      await tx
        .update(refunds)
        .set({
          status: "completed",
          processedBy,
          processedAt: new Date(),
          refundMethod,
          refundTransactionId,
          updatedAt: new Date(),
        })
        .where(eq(refunds.id, refundId));

      // 2. 사용자 플랜 취소 (Free 플랜으로 다운그레이드)
      await cancelUserPlan(refundInfo.refund.userId, "refund_processed");
    });

    return {
      success: true,
      message: "환불이 성공적으로 처리되었습니다.",
    };
  } catch (error: any) {
    console.error("Approve refund error:", error);
    return {
      success: false,
      message: "환불 처리에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 환불 요청 거절
 */
export async function rejectRefund(
  refundId: number,
  rejectionReason: string,
  processedBy?: number
) {
  const db = database();

  try {
    const result = await db
      .update(refunds)
      .set({
        status: "rejected",
        rejectionReason,
        processedBy,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(refunds.id, refundId), eq(refunds.status, "pending")))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        message: "환불 요청을 찾을 수 없거나 이미 처리되었습니다.",
      };
    }

    return {
      success: true,
      message: "환불 요청이 거절되었습니다.",
    };
  } catch (error: any) {
    console.error("Reject refund error:", error);
    return {
      success: false,
      message: "환불 거절 처리에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 대기 중인 환불 요청 목록 조회 (관리자용)
 */
export async function getPendingRefunds(limit = 50) {
  const db = database();

  return await db
    .select({
      refund: refunds,
      plan: plans,
      user: users,
    })
    .from(refunds)
    .innerJoin(plans, eq(refunds.planId, plans.id))
    .innerJoin(users, eq(refunds.userId, users.id))
    .where(eq(refunds.status, "pending"))
    .orderBy(desc(refunds.createdAt))
    .limit(limit);
}

/**
 * 환불 통계 조회
 */
export async function getRefundStatistics(startDate?: Date, endDate?: Date) {
  const db = database();

  const conditions = [];
  if (startDate) {
    conditions.push(sql`${refunds.createdAt} >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(sql`${refunds.createdAt} <= ${endDate}`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({
      status: refunds.status,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`sum(${refunds.refundAmount})`,
    })
    .from(refunds)
    .where(whereClause)
    .groupBy(refunds.status);

  return result;
}

/**
 * 사용자가 환불 가능한지 확인
 */
export async function canUserRequestRefund(userId: number) {
  const db = database();

  // 현재 활성 플랜 조회
  const activePlan = await db
    .select({
      planHistory: userPlanHistory,
      plan: plans,
    })
    .from(userPlanHistory)
    .innerJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(
      and(
        eq(userPlanHistory.userId, userId),
        eq(userPlanHistory.isActive, true)
      )
    )
    .orderBy(desc(userPlanHistory.startDate))
    .limit(1);

  if (!activePlan[0]) {
    return {
      canRefund: false,
      reason: "활성 플랜이 없습니다.",
    };
  }

  const { planHistory, plan } = activePlan[0];

  // Free 플랜은 환불 불가
  if (parseFloat(plan.price || "0") === 0) {
    return {
      canRefund: false,
      reason: "무료 플랜은 환불할 수 없습니다.",
    };
  }

  // 시작일로부터 7일이 지났는지 확인
  const now = new Date();
  const startDate = new Date(planHistory.startDate);
  const daysSinceStart = Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  //   if (daysSinceStart > 7) {
  //     return {
  //       canRefund: false,
  //       reason: "환불 가능 기간(결제 후 7일)이 지났습니다.",
  //     };
  //   }

  // 대기 중인 환불 요청이 있는지 확인
  const pendingRefund = await db
    .select()
    .from(refunds)
    .where(
      and(
        eq(refunds.userId, userId),
        eq(refunds.planId, planHistory.planId),
        eq(refunds.status, "pending")
      )
    )
    .limit(1);

  if (pendingRefund.length > 0) {
    return {
      canRefund: false,
      reason: "이미 처리 중인 환불 요청이 있습니다.",
    };
  }

  // 환불 금액 계산
  const endDate = planHistory.endDate
    ? new Date(planHistory.endDate)
    : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const remainingDays = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const planPrice = parseFloat(plan.price || "0");

  // 7일 이내면 전액 환불, 7일 이후면 일할 계산
  const refundAmount =
    daysSinceStart <= 7
      ? planPrice
      : Math.round((planPrice * remainingDays) / 30);

  return {
    canRefund: true,
    planHistory,
    plan,
    remainingDays,
    refundAmount,
    originalAmount: planPrice,
  };
}
