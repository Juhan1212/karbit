import React, { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, redirect } from "react-router";
import { toast } from "sonner";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import {
  getAllPlans,
  getUserCurrentPlan,
  changeUserPlan,
  assignUserPlan,
  cancelUserPlan,
} from "~/database/plan";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import {
  Check,
  Crown,
  Zap,
  X,
  AlertCircle,
  Calendar,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Textarea } from "../components/textarea";
import { Checkbox } from "../components/checkbox";
import { Label } from "../components/label";
import { Separator } from "../components/separator";

// 토스페이먼츠 타입 선언
declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      widgets: (options: { customerKey: string }) => {
        setAmount: (amount: {
          currency: string;
          value: number;
        }) => Promise<void>;
        renderPaymentMethods: (options: { selector: string }) => Promise<any>;
        renderAgreement: (options: { selector: string }) => Promise<any>;
        requestPayment: (options: {
          orderId: string;
          orderName: string;
          customerName: string;
          customerEmail: string;
        }) => Promise<{
          paymentKey: string;
          orderId: string;
          amount: { value: number };
        }>;
        destroy?: () => void;
      };
    };
  }
}

interface Plan {
  id: number;
  name: string;
  description?: string;
  price: string;
  period?: string;
  features?: string[];
  limitations?: string[];
  current?: boolean;
  popular?: boolean;
}

interface PlanCardProps {
  plan: Plan;
  currentPlanId?: number;
  currentPlanPrice?: number; // 현재 플랜의 가격 추가
  onUpgrade: (planId: number) => void;
  onCancel: (planId: number) => void;
  isLoading: boolean;
}

export function meta() {
  return [
    { title: "Plan Management - Karbit" },
    {
      name: "description",
      content: "Manage your subscription plans and billing",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 인증 확인
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      throw redirect("/login");
    }

    const user = await validateSession(token);
    if (!user) {
      throw redirect("/login");
    }

    // 모든 플랜 조회
    const plans = await getAllPlans();

    // 사용자의 현재 활성 플랜 조회 (자동으로 Free 플랜이 할당됨)
    const currentPlan = await getUserCurrentPlan(user.id);

    return {
      plans,
      currentPlan,
      user,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw redirect("/login");
    }
    console.error("plans loader error:", error);
    return {
      plans: [],
      currentPlan: null,
      user: null,
    };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
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

    // FormData 파싱
    const formData = await request.formData();
    const action = formData.get("action");
    const planId = formData.get("planId");

    if (!action) {
      return Response.json(
        { success: false, message: "액션이 지정되지 않았습니다." },
        { status: 200 }
      );
    }

    switch (action) {
      case "upgrade":
      case "change":
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

        // 플랜 변경 실행
        const result = await changeUserPlan(
          user.id,
          planIdNumber,
          action === "upgrade" ? "upgrade" : "plan_change"
        );

        return Response.json(result, { status: 200 });

      case "assign":
        // 새 플랜 할당 (첫 플랜 설정)
        if (!planId) {
          return Response.json(
            { success: false, message: "플랜 ID가 필요합니다." },
            { status: 200 }
          );
        }

        const assignPlanId = parseInt(planId as string);
        if (isNaN(assignPlanId)) {
          return Response.json(
            { success: false, message: "올바르지 않은 플랜 ID입니다." },
            { status: 200 }
          );
        }

        const assignResult = await assignUserPlan(
          user.id,
          assignPlanId,
          "initial_assignment"
        );

        return Response.json(assignResult, { status: 200 });

      case "cancel":
        // 구독 취소 처리
        const cancelResult = await cancelUserPlan(user.id, "user_cancel");
        return Response.json(cancelResult, { status: 200 });

      default:
        return Response.json(
          { success: false, message: "지원하지 않는 액션입니다." },
          { status: 200 }
        );
    }
  } catch (error: any) {
    console.error("Plans action error:", error);
    return Response.json(
      {
        success: false,
        message: "플랜 처리 중 오류가 발생했습니다.",
        error: error.message,
      },
      { status: 200 }
    );
  }
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlanId,
  currentPlanPrice,
  onUpgrade,
  onCancel,
  isLoading,
}) => {
  const isCurrent = currentPlanId === plan.id;
  const isPopular = plan.popular || plan.name === "Starter"; // Starter 플랜을 인기 플랜으로 설정
  const isPaidPlan = parseFloat(plan.price || "0") > 0 && plan.name !== "Free";

  // 현재 플랜보다 낮은 등급인지 확인
  const planPrice = parseFloat(plan.price || "0");
  const isLowerTier =
    currentPlanPrice !== undefined && planPrice < currentPlanPrice;

  const getButtonText = () => {
    if (isLoading) return "처리 중...";
    if (isCurrent) {
      return "현재 플랜"; // 현재 플랜인 경우 항상 "현재 플랜" 표시
    }
    if (isLowerTier) {
      return "다운그레이드"; // 낮은 등급인 경우
    }
    return `${plan.name}으로 업그레이드`;
  };

  const getButtonVariant = () => {
    if (isCurrent) return "outline"; // 현재 플랜은 항상 outline 스타일
    return isPopular ? "default" : "outline";
  };

  const handleButtonClick = () => {
    if (isCurrent) {
      return; // 현재 플랜인 경우 아무 동작도 하지 않음
    }
    onUpgrade(plan.id);
  };

  return (
    <Card
      className={`relative ${isPopular ? "border-primary" : ""} h-full flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer group`}
    >
      {isPopular && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-white group-hover:scale-105 transition-transform duration-200">
          추천
        </Badge>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors duration-200">
            {plan.name === "Premium" && (
              <Crown className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform duration-200" />
            )}
            {plan.name === "Starter" && (
              <Zap className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform duration-200" />
            )}
            {plan.name}
          </CardTitle>
          {/* {isCurrent && <Badge variant="secondary">현재 플랜</Badge>} */}
        </div>
        <div className="space-y-1">
          <div className="text-2xl lg:text-3xl font-bold group-hover:text-primary transition-colors duration-200">
            ₩{parseInt(plan.price, 10).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {plan.period || "월"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        {/* Features & Limitations Container */}
        <div className="space-y-4">
          {/* Features */}
          {plan.features && plan.features.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium group-hover:text-primary transition-colors duration-200">
                포함 기능
              </h4>
              <ul className="space-y-1">
                {plan.features.map((feature: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm group-hover:text-foreground transition-colors duration-200"
                  >
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5 group-hover:text-green-500 group-hover:scale-110 transition-all duration-200" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {plan.limitations && plan.limitations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                제한 사항
              </h4>
              <ul className="space-y-1">
                {plan.limitations.map((limitation: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Button - Fixed at bottom */}
        {(plan.name !== "Free" || isCurrent) && !isLowerTier && (
          <div className="pt-4">
            <Button
              className={`w-full ${
                isCurrent
                  ? "bg-green-600 text-white border-green-600"
                  : plan.name === "Premium"
                    ? "bg-[#F59E0B] text-white border-[#F59E0B]"
                    : isPopular
                      ? "text-white"
                      : ""
              } transition-all duration-200`}
              variant={getButtonVariant() as any}
              disabled={isLoading || (isCurrent && !isPaidPlan)}
              onClick={handleButtonClick}
            >
              {getButtonText()}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 토스페이먼츠 결제위젯 컴포넌트
interface PaymentWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  planData: {
    id: number;
    name: string;
    price: number;
    orderId: string;
  };
  customerData: {
    name: string;
    email: string;
  };
}

const PaymentWidget: React.FC<PaymentWidgetProps> = ({
  isOpen,
  onClose,
  planData,
  customerData,
}) => {
  const paymentWidgetRef = useRef<HTMLDivElement>(null);
  const [tossPayments, setTossPayments] = useState<any>(null);
  const [widgets, setWidgets] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 토스페이먼츠 SDK 로드
    const loadTossPayments = async () => {
      if (window.TossPayments) {
        const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"; // 결제위젯용 테스트 키
        const tossPayments = window.TossPayments(clientKey);
        const widgets = tossPayments.widgets({
          customerKey: `customer_${customerData.email}`,
        });

        setTossPayments(tossPayments);
        setWidgets(widgets);

        // 결제 금액 설정
        await widgets.setAmount({
          currency: "KRW",
          value: planData.price,
        });

        // 결제 수단만 숨김 처리 (약관은 커스텀으로 처리)
        await widgets.renderPaymentMethods({
          selector: "#payment-method",
        });
      }
    };

    // 스크립트가 이미 로드되어 있다면 바로 실행
    if (document.querySelector('script[src*="tosspayments.com"]')) {
      loadTossPayments();
    } else {
      // 스크립트 로드
      const script = document.createElement("script");
      script.src = "https://js.tosspayments.com/v2/standard";
      script.onload = () => loadTossPayments();
      document.head.appendChild(script);
    }

    return () => {
      // 위젯 정리
      if (widgets) {
        try {
          widgets.destroy?.();
        } catch (error) {
          console.warn("Widget destroy error:", error);
        }
      }
    };
  }, [isOpen, planData, customerData]);

  const handlePayment = async () => {
    if (!widgets) {
      toast.error("결제 위젯이 준비되지 않았습니다.");
      return;
    }

    if (!termsAccepted) {
      toast.error("이용약관에 동의해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await widgets.requestPayment({
        orderId: planData.orderId,
        orderName: `Karbit ${planData.name} 플랜`,
        customerName: customerData.name,
        customerEmail: customerData.email,
      });

      // 결제 승인 API 호출
      const confirmData = new FormData();
      confirmData.append("paymentKey", result.paymentKey);
      confirmData.append("orderId", result.orderId);
      confirmData.append("amount", result.amount.value.toString());

      const confirmResponse = await fetch("/api/payments?action=confirm", {
        method: "POST",
        body: confirmData,
      });

      const confirmResult = await confirmResponse.json();

      if (confirmResult.success) {
        toast.success("결제가 완료되었습니다!");
        onClose();
        window.location.reload(); // 페이지 새로고침으로 플랜 업데이트 반영
      } else {
        toast.error(confirmResult.message || "결제 승인에 실패했습니다.");
      }
    } catch (error: any) {
      toast.error(error.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const termsText = `Karbit 서비스 이용약관 및 개인정보 처리방침

제1조 (목적)
이 약관은 Karbit(이하 "회사")이 제공하는 암호화폐 자동매매 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"라 함은 회사가 제공하는 암호화폐 자동매매 플랫폼을 의미합니다.
2. "이용자"라 함은 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.
3. "계정"이라 함은 이용자의 식별과 서비스 이용을 위하여 이용자가 선정하고 회사가 승인한 문자, 숫자 또는 그 조합을 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 서비스를 제공합니다:
   - 암호화폐 시장 데이터 분석
   - 자동매매 알고리즘 실행
   - 포트폴리오 관리 도구
   - 기타 회사가 정하는 서비스

제5조 (이용자의 의무)
1. 이용자는 관련 법령, 이 약관의 규정, 이용안내 및 서비스상에 공지한 주의사항, 회사가 통지하는 사항 등을 준수하여야 합니다.
2. 이용자는 회사의 사전 승낙 없이는 서비스를 이용하여 영업활동을 할 수 없습니다.

제6조 (개인정보보호)
회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.

제7조 (면책조항)
1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.

결제 관련 약관:
- 구독료는 매월 자동으로 결제됩니다.
- 구독 취소는 언제든지 가능하며, 취소 시점부터 다음 결제일까지 서비스를 이용할 수 있습니다.
- 환불은 구독 후 7일 이내에만 가능합니다.
- 결제 정보는 토스페이먼츠를 통해 안전하게 처리됩니다.
- 카드 정보는 PCI DSS 기준에 따라 보호됩니다.`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">결제하기</DialogTitle>
          <DialogDescription className="text-gray-400">
            {planData.name} 플랜을 구독합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 주문 정보 */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">플랜</span>
              <span className="text-sm text-white font-semibold">
                {planData.name}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-300">
                결제 금액
              </span>
              <span className="text-lg font-bold text-primary">
                ₩{planData.price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 결제 수단은 숨김 처리 */}
          <div className="hidden">
            <div id="payment-method" />
          </div>

          {/* 약관 동의 */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-white">이용약관</h4>
            <div className="border border-gray-700 rounded-md bg-gray-800">
              <div className="max-h-40 overflow-y-auto p-3 text-xs leading-relaxed bg-gray-850 rounded-t-md">
                {termsText.split("\n").map((line, index) => (
                  <div
                    key={index}
                    className={line.trim() === "" ? "h-2" : "text-gray-300"}
                  >
                    {line}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-700">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-600 rounded focus:ring-primary bg-gray-700"
                  />
                  <span className="text-sm text-gray-300">
                    위 이용약관 및 개인정보 처리방침에 동의합니다
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* 결제 버튼 */}
          <Button
            onClick={handlePayment}
            disabled={isLoading || !termsAccepted}
            className="w-full text-white bg-primary hover:bg-primary/90 disabled:bg-gray-700 disabled:text-gray-500"
            size="lg"
          >
            {isLoading
              ? "결제 중..."
              : `₩${planData.price.toLocaleString()} 결제하기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function PlanManagement() {
  const { plans, currentPlan, user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState<any>(null);

  // 환불 다이얼로그 상태
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundComment, setRefundComment] = useState("");
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);
  const [isRefundProcessing, setIsRefundProcessing] = useState(false);

  const isLoading = fetcher.state === "submitting";

  // 환불 사유 목록
  const refundReasons = [
    "서비스가 기대에 미치지 못함",
    "사용법이 어려움",
    "다른 서비스로 전환",
    "예상보다 높은 비용",
    "기술적 문제",
    "기타",
  ];

  // 구독 정보 계산
  const currentSubscription = React.useMemo(() => {
    if (!currentPlan) return null;

    const startDate = currentPlan.planHistory.startDate
      ? new Date(currentPlan.planHistory.startDate)
      : new Date();
    const now = new Date();
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const remainingDays = Math.max(
      0,
      Math.ceil(
        (nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // 구독 시작일로부터 경과한 일수 계산
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const totalDays = 30;
    const price = parseFloat(currentPlan.plan.price || "0");

    // 7일 이내면 전액 환불, 7일 이후면 일할 계산
    const refundableAmount =
      daysSinceStart <= 7
        ? price
        : Math.round((price * remainingDays) / totalDays);

    const canRefund = remainingDays > 0; // 환불 가능 여부

    return {
      plan: currentPlan.plan.name,
      status: currentPlan.planHistory.isActive ? "active" : "inactive",
      startDate: startDate.toISOString().split("T")[0],
      nextBillingDate: nextBillingDate.toISOString().split("T")[0],
      price,
      remainingDays,
      refundableAmount,
      canRefund,
    };
  }, [currentPlan]);

  const handleUpgrade = async (planId: number) => {
    // 선택한 플랜 정보 찾기
    const selectedPlan = plans.find((p) => p.id === planId);
    if (!selectedPlan) {
      toast.error("플랜 정보를 찾을 수 없습니다.");
      return;
    }

    const planPrice = parseFloat(selectedPlan.price || "0");

    // 무료 플랜이거나 가격이 0인 경우 바로 플랜 변경
    if (planPrice === 0 || selectedPlan.name === "Free") {
      const action = currentPlan ? "change" : "assign";

      fetcher.submit(
        {
          action,
          planId: planId.toString(),
        },
        {
          method: "POST",
        }
      );
      return;
    }

    // 유료 플랜인 경우 결제 프로세스 시작
    try {
      const formData = new FormData();
      formData.append("planId", planId.toString());

      const paymentResponse = await fetch("/api/payments?action=create", {
        method: "POST",
        body: formData,
      });

      const paymentResult = await paymentResponse.json();

      if (paymentResult.success && paymentResult.data) {
        // 결제 모달 열기
        setSelectedPaymentData({
          id: planId,
          name: selectedPlan.name,
          price: planPrice,
          orderId: paymentResult.data.orderId,
        });
        setPaymentModalOpen(true);
      } else {
        toast.error(paymentResult.message || "결제 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Payment creation error:", error);
      toast.error("결제 처리 중 오류가 발생했습니다.");
    }
  };

  const handleCancel = (planId: number) => {
    if (
      confirm(
        "정말로 구독을 취소하시겠습니까? 구독 취소 시 Free 플랜으로 변경됩니다."
      )
    ) {
      fetcher.submit(
        {
          action: "cancel",
          planId: planId.toString(),
        },
        {
          method: "POST",
        }
      );
    }
  };

  // 환불 요청 핸들러
  const handleRefundRequest = async () => {
    if (!refundReason) {
      toast.error("환불 사유를 선택해주세요");
      return;
    }

    if (!agreeToPolicy) {
      toast.error("환불 정책에 동의해주세요");
      return;
    }

    setIsRefundProcessing(true);

    try {
      const response = await fetch("/api/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refundReason,
          refundComment: refundComment || undefined,
        }),
      });

      const result = await response.json();

      setIsRefundProcessing(false);

      if (response.ok && result.success) {
        setRefundDialogOpen(false);
        toast.success(result.message || "환불 요청이 접수되었습니다", {
          description: "영업일 기준 3-5일 내에 처리됩니다",
        });

        // 폼 리셋
        setRefundReason("");
        setRefundComment("");
        setAgreeToPolicy(false);

        // 페이지 새로고침하여 플랜 상태 업데이트
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(result.error || "환불 요청에 실패했습니다");
      }
    } catch (error) {
      console.error("Refund request error:", error);
      setIsRefundProcessing(false);
      toast.error("환불 요청 중 오류가 발생했습니다");
    }
  };

  // fetcher 응답 처리
  React.useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message);
      } else {
        toast.error(fetcher.data.message || "플랜 변경에 실패했습니다.");
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* 결제 모달 */}
      {selectedPaymentData && (
        <PaymentWidget
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedPaymentData(null);
          }}
          planData={selectedPaymentData}
          customerData={{
            name: user?.name || "사용자",
            email: user?.email || "",
          }}
        />
      )}

      {/* Header */}
      <div className="text-center space-y-2">
        <h1>플랜 관리</h1>
        <p className="text-muted-foreground">
          귀하의 투자 목표에 맞는 플랜을 선택하세요
        </p>
      </div>

      {/* Current Subscription Info */}
      {currentSubscription && currentSubscription.price > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>구독 정보</CardTitle>
                <CardDescription>현재 구독 중인 플랜 정보</CardDescription>
              </div>
              {currentSubscription.status === "active" &&
                currentSubscription.canRefund && (
                  <Dialog
                    open={refundDialogOpen}
                    onOpenChange={setRefundDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        환불하기
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <RotateCcw className="w-5 h-5" />
                          플랜 환불 요청
                        </DialogTitle>
                        <DialogDescription>
                          환불 정책에 따라 처리됩니다
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        {/* Refund Amount */}
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              환불 예상 금액
                            </span>
                            <Badge variant="secondary">일할 계산</Badge>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl">
                              ₩
                              {currentSubscription.refundableAmount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            잔여 기간 {currentSubscription.remainingDays}일 기준
                          </p>
                        </div>

                        <Separator />

                        {/* Refund Reason */}
                        <div className="space-y-2">
                          <Label htmlFor="refund-reason">환불 사유 *</Label>
                          <Select
                            value={refundReason}
                            onValueChange={setRefundReason}
                          >
                            <SelectTrigger id="refund-reason">
                              <SelectValue placeholder="환불 사유를 선택해주세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {refundReasons.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Additional Comment */}
                        <div className="space-y-2">
                          <Label htmlFor="refund-comment">
                            추가 의견 (선택)
                          </Label>
                          <Textarea
                            id="refund-comment"
                            placeholder="서비스 개선을 위한 의견을 남겨주세요"
                            value={refundComment}
                            onChange={(e) => setRefundComment(e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        <Separator />

                        {/* Refund Policy Notice */}
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm text-muted-foreground">
                              <p className="font-medium text-foreground">
                                환불 정책 안내
                              </p>
                              <ul className="space-y-1 list-disc list-inside">
                                <li>
                                  환불 처리는 영업일 기준 3-5일 소요됩니다
                                </li>
                                <li>
                                  환불 승인 후 자동매매 기능이 즉시 중지됩니다
                                </li>
                                <li>
                                  진행 중인 거래는 강제 종료될 수 있습니다
                                </li>
                                <li>
                                  환불 후 재구독 시 프로모션이 적용되지 않을 수
                                  있습니다
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Agreement Checkbox */}
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="agree-policy"
                            checked={agreeToPolicy}
                            onCheckedChange={(checked) =>
                              setAgreeToPolicy(checked as boolean)
                            }
                          />
                          <Label
                            htmlFor="agree-policy"
                            className="text-sm cursor-pointer leading-tight"
                          >
                            위 환불 정책을 확인했으며, 환불 시 서비스 이용이
                            중지됨을 이해했습니다
                          </Label>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRefundDialogOpen(false)}
                          disabled={isRefundProcessing}
                        >
                          취소
                        </Button>
                        <Button
                          onClick={handleRefundRequest}
                          disabled={
                            isRefundProcessing ||
                            !refundReason ||
                            !agreeToPolicy
                          }
                          className="gap-2"
                        >
                          {isRefundProcessing ? (
                            <>처리 중...</>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4" />
                              환불 요청
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Subscription Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">현재 플랜</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-medium">{currentSubscription.plan}</p>
                      <Badge
                        variant={
                          currentSubscription.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {currentSubscription.status === "active"
                          ? "활성"
                          : "비활성"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <CreditCard className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      월 결제 금액
                    </p>
                    <p className="font-medium mt-1">
                      ₩{currentSubscription.price.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Calendar className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">구독 시작일</p>
                    <p className="font-medium mt-1">
                      {currentSubscription.startDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">다음 결제일</p>
                    <p className="font-medium mt-1">
                      {currentSubscription.nextBillingDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>현재 사용량</CardTitle>
          <CardDescription>이번 달 서비스 사용 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">
                {user?.totalSelfEntryCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">수동매매 거래</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">
                {user?.totalAutoEntryCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">자동매매 거래</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">
                {user?.totalAlarmCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                텔레그램 알림 횟수
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={{
              id: plan.id,
              name: plan.name,
              description: plan.description || undefined,
              price: plan.price || "0",
              period: plan.period || "월",
              features: plan.features || [],
              limitations: plan.limitations || [],
              popular: plan.isPopular || false,
            }}
            currentPlanId={currentPlan?.plan.id}
            currentPlanPrice={
              currentPlan?.plan.price
                ? parseFloat(currentPlan.plan.price)
                : undefined
            }
            onUpgrade={handleUpgrade}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>자주 묻는 질문</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">
              플랜은 언제든지 변경할 수 있나요?
            </h4>
            <p className="text-sm text-muted-foreground">
              네, 언제든지 상위 플랜으로 업그레이드할 수 있습니다.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-1">
              자동매매 중에 플랜을 변경하면 어떻게 되나요?
            </h4>
            <p className="text-sm text-muted-foreground">
              진행 중인 거래는 완료될 때까지 유지되며, 새로운 거래부터 변경된
              플랜이 적용됩니다.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-1">환불 정책이 어떻게 되나요?</h4>
            <p className="text-sm text-muted-foreground">
              구독 후 7일 이내에 취소하시면 전액 환불이 가능합니다. 환불은
              영업일 기준 3~5일 소요됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
