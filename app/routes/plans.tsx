import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Check, Crown, Zap } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period: string;
  current?: boolean;
  popular?: boolean;
  features: string[];
  limitations: string[];
}

interface PlanCardProps {
  plan: Plan;
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

export async function loader() {
  return {
    message: "Plan management data loaded successfully",
  };
}

export default function PlanManagement() {
  const plans: Plan[] = [
    {
      name: "Free",
      price: "₩0",
      period: "영구 무료",
      current: true,
      features: [
        "실시간 환율 차트",
        "환율 테이블 조회",
        "XRP 기본 모니터링",
        "기본 알림",
      ],
      limitations: ["자동매매 불가능", "API 연동 불가", "고급 차트 기능 제한"],
    },
    {
      name: "Starter",
      price: "₩29,000",
      period: "월",
      popular: true,
      features: [
        "Free 플랜 모든 기능",
        "거래소 API 연동",
        "자동매매 기본 전략",
        "시드 설정 (최대 5천만원)",
        "실시간 거래 모니터링",
        "기본 성과 리포트",
        "이메일 알림",
      ],
      limitations: [
        "AI 전략 사용 불가",
        "백테스트 기능 제한",
        "다계정 운용 불가",
      ],
    },
    {
      name: "Premium",
      price: "₩99,000",
      period: "월",
      features: [
        "Starter 플랜 모든 기능",
        "AI 기반 전략 추천",
        "무제한 시드 설정",
        "고급 백테스트",
        "포트폴리오 리밸런싱",
        "웹훅 & 텔레그램 알림",
        "다계정 전략 운용",
        "실시간 AI 시세 예측",
        "우선 고객 지원",
      ],
      limitations: [],
    },
  ];

  const PlanCard = ({ plan }: PlanCardProps) => (
    <Card className={`relative ${plan.popular ? "border-primary" : ""} h-full`}>
      {plan.popular && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-white">
          추천
        </Badge>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            {plan.name === "Premium" && (
              <Crown className="w-5 h-5 text-yellow-500" />
            )}
            {plan.name === "Starter" && (
              <Zap className="w-5 h-5 text-blue-500" />
            )}
            {plan.name}
          </CardTitle>
          {plan.current && <Badge variant="secondary">현재 플랜</Badge>}
        </div>
        <div className="space-y-1">
          <div className="text-2xl lg:text-3xl font-bold">{plan.price}</div>
          <div className="text-sm text-muted-foreground">{plan.period}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1">
        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">포함 기능</h4>
          <ul className="space-y-1">
            {plan.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

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
        <div className="pt-4">
          <Button
            className={`w-full ${plan.popular ? "text-white" : ""}`}
            variant={
              plan.current ? "outline" : plan.popular ? "default" : "outline"
            }
            disabled={plan.current}
          >
            {plan.current ? "현재 플랜" : `${plan.name}으로 업그레이드`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
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
          <PlanCard key={plan.name} plan={plan} />
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
