import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Separator } from "../components/separator";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  StopCircle,
} from "lucide-react";
import { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    message: "trade explain page loader",
  };
}

export default function TradingExplainer() {
  const [isEntryAnimating, setIsEntryAnimating] = useState(false);
  const [isExitAnimating, setIsExitAnimating] = useState(false);
  const [step, setStep] = useState(0); // 0: initial, 1: entry started, 2: entry complete, 3: exit complete

  const startEntryAnimation = () => {
    setIsEntryAnimating(true);
    setStep(1);

    // Complete entry animation
    setTimeout(() => {
      setStep(2);
      setIsEntryAnimating(false);
    }, 1600);
  };

  const startExitAnimation = () => {
    setIsExitAnimating(true);

    // Complete exit animation
    setTimeout(() => {
      setStep(3);
      setIsExitAnimating(false);
    }, 1600);
  };

  const reset = () => {
    setIsEntryAnimating(false);
    setIsExitAnimating(false);
    setStep(0);
  };

  // Initial values (before position entry)
  const initialKoreanPrice = 160000000; // 1억 6천만원
  const initialGlobalPrice = 110000; // $110,000

  // Entry values
  const entryExchangeRate = 1454;
  const entryGlobalPriceKRW = initialGlobalPrice * entryExchangeRate; // 159,940,000원
  const entryPremium = 3; // 3%

  // Exit values (position close)
  const exitKoreanPrice = 158000000; // 1억 5천8백만원
  const exitGlobalPrice = 100000; // $100,000
  const exitExchangeRate = 1580;
  const exitGlobalPriceKRW = exitGlobalPrice * exitExchangeRate; // 158,000,000원
  const exitPremium = 8; // 8%
  const finalProfitRate = 5; // 5%

  // Calculate profit
  const entryDiff = initialKoreanPrice - entryGlobalPriceKRW; // 진입시 차이
  const exitDiff = exitKoreanPrice - exitGlobalPriceKRW; // 종료시 차이
  const totalProfit = (initialKoreanPrice * finalProfitRate) / 100;
  const profit = Math.abs(totalProfit);

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          <h1 className="text-2xl">김치 프리미엄 차익거래 이해하기</h1>
        </div>
        <p className="text-muted-foreground">
          애니메이션으로 쉽게 배우는 동시 포지션 진입 전략
        </p>
      </div>

      {/* Main Animation Area */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>동시 포지션 진입 시뮬레이션</CardTitle>
          <CardDescription>
            버튼을 클릭하여 한국과 해외 거래소에서 동시에 포지션을 진입하는
            과정을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 lg:p-8">
          <div className="relative">
            {/* Trading Platforms */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              {/* Korean Exchange */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-2 border-green-500/30 bg-green-500/5">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">🇰🇷 한국 거래소</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          업비트, 빗썸
                        </p>
                        <div className="space-y-2">
                          <div className="text-2xl">
                            {initialKoreanPrice.toLocaleString()}원
                          </div>
                          <Badge
                            variant="outline"
                            className="text-green-500 border-green-500"
                          >
                            프리미엄 +{entryPremium}%
                          </Badge>
                        </div>
                      </div>

                      {/* Action Indicator */}
                      <AnimatePresence>
                        {step >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="p-4 rounded-lg bg-green-500/20 border border-green-500/50"
                          >
                            <ArrowUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <div className="font-bold text-green-500">
                              매수 (Long)
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              비트코인 매수
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Center Button */}
              <div className="flex flex-col items-center justify-center gap-4 relative">
                {/* Connecting Lines Animation */}
                <AnimatePresence>
                  {step >= 1 && (
                    <>
                      {/* Line to Korean Exchange */}
                      <motion.div
                        className="hidden lg:block absolute left-0 top-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-green-500/50 to-green-500"
                        initial={{ scaleX: 0, originX: 1 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                      {/* Line to Global Exchange */}
                      <motion.div
                        className="hidden lg:block absolute right-0 top-1/2 w-1/2 h-1 bg-gradient-to-l from-transparent via-red-500/50 to-red-500"
                        initial={{ scaleX: 0, originX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </>
                  )}
                </AnimatePresence>

                <motion.div
                  whileHover={{ scale: isEntryAnimating ? 1 : 1.05 }}
                  whileTap={{ scale: isEntryAnimating ? 1 : 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={startEntryAnimation}
                    disabled={isEntryAnimating}
                    className="h-24 w-24 lg:h-32 lg:w-32 rounded-full text-lg relative overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {!isEntryAnimating ? (
                        <motion.div
                          key="start"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <Zap className="w-8 h-8" />
                          <span className="text-sm">
                            포지션
                            <br />
                            진입
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="animating"
                          initial={{ opacity: 0, rotate: 0 }}
                          animate={{ opacity: 1, rotate: 360 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            rotate: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            },
                          }}
                        >
                          <RefreshCw className="w-8 h-8" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>

                <AnimatePresence>
                  {step >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <Badge
                        variant="default"
                        className="bg-accent text-white text-sm px-4 py-2"
                      >
                        동시 진입 완료
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Global Exchange */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="border-2 border-red-500/30 bg-red-500/5">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-red-500" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold mb-1">🌎 해외 거래소</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          바이낸스, 코인베이스
                        </p>
                        <div className="space-y-2">
                          <div className="text-2xl">
                            ${initialGlobalPrice.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ≈ {entryGlobalPriceKRW.toLocaleString()}원
                          </div>
                        </div>
                      </div>

                      {/* Action Indicator */}
                      <AnimatePresence>
                        {step >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{
                              type: "spring",
                              bounce: 0.5,
                              delay: 0.1,
                            }}
                            className="p-4 rounded-lg bg-red-500/20 border border-red-500/50"
                          >
                            <ArrowDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <div className="font-bold text-red-500">
                              매도 (Short)
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              비트코인 매도
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Mobile Connecting Animation */}
            <AnimatePresence>
              {step >= 1 && (
                <div className="lg:hidden my-6 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.6 }}
                      className="w-1 h-12 bg-gradient-to-b from-green-500 to-primary"
                    />
                    <ArrowDown className="w-6 h-6 text-primary" />
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="w-1 h-12 bg-gradient-to-b from-primary to-red-500"
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Entry Information */}
            <AnimatePresence>
              {step >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className="mt-8"
                >
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                          <h3 className="font-bold">포지션 진입 완료</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="p-3 rounded-lg bg-background/50">
                            <div className="text-muted-foreground mb-1">
                              진입 환율
                            </div>
                            <div className="text-lg">
                              {entryExchangeRate.toLocaleString()}원
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50">
                            <div className="text-muted-foreground mb-1">
                              진입 김프
                            </div>
                            <div className="text-lg text-green-500">
                              +{entryPremium}%
                            </div>
                          </div>
                        </div>

                        {step < 3 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="pt-4 space-y-3"
                          >
                            <Separator />
                            <h4 className="font-medium">
                              포지션 종료 시점 가격
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="p-3 rounded-lg bg-background/70 border border-border">
                                <div className="text-muted-foreground mb-1">
                                  한국 매수가
                                </div>
                                <div className="text-base text-green-500">
                                  {exitKoreanPrice.toLocaleString()}원
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-background/70 border border-border">
                                <div className="text-muted-foreground mb-1">
                                  해외 매도가
                                </div>
                                <div className="text-base text-red-500">
                                  ${exitGlobalPrice.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  ≈ {exitGlobalPriceKRW.toLocaleString()}원
                                </div>
                              </div>
                            </div>

                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Button
                                size="lg"
                                onClick={startExitAnimation}
                                disabled={isExitAnimating}
                                className="w-full gap-2"
                              >
                                {isExitAnimating ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    처리 중...
                                  </>
                                ) : (
                                  <>
                                    <StopCircle className="w-4 h-4" />
                                    포지션 종료
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exit Result */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className="mt-8"
                >
                  <Card className="border-accent/50 bg-accent/10">
                    <CardContent className="p-6">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <DollarSign className="w-6 h-6 text-accent" />
                          <h3 className="font-bold">포지션 종료 완료</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="p-3 rounded-lg bg-background/50">
                            <div className="text-muted-foreground mb-1">
                              종료 환율
                            </div>
                            <div className="text-lg">
                              {exitExchangeRate.toLocaleString()}원
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50">
                            <div className="text-muted-foreground mb-1">
                              종료 김프
                            </div>
                            <div className="text-lg text-green-500">
                              +{exitPremium}%
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-background/50">
                            <div className="text-muted-foreground mb-1">
                              최종 수익률
                            </div>
                            <div className="text-lg text-accent font-bold">
                              +{finalProfitRate}%
                            </div>
                          </div>
                        </div>

                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: [0.8, 1.1, 1] }}
                          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                          className="p-6 rounded-lg bg-accent/20 border-2 border-accent"
                        >
                          <div className="text-accent mb-2">총 차익</div>
                          <div className="text-3xl text-accent">
                            +{profit.toLocaleString()}원
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            (초기 투자금 {initialKoreanPrice.toLocaleString()}원
                            기준)
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="flex flex-col sm:flex-row items-center justify-center gap-2 text-green-500"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>차익거래 시뮬레이션 완료</span>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset Button */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-6"
                >
                  <Button onClick={reset} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    다시 보기
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>동시 포지션 진입이란?</CardTitle>
          <CardDescription>김치 프리미엄 차익거래의 핵심 전략</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                step: 1,
                icon: TrendingUp,
                color: "text-green-500",
                title: "한국 거래소에서 매수",
                description:
                  "프리미엄이 붙은 한국 거래소에서 비트코인을 매수합니다.",
              },
              {
                step: 2,
                icon: TrendingDown,
                color: "text-red-500",
                title: "해외 거래소에서 매도",
                description:
                  "동시에 해외 거래소에서 같은 수량의 비트코인을 매도(공매도)합니다.",
              },
              {
                step: 3,
                icon: Zap,
                color: "text-accent",
                title: "동시 진입으로 리스크 최소화",
                description:
                  "양쪽에서 동시에 포지션을 취하므로 가격 변동 리스크를 헷지할 수 있습니다.",
              },
              {
                step: 4,
                icon: DollarSign,
                color: "text-yellow-500",
                title: "가격 차이만큼 차익 실현",
                description:
                  "두 거래소의 가격 차이(프리미엄)만큼 안정적인 수익을 얻을 수 있습니다.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${item.color}`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Step {item.step}
                    </Badge>
                    <h4 className="font-medium">{item.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Warning */}
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-orange-500">주의사항</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • 실제 거래시 거래소 수수료, 네트워크 수수료, 슬리피지 등을
                  고려해야 합니다
                </li>
                <li>
                  • 김치 프리미엄은 실시간으로 변동하므로 빠른 체결이 중요합니다
                </li>
                <li>• 자금 이동 시간 동안의 가격 변동 리스크가 존재합니다</li>
                <li>
                  • Karbit의 자동매매 시스템은 이러한 리스크를 최소화하도록
                  설계되었습니다
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
