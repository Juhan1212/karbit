import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { createRefundRequest, canUserRequestRefund } from "~/database/refund";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { cancelUserPlan } from "~/database/plan";

export async function action({ request }: ActionFunctionArgs) {
  // 인증 확인
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { refundReason, refundComment } = body;

    // 유효성 검사
    if (!refundReason) {
      return Response.json(
        { error: "환불 사유를 선택해주세요." },
        { status: 400 }
      );
    }

    // 환불 가능 여부 확인
    const refundCheck = await canUserRequestRefund(user.id);
    if (!refundCheck.canRefund) {
      return Response.json({ error: refundCheck.reason }, { status: 400 });
    }

    const cancelResult = await cancelUserPlan(user.id, "user_cancel");
    if (!cancelResult.success) {
      return Response.json(
        { error: "플랜 취소 중 오류가 발생했습니다. 다시 시도해주세요." },
        { status: 500 }
      );
    }

    // 환불 요청 생성
    const result = await createRefundRequest({
      userId: user.id,
      planId: refundCheck.planHistory!.planId,
      paymentId: undefined, // TODO: 실제 결제 ID 연동
      refundAmount: refundCheck.refundAmount!,
      originalAmount: refundCheck.originalAmount!,
      remainingDays: refundCheck.remainingDays!,
      refundReason,
      refundComment,
    });

    if (!result.success) {
      return Response.json({ error: result.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: "환불 요청이 접수되었습니다. 영업일 기준 3-5일 내에 처리됩니다.",
      data: result.data,
    });
  } catch (error: any) {
    console.error("Refund request error:", error);
    return Response.json(
      { error: "환불 요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
