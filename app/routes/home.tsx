import React, { useState } from "react";
import type { Route } from "./+types/home";
import { useNavigate } from "react-router";
import { Button } from "../components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Badge } from "../components/badge";
// import { LightweightChart } from "../LightweightChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import { ScrollArea } from "../components/scroll-area";
import {
  TrendingUp,
  Bot,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  DollarSign,
  Crown,
} from "lucide-react";

export async function loader({ context }: Route.LoaderArgs) {
  return {
    message: "Home page loaded successfully",
  };
}

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/dashboard");
  };

  // Mock real-time data for preview
  const chartData = [
    { time: "2024-01-08 00:00", value: 1.02 },
    { time: "2024-01-08 04:00", value: 1.018 },
    { time: "2024-01-08 08:00", value: 1.025 },
    { time: "2024-01-08 12:00", value: 1.022 },
    { time: "2024-01-08 16:00", value: 1.028 },
    { time: "2024-01-08 20:00", value: 1.024 },
    { time: "2024-01-09 00:00", value: 1.031 },
    { time: "2024-01-09 04:00", value: 1.029 },
    { time: "2024-01-09 08:00", value: 1.035 },
    { time: "2024-01-09 12:00", value: 1.032 },
  ];

  const liveData = [
    {
      coin: "XRP",
      krPrice: "₩1,380",
      globalPrice: "$0.98",
      premium: "+2.4%",
      profit: "₩240,000",
    },
    {
      coin: "BTC",
      krPrice: "₩134,500,000",
      globalPrice: "$95,200",
      premium: "+1.8%",
      profit: "₩180,000",
    },
    {
      coin: "ETH",
      krPrice: "₩4,520,000",
      globalPrice: "$3,180",
      premium: "+2.1%",
      profit: "₩210,000",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "무료",
      description: "김치 프리미엄 모니터링",
      features: [
        "실시간 환율 차트",
        "기본 프리미엄 테이블",
        "시장 동향 알림",
        "웹 접근",
      ],
      cta: "무료 시작",
      popular: false,
    },
    {
      name: "Starter",
      price: "월 ₩99,000",
      description: "자동매매 + 고급 분석",
      features: [
        "Free 플랜 모든 기능",
        "거래소 API 연동",
        "자동매매 시스템",
        "호가창 반영 실시간 환율",
        "시드 설정 (최대 1억원)",
        "수익률 분석 리포트",
      ],
      cta: "7일 무료체험",
      popular: true,
    },
    {
      name: "Premium",
      price: "월 ₩199,000",
      description: "AI 전략 + 전문 도구",
      features: [
        "Starter 플랜 모든 기능",
        "AI 기반 전략 추천",
        "고급 백테스팅",
        "리스크 관리 도구",
        "전용 고객지원",
        "API 접근 권한",
      ],
      cta: "14일 무료체험",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 lg:px-6 bg-gradient-to-br from-background via-accent/20 to-secondary/30">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 gap-2">
            <TrendingUp className="w-4 h-4" />
            김치 프리미엄 자동매매 1위
          </Badge>

          <h1 className="mb-6 text-4xl lg:text-6xl">
            <span className="text-primary">김치 프리미엄</span>을<br />
            <span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              자동으로 수익화
            </span>
          </h1>

          <p className="mb-8 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            한국과 해외 거래소 간 가격차를 실시간으로 모니터링하고, AI 기반
            자동매매로 안정적인 수익을 창출하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="gap-2 text-white"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg">
              실시간 데모 보기
            </Button>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">
                99.9%
              </div>
              <div className="text-sm text-muted-foreground">시스템 가동률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">2.4%</div>
              <div className="text-sm text-muted-foreground">
                평균 일일 수익률
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">
                10,000+
              </div>
              <div className="text-sm text-muted-foreground">활성 사용자</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">
                ₩50억+
              </div>
              <div className="text-sm text-muted-foreground">누적 거래량</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Data Preview */}
      <section className="py-16 px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-4">실시간 김치 프리미엄 현황</h2>
            <p className="text-muted-foreground">
              지금 이 순간에도 수익 기회가 발생하고 있습니다
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Chart Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  실시간 프리미엄 차트
                </CardTitle>
                <CardDescription>XRP 김치 프리미엄 24시간 변화</CardDescription>
              </CardHeader>
              <CardContent>
                {/* <LightweightChart data={chartData} height={280} /> */}
              </CardContent>
            </Card>

            {/* Live Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  수익 기회 LIVE
                </CardTitle>
                <CardDescription>1천만원 기준 예상 일일 수익</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm">
                          {item.coin[0]}
                        </div>
                        <div>
                          <div className="font-medium">{item.coin}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.krPrice} / {item.globalPrice}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-600 font-medium">
                          {item.premium}
                        </div>
                        <div className="font-medium text-green-600">
                          {item.profit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  * 실제 수익은 시장 상황에 따라 달라질 수 있습니다
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 lg:px-6 bg-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-4">왜 Karbit을 선택해야 할까요?</h2>
            <p className="text-muted-foreground">
              전문적인 도구와 AI 기술로 안정적인 수익을 보장합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI 자동매매</CardTitle>
                <CardDescription>
                  머신러닝 알고리즘이 24시간 시장을 분석하여 최적의 매매
                  타이밍을 찾아냅니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>안전한 거래</CardTitle>
                <CardDescription>
                  은행 수준의 보안과 리스크 관리 시스템으로 자산을 안전하게
                  보호합니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>실시간 분석</CardTitle>
                <CardDescription>
                  실시간 호가창 데이터를 분석하여 실제 거래 가능한 프리미엄을
                  제공합니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>전문 도구</CardTitle>
                <CardDescription>
                  백테스팅, 포트폴리오 분석, 리스크 관리 등 전문 투자자 수준의
                  도구를 제공합니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>전용 지원</CardTitle>
                <CardDescription>
                  암호화폐 전문가 팀이 설정부터 운영까지 전 과정을
                  지원해드립니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>빠른 실행</CardTitle>
                <CardDescription>
                  밀리초 단위의 빠른 주문 실행으로 최적의 가격에 거래할 수
                  있습니다
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-4">플랜을 선택하세요</h2>
            <p className="text-muted-foreground">
              필요에 맞는 플랜으로 시작하고 언제든 업그레이드하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 text-white">
                    <Star className="w-3 h-3" />
                    인기
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.name === "Premium" && (
                      <Crown className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-2xl mb-2">{plan.price}</div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "text-white" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleGetStarted}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8 text-sm text-muted-foreground">
            모든 플랜은 언제든 취소 가능하며, 무료 체험 기간 중 과금이 발생하지
            않습니다.
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-4 lg:px-6 bg-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-8">10,000명 이상의 투자자가 선택한 Karbit</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="space-y-2">
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm italic">
                "설정만 하면 자동으로 수익이 발생해요. 정말 놀랍습니다!"
              </p>
              <p className="text-xs text-muted-foreground">- 김○○님, 직장인</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm italic">
                "복잡한 차익거래를 알아서 해주니 시간이 절약되고 수익도
                안정적이에요."
              </p>
              <p className="text-xs text-muted-foreground">- 박○○님, 사업자</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm italic">
                "AI 분석이 정말 정확해요. 매일 꾸준한 수익이 발생합니다."
              </p>
              <p className="text-xs text-muted-foreground">- 이○○님, 투자자</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 lg:px-6 bg-gradient-to-r from-primary/10 to-chart-1/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="mb-4">지금 시작하세요</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            김치 프리미엄으로 수익을 창출할 기회를 놓치지 마세요.
            <br />
            지금 가입하고 7일 무료 체험을 시작하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="gap-2 text-white"
            >
              <DollarSign className="w-5 h-5" />
              무료 체험 시작하기
            </Button>
            <Button variant="outline" size="lg">
              더 자세히 알아보기
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            신용카드 등록 불필요 • 언제든 취소 가능
          </p>
        </div>
      </section>
    </div>
  );
}
