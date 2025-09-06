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
import { Check, Crown, Zap, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/dialog";

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
  onUpgrade,
  onCancel,
  isLoading,
}) => {
  const isCurrent = currentPlanId === plan.id;
  const isPopular = plan.popular || plan.name === "Starter"; // Starter 플랜을 인기 플랜으로 설정
  const isPaidPlan = parseFloat(plan.price || "0") > 0 && plan.name !== "Free";

  const getButtonText = () => {
    if (isLoading) return "처리 중...";
    if (isCurrent) {
      return isPaidPlan ? "구독 취소" : "현재 플랜";
    }
    return `${plan.name}으로 업그레이드`;
  };

  const getButtonVariant = () => {
    if (isCurrent && isPaidPlan) return "destructive";
    if (isCurrent) return "outline";
    return isPopular ? "default" : "outline";
  };

  const handleButtonClick = () => {
    if (isCurrent && isPaidPlan) {
      onCancel(plan.id);
    } else {
      onUpgrade(plan.id);
    }
  };

  return (
    <Card
      className={`relative ${isPopular ? "border-primary" : ""} h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 cursor-pointer group`}
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
          {isCurrent && <Badge variant="secondary">현재 플랜</Badge>}
        </div>
        <div className="space-y-1">
          <div className="text-2xl lg:text-3xl font-bold group-hover:text-primary transition-colors duration-200">
            ₩{plan.price}
          </div>
          <div className="text-sm text-muted-foreground">
            {plan.period || "월"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
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

        {/* Action Button */}
        {(plan.name !== "Free" || isCurrent) && (
          <div className="pt-4">
            <Button
              className={`w-full ${isPopular ? "text-white" : ""} group-hover:shadow-md transition-all duration-200`}
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
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>결제하기</DialogTitle>
          <DialogDescription>
            {planData.name} 플랜을 구독합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 주문 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">플랜</span>
              <span className="text-sm">{planData.name}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium">결제 금액</span>
              <span className="text-lg font-bold">
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
            <h4 className="text-sm font-medium mb-3">이용약관</h4>
            <div className="border rounded-md">
              <div className="max-h-40 overflow-y-auto p-3 text-xs leading-relaxed bg-gray-50 rounded-t-md">
                {termsText.split("\n").map((line, index) => (
                  <div key={index} className={line.trim() === "" ? "h-2" : ""}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm">
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
            className="w-full text-white"
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

  const isLoading = fetcher.state === "submitting";

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

      {/* Current Usage */}
      <Card>
        <CardHeader>
          <CardTitle>현재 사용량</CardTitle>
          <CardDescription>이번 달 서비스 사용 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">자동매매 거래</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">API 호출</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-xl lg:text-2xl font-bold">∞</div>
              <div className="text-sm text-muted-foreground">차트 조회</div>
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
              네, 언제든지 상위 플랜으로 업그레이드하거나 하위 플랜으로
              다운그레이드할 수 있습니다.
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
              구독 후 7일 이내에 취소하시면 전액 환불이 가능합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
