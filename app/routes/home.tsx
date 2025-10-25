import { useState, useEffect, useRef } from "react";
// import type { Route } from "./+types/home";
import { LoaderFunctionArgs, useNavigate } from "react-router";
import { useLoaderData } from "react-router";
import { Button } from "../components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Badge } from "../components/badge";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import monitoringSystemImage from "/home_realtime_monitor.png";
import kimp from "/kimp.png";
import { getAllPlans } from "../database/plan";

export async function loader({ context }: LoaderFunctionArgs) {
  const plans = await getAllPlans();

  return {
    plans,
  };
}

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const navigate = useNavigate();
  const { plans: dbPlans } = useLoaderData<typeof loader>();
  const testimonialIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const testimonials = [
    {
      text: "설정만 하면 자동으로 수익이 발생해요. 정말 놀랍습니다!",
      author: "김○○님",
      role: "직장인",
    },
    {
      text: "복잡한 김프거래를 알아서 해주니 시간이 절약되고 수익도 안정적이에요.",
      author: "박○○님",
      role: "사업자",
    },
    {
      text: "프리미엄 구독을 해서 쓰고 있는데, AI모드로 하는게 수익률이 좋더라구요, 매일 꾸준한 수익이 발생합니다.",
      author: "이○○님",
      role: "투자자",
    },
    {
      text: "처음에는 반신반의했는데, 실제로 매일 수익이 발생하니 신기해요. 이제는 필수 도구가 되었습니다.",
      author: "최○○님",
      role: "프리랜서",
    },
    {
      text: "24시간 모니터링하느라 힘들었는데, Karbit 덕분에 자면서도 수익이 나요!",
      author: "정○○님",
      role: "직장인",
    },
    {
      text: "다른 트레이딩 봇들도 써봤지만 Karbit이 가장 안정적이고 수익률도 높아요.",
      author: "강○○님",
      role: "전업투자자",
    },
    {
      text: "설정이 간단해서 초보자도 쉽게 시작할 수 있어요. 고객 지원도 친절합니다.",
      author: "윤○○님",
      role: "대학생",
    },
    {
      text: "김프 거래를 수동으로 하다가 Karbit으로 바꿨는데, 수익률이 2배 이상 올랐어요!",
      author: "한○○님",
      role: "개인투자자",
    },
    {
      text: "리스크 관리 기능이 훌륭해요. 손실을 최소화하면서 꾸준히 수익을 내고 있습니다.",
      author: "송○○님",
      role: "자영업자",
    },
    {
      text: "AI 모드가 정말 똑똑해요. 제가 생각하지 못한 타이밍에도 수익을 만들어줍니다.",
      author: "임○○님",
      role: "회사원",
    },
  ];

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const goToTestimonial = (index: number) => {
    setCurrentTestimonial(index);
  };

  // Auto-slide effect
  useEffect(() => {
    testimonialIntervalRef.current = setInterval(() => {
      nextTestimonial();
    }, 5000); // 5초마다 자동 슬라이드

    return () => {
      if (testimonialIntervalRef.current) {
        clearInterval(testimonialIntervalRef.current);
      }
    };
  }, []);

  // Reset interval when manually navigating
  const handleManualNavigation = (callback: () => void) => {
    if (testimonialIntervalRef.current) {
      clearInterval(testimonialIntervalRef.current);
    }
    callback();
    testimonialIntervalRef.current = setInterval(() => {
      nextTestimonial();
    }, 5000);
  };

  // DB에서 가져온 플랜 데이터를 UI에 맞게 변환
  const plans = dbPlans.map((plan) => ({
    name: plan.name,
    price:
      plan.name === "Free"
        ? "무료"
        : `${plan.period} ₩${Number(plan.price).toLocaleString()}`,
    description: plan.description || "",
    features: plan.features || [],
    cta:
      plan.name === "Free"
        ? "무료 시작"
        : plan.name === "Starter"
          ? "7일 무료체험"
          : "14일 무료체험",
    popular: plan.isPopular || false,
  }));

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
            <span className="rainbow-text">김치</span>{" "}
            <span className="rainbow-text">프리미엄</span>을<br />
            <span className="bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
              자동으로 수익화
            </span>
          </h1>

          <p className="mb-8 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            김치 프리미엄을 실시간으로 모니터링하고, <br />
            AI 기반 자동매매로 안정적인 수익을 창출하세요.
          </p>

          <div className="flex justify-center mb-12">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="gap-2 px-8 py-6 text-base lg:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-chart-1"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">
                2.43%
              </div>
              <div className="text-sm text-muted-foreground">
                평균 일일 수익률
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">500+</div>
              <div className="text-sm text-muted-foreground">활성 사용자</div>
            </div>
            <div className="text-center col-span-2 lg:col-span-1">
              <div className="text-2xl lg:text-3xl mb-2 text-primary">
                ₩1,270,000,000
              </div>
              <div className="text-sm text-muted-foreground">누적 거래량</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl mb-6 text-center">
              역사적 김치 프리미엄
            </h3>
            <h1 className="text-muted-foreground">
              반드시 오는 역사적인 대김프, 이번에도 놓치실 겁니까?
            </h1>
          </div>
        </div>

        <div className="flex justify-center">
          <img
            src={kimp}
            alt="역사적 김치 프리미엄"
            className="max-w-4xl w-full h-auto rounded-lg shadow-lg"
          />
        </div>
        <div className="max-w-5xl mx-auto mt-16">
          {/* 2021년 실제 사례 */}
          <div className="mb-12 p-8 bg-primary/5 rounded-xl border border-primary/20">
            <h3 className="text-2xl lg:text-3xl mb-6 text-center">
              2021년 1월~4월 대불장 실제 사례
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    비트코인 (BTC)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">최대 프리미엄</span>
                    <span className="text-xl text-accent">25%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">평균 프리미엄</span>
                    <span className="text-lg">12-15%</span>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">
                    사상 최고가 경신 시기, 1억원 투자 시 평균 1,200만원 차익
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-primary">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    도지코인 (DOGE)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">최대 프리미엄</span>
                    <span className="text-xl text-accent">40%+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">평균 프리미엄</span>
                    <span className="text-lg">20-30%</span>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">
                    일론 머스크 트윗 영향, 1억원 투자 시 평균 2,500만원 차익
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    이더리움 (ETH)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">최대 프리미엄</span>
                    <span className="text-xl text-accent">20%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">평균 프리미엄</span>
                    <span className="text-lg">10-15%</span>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">
                    NFT 붐과 함께 급등, 1억원 투자 시 평균 1,250만원 차익
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Monitoring System Section */}
      <section className="py-16 px-4 lg:px-6 bg-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl mb-6 text-center">
              실시간 김프 모니터링
            </h3>
            <h1 className="text-muted-foreground">
              24시간 수익의 기회를 놓치지 않고 잡아내는 자동화 시스템
            </h1>
          </div>

          <div className="flex justify-center">
            <img
              src={monitoringSystemImage}
              alt="실시간 김프 모니터링 시스템"
              className="max-w-4xl w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="text-accent text-2xl lg:text-3xl">최대 15%</div>
              <p className="text-base text-muted-foreground">
                역사적 최대 김치 프리미엄으로 단기간 고수익 기회 제공
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-accent text-2xl lg:text-3xl">2-5%</div>
              <p className="text-base text-muted-foreground">
                일반적인 프리미엄 범위로 안정적인 수익 창출 가능
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-accent text-2xl lg:text-3xl">24/7</div>
              <p className="text-base text-muted-foreground">
                암호화폐 시장은 연중무휴 운영되어 언제든 기회 포착
              </p>
            </div>
          </div>
          <p className="text-center mt-12 text-base lg:text-lg text-muted-foreground leading-relaxed">
            김치 프리미엄은 주기적으로 발생할 수 밖에 없으며
            <br />
            Karbit의 AI 시스템은 이러한 패턴을 학습하여 최적의 매매 타이밍을
            자동으로 포착합니다.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl mb-6 text-center">
              왜 Karbit을 선택해야 할까요?
            </h3>
            <h1 className="text-muted-foreground">
              전문적인 도구와 AI 기술로 안정적인 수익을 보장합니다
            </h1>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
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

            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
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

            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
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

            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>전문 도구</CardTitle>
                <CardDescription>
                  실시간 알트 환율 차트, 호가창 반영 실시간 환율 차트, 실시간
                  김프 수익률 관리 등 전문 투자자 수준의 도구를 제공합니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>커뮤니티 지원</CardTitle>
                <CardDescription>
                  암호화폐 전문가 팀이 설정부터 운영까지 전 과정을
                  지원해드립니다
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 pb-6">
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
      <section className="py-16 px-4 lg:px-6 bg-accent/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl mb-6 text-center">
              플랜을 선택하세요
            </h3>
            <h1 className="text-muted-foreground">
              필요에 맞는 플랜으로 시작하고 언제든 업그레이드하세요
            </h1>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
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
                <CardContent className="flex flex-col flex-grow space-y-4">
                  <ul className="space-y-2 flex-grow">
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
                    className="w-full mt-auto"
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

      {/* Social Proof - Testimonial Carousel */}
      <section className="py-16 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-8">아는 사람만 돈복사하고 있는 Karbit</h2>

          <div className="relative">
            {/* Carousel Container */}
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentTestimonial * 100}%)`,
                }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="min-w-full flex-shrink-0 px-4">
                    <Card className="max-w-2xl mx-auto">
                      <CardContent className="pt-6 pb-6 space-y-4">
                        <div className="flex justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-5 h-5 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                        <p className="text-base lg:text-lg italic">
                          "{testimonial.text}"
                        </p>
                        <p className="text-sm text-muted-foreground">
                          - {testimonial.author}, {testimonial.role}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={() => handleManualNavigation(prevTestimonial)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-background border rounded-full p-2 shadow-lg hover:bg-accent transition-colors"
              aria-label="이전 후기"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleManualNavigation(nextTestimonial)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-background border rounded-full p-2 shadow-lg hover:bg-accent transition-colors"
              aria-label="다음 후기"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handleManualNavigation(() => goToTestimonial(index))
                  }
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentTestimonial
                      ? "bg-primary w-8"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`${index + 1}번째 후기로 이동`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 lg:px-6 bg-gradient-to-r from-primary/10 to-chart-1/10">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl lg:text-3xl mb-6 text-center">
            지금 시작하세요
          </h3>
          <p className="mb-8 text-lg text-muted-foreground">
            김치 프리미엄으로 수익 창출할 기회를 놓치지 마세요.
            <br />
            지금 가입하고 7일 무료 체험을 시작하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="gap-2">
              <DollarSign className="w-5 h-5" />
              무료 체험 시작하기
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
