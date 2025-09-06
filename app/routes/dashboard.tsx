import React, { useState, useEffect } from "react";
import type { Route } from "./+types/dashboard";
import { useNavigate } from "react-router";
import { useUser, useIsLoading } from "~/stores";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import { Slider } from "../components/slider";
import { ScrollArea } from "../components/scroll-area";
// import { LightweightChart } from "./LightweightChart";
import { RefreshCw, TrendingUp, TrendingDown, Lock, Crown } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Karbit" },
    {
      name: "description",
      content: "Cryptocurrency arbitrage trading dashboard",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {
    message: "Dashboard data loaded successfully",
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const isLoading = useIsLoading();
  const [selectedCoin, setSelectedCoin] = useState("XRP");
  const [seedAmount, setSeedAmount] = useState([10000000]); // 1천만원 기본값

  // 인증 체크 및 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 사용자
  if (!user) {
    return null; // useEffect에서 리다이렉트 처리
  }
  const currentPlan = "Free"; // 현재 플랜 상태

  const formatKRW = (amount: number) => {
    return (amount / 10000).toFixed(0) + "만원";
  };

  // Mock data for chart - 더 많은 데이터 포인트와 실시간 느낌
  const getChartData = (coin: string) => {
    const baseData: { [key: string]: { time: string; value: number }[] } = {
      XRP: [
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
        { time: "2024-01-09 16:00", value: 1.038 },
        { time: "2024-01-09 20:00", value: 1.036 },
      ],
      BTC: [
        { time: "2024-01-08 00:00", value: 1.015 },
        { time: "2024-01-08 04:00", value: 1.012 },
        { time: "2024-01-08 08:00", value: 1.018 },
        { time: "2024-01-08 12:00", value: 1.021 },
        { time: "2024-01-08 16:00", value: 1.019 },
        { time: "2024-01-08 20:00", value: 1.022 },
        { time: "2024-01-09 00:00", value: 1.025 },
        { time: "2024-01-09 04:00", value: 1.023 },
        { time: "2024-01-09 08:00", value: 1.027 },
        { time: "2024-01-09 12:00", value: 1.029 },
        { time: "2024-01-09 16:00", value: 1.031 },
        { time: "2024-01-09 20:00", value: 1.033 },
      ],
      ETH: [
        { time: "2024-01-08 00:00", value: 1.021 },
        { time: "2024-01-08 04:00", value: 1.019 },
        { time: "2024-01-08 08:00", value: 1.024 },
        { time: "2024-01-08 12:00", value: 1.022 },
        { time: "2024-01-08 16:00", value: 1.026 },
        { time: "2024-01-08 20:00", value: 1.023 },
        { time: "2024-01-09 00:00", value: 1.028 },
        { time: "2024-01-09 04:00", value: 1.025 },
        { time: "2024-01-09 08:00", value: 1.03 },
        { time: "2024-01-09 12:00", value: 1.027 },
        { time: "2024-01-09 16:00", value: 1.032 },
        { time: "2024-01-09 20:00", value: 1.029 },
      ],
      ADA: [
        { time: "2024-01-08 00:00", value: 1.008 },
        { time: "2024-01-08 04:00", value: 1.011 },
        { time: "2024-01-08 08:00", value: 1.009 },
        { time: "2024-01-08 12:00", value: 1.013 },
        { time: "2024-01-08 16:00", value: 1.015 },
        { time: "2024-01-08 20:00", value: 1.012 },
        { time: "2024-01-09 00:00", value: 1.016 },
        { time: "2024-01-09 04:00", value: 1.014 },
        { time: "2024-01-09 08:00", value: 1.018 },
        { time: "2024-01-09 12:00", value: 1.02 },
        { time: "2024-01-09 16:00", value: 1.017 },
        { time: "2024-01-09 20:00", value: 1.021 },
      ],
    };
    return baseData[coin] || baseData["XRP"];
  };

  const chartData = getChartData(selectedCoin);

  // Mock data for exchange rates
  const exchangeData = [
    {
      coin: "XRP",
      krPrice: "₩1,380",
      globalPrice: "$0.98",
      premium: "+2.4%",
      volume: "₩24.5억",
      trend: "up",
    },
    {
      coin: "BTC",
      krPrice: "₩134,500,000",
      globalPrice: "$95,200",
      premium: "+1.8%",
      volume: "₩891억",
      trend: "up",
    },
    {
      coin: "ETH",
      krPrice: "₩4,520,000",
      globalPrice: "$3,180",
      premium: "+2.1%",
      volume: "₩245억",
      trend: "down",
    },
    {
      coin: "ADA",
      krPrice: "₩1,250",
      globalPrice: "$0.89",
      premium: "+1.5%",
      volume: "₩12.3억",
      trend: "up",
    },
  ];

  // Mock data for orderbook-based rates (시드금액에 따라 변경)
  const getOrderbookData = (seedAmount: number) => {
    const seedMultiplier = seedAmount / 10000000; // 1천만원 기준
    return [
      {
        coin: "XRP",
        krPrice: "₩1,380",
        globalPrice: "$0.98",
        premium: `+${(2.4 + seedMultiplier * 0.1).toFixed(1)}%`,
        estimatedProfit: `₩${Math.round(seedAmount * 0.024 * (1 + seedMultiplier * 0.1)).toLocaleString()}`,
        maxTradeSize: `₩${Math.round(seedAmount * 0.3).toLocaleString()}`,
        trend: "up",
      },
      {
        coin: "BTC",
        krPrice: "₩134,500,000",
        globalPrice: "$95,200",
        premium: `+${(1.8 + seedMultiplier * 0.08).toFixed(1)}%`,
        estimatedProfit: `₩${Math.round(seedAmount * 0.018 * (1 + seedMultiplier * 0.08)).toLocaleString()}`,
        maxTradeSize: `₩${Math.round(seedAmount * 0.4).toLocaleString()}`,
        trend: "up",
      },
      {
        coin: "ETH",
        krPrice: "₩4,520,000",
        globalPrice: "$3,180",
        premium: `+${(2.1 + seedMultiplier * 0.09).toFixed(1)}%`,
        estimatedProfit: `₩${Math.round(seedAmount * 0.021 * (1 + seedMultiplier * 0.09)).toLocaleString()}`,
        maxTradeSize: `₩${Math.round(seedAmount * 0.35).toLocaleString()}`,
        trend: "down",
      },
      {
        coin: "ADA",
        krPrice: "₩1,250",
        globalPrice: "$0.89",
        premium: `+${(1.5 + seedMultiplier * 0.07).toFixed(1)}%`,
        estimatedProfit: `₩${Math.round(seedAmount * 0.015 * (1 + seedMultiplier * 0.07)).toLocaleString()}`,
        maxTradeSize: `₩${Math.round(seedAmount * 0.25).toLocaleString()}`,
        trend: "up",
      },
    ];
  };

  const orderbookData = getOrderbookData(seedAmount[0]);
  const isLocked = currentPlan === "Free";

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1>김치 프리미엄 대시보드</h1>
          <p className="text-muted-foreground">
            {user.name ? `${user.name}님, ` : ""}실시간 환율 모니터링 및
            자동매매 현황
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">평균 프리미엄</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">+2.1%</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3" />
              +0.3%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">활성 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">0</div>
            <div className="text-xs text-muted-foreground">비활성화</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일일 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">₩0</div>
            <div className="text-xs text-muted-foreground">연동 필요</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">총 자산</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">-</div>
            <div className="text-xs text-muted-foreground">연동 후 확인</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>실시간 환율 차트</CardTitle>
              <CardDescription>
                선택한 코인의 김치 프리미엄 변화
              </CardDescription>
            </div>
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XRP">XRP</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="ADA">ADA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            {/* <LightweightChart data={chartData} height={320} width="100%" /> */}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rate Table */}
      <Card>
        <CardHeader>
          <CardTitle>실시간 환율 테이블</CardTitle>
          <CardDescription>거래소별 가격 비교 및 프리미엄 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>코인</TableHead>
                  <TableHead>국내 가격</TableHead>
                  <TableHead>해외 가격</TableHead>
                  <TableHead>프리미엄</TableHead>
                  <TableHead>거래량</TableHead>
                  <TableHead>추세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeData.map((item) => (
                  <TableRow key={item.coin}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                          {item.coin[0]}
                        </div>
                        <span className="font-medium">{item.coin}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.krPrice}
                    </TableCell>
                    <TableCell>{item.globalPrice}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-green-600">
                        {item.premium}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.volume}
                    </TableCell>
                    <TableCell>
                      {item.trend === "up" ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Orderbook-based Exchange Rate Table */}
      <Card className="relative">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                호가창 반영 실시간 환율
                {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                {!isLocked && <Crown className="w-4 h-4 text-yellow-500" />}
              </CardTitle>
              <CardDescription>
                시드금액 기반 실제 거래 가능한 환율 및 예상 수익
              </CardDescription>
            </div>
            {isLocked && (
              <Badge variant="outline" className="gap-1">
                <Crown className="w-3 h-3" />
                Starter 이상 필요
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seed Amount Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">시드 금액</label>
              <span className="text-sm text-muted-foreground">
                {formatKRW(seedAmount[0])}
              </span>
            </div>
            <Slider
              value={seedAmount}
              onValueChange={setSeedAmount}
              max={100000000} // 1억
              min={1000000} // 100만
              step={1000000} // 100만 단위
              className="w-full"
              disabled={isLocked}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100만원</span>
              <span>1억원</span>
            </div>
          </div>

          {/* Blurred Table Overlay */}
          <div className={`relative ${isLocked ? "" : ""}`}>
            {isLocked && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center space-y-2 p-4 lg:p-6 bg-background/80 rounded-lg border mx-4">
                  <Lock className="w-6 h-6 lg:w-8 lg:h-8 mx-auto text-muted-foreground" />
                  <h3 className="font-medium text-sm lg:text-base">
                    Starter 플랜이 필요합니다
                  </h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    호가창 기반 실시간 환율을 확인하려면 플랜을 업그레이드하세요
                  </p>
                  <Button size="sm" className="mt-2 text-white">
                    플랜 업그레이드
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="w-full overflow-x-auto">
              <Table className={`min-w-[700px] ${isLocked ? "blur-sm" : ""}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>코인</TableHead>
                    <TableHead>국내 가격</TableHead>
                    <TableHead>해외 가격</TableHead>
                    <TableHead>프리미엄</TableHead>
                    <TableHead>예상 수익</TableHead>
                    <TableHead>최대 거래량</TableHead>
                    <TableHead>추세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderbookData.map((item) => (
                    <TableRow key={`orderbook-${item.coin}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs">
                            {item.coin[0]}
                          </div>
                          <span className="font-medium">{item.coin}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.krPrice}
                      </TableCell>
                      <TableCell>{item.globalPrice}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-green-600">
                          {item.premium}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {item.estimatedProfit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.maxTradeSize}
                      </TableCell>
                      <TableCell>
                        {item.trend === "up" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Additional Info */}
          {!isLocked && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                • 예상 수익은 현재 호가창 기준으로 계산된 이론적 수익입니다.
              </p>
              <p>• 실제 거래시 슬리피지와 수수료가 발생할 수 있습니다.</p>
              <p>• 최대 거래량은 설정된 시드금액의 일정 비율로 제한됩니다.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
