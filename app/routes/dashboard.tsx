import React, { useState, useEffect, useMemo } from "react";
import type { Route } from "./+types/dashboard";
import { useNavigate, useLoaderData } from "react-router";
import { useUser, useIsLoading } from "~/stores";
import { validateSession } from "~/database/session";
import { getUserActivePositions } from "~/database/position";
import { getAuthTokenFromRequest } from "~/utils/cookies";
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
import { PremiumTicker } from "../components/premium-ticker";
import { getUserActiveStrategy } from "~/database/strategy";
import { getUserCurrentPlan } from "~/database/plan";
import { ActivePositionManagement } from "~/components/active-position-management";
import CompChart from "~/components/chart/CompChart";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Karbit" },
    {
      name: "description",
      content: "Cryptocurrency arbitrage trading dashboard",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = getAuthTokenFromRequest(request);

  if (!token) {
    return {
      activePositions: [],
      activePositionCount: 0,
      message: "Authentication required",
    };
  }

  const user = await validateSession(token);

  if (!user) {
    return {
      activePositions: [],
      activePositionCount: 0,
      message: "Authentication required",
    };
  }

  try {
    // 사용자의 활성 포지션 조회
    const activePositions = await getUserActivePositions(user.id);
    const activePositionCount = activePositions.length;

    // 사용자의 플랜 조회
    const activePlan = await getUserCurrentPlan(user.id);
    console.log("Active Plan:", activePlan);
    return {
      activePositions,
      activePositionCount,
      activePlan,
      message: "Dashboard data loaded successfully",
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      activePositions: [],
      activePositionCount: 0,
      message: "Error loading dashboard data",
    };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const isLoading = useIsLoading();
  const {
    activePositions: rawActivePositions,
    activePositionCount: initialActivePositionCount,
    activePlan,
  } = useLoaderData<typeof loader>();

  const [selectedCoin, setSelectedCoin] = useState("XRP");
  const [seedAmount, setSeedAmount] = useState([10000000]); // 1천만원 기본값

  // rawActivePositions를 올바른 형태로 변환
  const activePositions = useMemo(() => {
    if (!rawActivePositions || !Array.isArray(rawActivePositions)) {
      return [];
    }
    return rawActivePositions.map((position: any) => ({
      coinSymbol: position.coin_symbol,
      krExchange: position.kr_exchange,
      frExchange: position.fr_exchange,
      leverage: position.leverage,
      entryRate: position.avg_entry_rate,
      amount: position.total_amount,
      currentProfit: position.current_profit || 0,
      profitRate: position.profit_rate || 0,
    }));
  }, [rawActivePositions]);

  const [activePositionCount, setActivePositionCount] = useState(
    initialActivePositionCount
  );

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
  const currentPlan = activePlan; // 현재 플랜 상태

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
  const isLocked = currentPlan?.plan.name === "Free";

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
            <CardTitle className="text-sm">활성 포지션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">{activePositionCount}</div>
            <div className="text-xs text-muted-foreground">
              {activePositionCount > 0 ? "진행중" : "비활성화"}
            </div>
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

      {/* Live Kimchi Premium Ticker */}
      <PremiumTicker isLocked={isLocked} />

      {/* Active Positions */}
      {activePositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>활성 포지션</CardTitle>
            <CardDescription>현재 진행 중인 차익거래 포지션</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>코인</TableHead>
                    <TableHead>한국 거래소</TableHead>
                    <TableHead>해외 거래소</TableHead>
                    <TableHead>레버리지</TableHead>
                    <TableHead>진입가격</TableHead>
                    <TableHead>수량</TableHead>
                    <TableHead>현재손익</TableHead>
                    <TableHead>수익률</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePositions.map((position, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {position.coinSymbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.krExchange}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.frExchange}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{position.leverage}x</Badge>
                      </TableCell>
                      <TableCell>
                        ₩{Number(position.entryRate).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {Number(position.amount).toLocaleString()}{" "}
                        {position.coinSymbol}
                      </TableCell>
                      <TableCell>
                        <div
                          className={`flex items-center gap-1 ${
                            position.currentProfit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {position.currentProfit >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          ₩{Math.abs(position.currentProfit).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`font-medium ${
                            position.profitRate >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {position.profitRate > 0 ? "+" : ""}
                          {position.profitRate.toFixed(2)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
