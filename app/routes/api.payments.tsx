import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import {
  createPayment,
  updatePaymentStatus,
  getPaymentByOrderId,
  getPaymentByPaymentKey,
  confirmTossPayment,
} from "~/database/payment";
import { getPlanById, changeUserPlan } from "~/database/plan";

export async function loader({ request }: LoaderFunctionArgs) {
  // GET 요청 처리 (결제 상태 조회 등)
  return Response.json({ message: "Payment API" }, { status: 200 });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "create":
        return await handleCreatePayment(request);
      case "confirm":
        return await handleConfirmPayment(request);
      default:
        return Response.json(
          { success: false, message: "지원하지 않는 액션입니다." },
          { status: 200 }
        );
    }
  } catch (error: any) {
    console.error("Payment API error:", error);
    return Response.json(
      {
        success: false,
        message: "결제 처리 중 오류가 발생했습니다.",
        error: error.message,
      },
      { status: 200 }
    );
  }
}

/**
 * 결제 생성 처리
 */
async function handleCreatePayment(request: Request) {
  // 인증 확인
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return Response.json(
      { success: false, message: "인증이 필요합니다." },
      { status: 200 }
    );
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json(
      { success: false, message: "유효하지 않은 세션입니다." },
      { status: 200 }
    );
  }

  const formData = await request.formData();
  const planId = formData.get("planId");

  if (!planId) {
    return Response.json(
      { success: false, message: "플랜 ID가 필요합니다." },
      { status: 200 }
    );
  }

  const planIdNumber = parseInt(planId as string);
  if (isNaN(planIdNumber)) {
    return Response.json(
      { success: false, message: "올바르지 않은 플랜 ID입니다." },
      { status: 200 }
    );
  }

  // 플랜 정보 조회
  const plan = await getPlanById(planIdNumber);
  if (!plan) {
    return Response.json(
      { success: false, message: "플랜을 찾을 수 없습니다." },
      { status: 200 }
    );
  }

  const amount = parseFloat(plan.price || "0");
  if (amount <= 0) {
    return Response.json(
      { success: false, message: "무료 플랜은 결제가 불필요합니다." },
      { status: 200 }
    );
  }

  // 결제 생성
  const paymentResult = await createPayment({
    userId: user.id,
    planId: planIdNumber,
    amount,
  });

  if (!paymentResult.success || !paymentResult.data) {
    return Response.json(paymentResult, { status: 200 });
  }

  return Response.json({
    success: true,
    data: {
      orderId: paymentResult.data.orderId,
      amount,
      planName: plan.name,
      customerName: user.name || "사용자",
      customerEmail: user.email,
    },
    message: "결제가 생성되었습니다.",
  });
}

/**
 * 토스페이먼츠 결제 승인 처리
 */
async function handleConfirmPayment(request: Request) {
  const formData = await request.formData();
  const paymentKey = formData.get("paymentKey") as string;
  const orderId = formData.get("orderId") as string;
  const amount = parseInt(formData.get("amount") as string);

  if (!paymentKey || !orderId || !amount) {
    return Response.json(
      { success: false, message: "필수 결제 정보가 누락되었습니다." },
      { status: 200 }
    );
  }

  // 결제 정보 조회
  const payment = await getPaymentByOrderId(orderId);
  if (!payment) {
    return Response.json(
      { success: false, message: "결제 정보를 찾을 수 없습니다." },
      { status: 200 }
    );
  }

  // 금액 검증
  const storedAmount = parseFloat(payment.amount);
  if (storedAmount !== amount) {
    return Response.json(
      { success: false, message: "결제 금액이 일치하지 않습니다." },
      { status: 200 }
    );
  }

  // 토스페이먼츠 결제 승인
  const confirmResult = await confirmTossPayment(paymentKey, orderId, amount);

  if (!confirmResult.success) {
    // 결제 실패 처리
    await updatePaymentStatus(orderId, "failed", {
      failureReason: confirmResult.message,
      metadata: confirmResult.data,
    });

    return Response.json({
      success: false,
      message: confirmResult.message,
    });
  }

  // 결제 성공 처리
  const updateResult = await updatePaymentStatus(orderId, "completed", {
    paymentKey,
    transactionId: confirmResult.data.transactionKey,
    paymentMethod: confirmResult.data.method,
    paidAt: new Date(confirmResult.data.approvedAt),
    metadata: confirmResult.data,
  });

  if (updateResult.success) {
    // 플랜 변경 처리
    await changeUserPlan(payment.userId, payment.planId, "payment_upgrade");
  }

  return Response.json({
    success: true,
    message: "결제가 완료되었습니다.",
    data: confirmResult.data,
  });
}
