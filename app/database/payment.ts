import { eq, and, desc } from "drizzle-orm";
import { database } from "./context";
import { payments, plans, users } from "./schema";

/* ================================
   결제 관련 함수들
================================ */

/**
 * 주문 ID 생성
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `KARBIT_${timestamp}_${random}`;
}

/**
 * 결제 생성
 */
export async function createPayment(data: {
  userId: number;
  planId: number;
  amount: number;
  orderId?: string;
}) {
  const db = database();

  try {
    const orderId = data.orderId || generateOrderId();

    const [payment] = await db
      .insert(payments)
      .values({
        userId: data.userId,
        planId: data.planId,
        amount: data.amount.toString(),
        orderId,
        status: "pending",
      })
      .returning();

    return {
      success: true,
      data: payment,
      message: "결제가 생성되었습니다.",
    };
  } catch (error: any) {
    console.error("Create payment error:", error);
    return {
      success: false,
      message: "결제 생성에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 결제 상태 업데이트
 */
export async function updatePaymentStatus(
  orderId: string,
  status: "pending" | "completed" | "failed" | "cancelled",
  data?: {
    transactionId?: string;
    paymentKey?: string;
    paymentMethod?: string;
    paidAt?: Date;
    failureReason?: string;
    metadata?: object;
  }
) {
  const db = database();

  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (data?.transactionId) updateData.transactionId = data.transactionId;
    if (data?.paymentKey) updateData.paymentKey = data.paymentKey;
    if (data?.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data?.paidAt) updateData.paidAt = data.paidAt;
    if (data?.failureReason) updateData.failureReason = data.failureReason;
    if (data?.metadata) updateData.metadata = JSON.stringify(data.metadata);

    const [updatedPayment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.orderId, orderId))
      .returning();

    if (!updatedPayment) {
      return {
        success: false,
        message: "결제 정보를 찾을 수 없습니다.",
      };
    }

    return {
      success: true,
      data: updatedPayment,
      message: "결제 상태가 업데이트되었습니다.",
    };
  } catch (error: any) {
    console.error("Update payment status error:", error);
    return {
      success: false,
      message: "결제 상태 업데이트에 실패했습니다.",
      error: error.message,
    };
  }
}

/**
 * 결제 조회 (주문 ID로)
 */
export async function getPaymentByOrderId(orderId: string) {
  const db = database();

  const payment = await db.query.payments.findFirst({
    where: eq(payments.orderId, orderId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
        },
      },
      plan: true,
    },
  });

  return payment;
}

/**
 * 결제 조회 (paymentKey로)
 */
export async function getPaymentByPaymentKey(paymentKey: string) {
  const db = database();

  const payment = await db.query.payments.findFirst({
    where: eq(payments.paymentKey, paymentKey),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
        },
      },
      plan: true,
    },
  });

  return payment;
}

/**
 * 사용자의 결제 내역 조회
 */
export async function getUserPayments(userId: number, limit = 10) {
  const db = database();

  return await db.query.payments.findMany({
    where: eq(payments.userId, userId),
    with: {
      plan: true,
    },
    orderBy: desc(payments.createdAt),
    limit,
  });
}

/**
 * 토스페이먼츠 결제 승인
 */
export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number
) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }

  try {
    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(secretKey + ":").toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "결제 승인에 실패했습니다.");
    }

    return {
      success: true,
      data: result,
      message: "결제 승인이 완료되었습니다.",
    };
  } catch (error: any) {
    console.error("Toss payment confirmation error:", error);
    return {
      success: false,
      message: error.message || "결제 승인 처리 중 오류가 발생했습니다.",
      error: error.message,
    };
  }
}
