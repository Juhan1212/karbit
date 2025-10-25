import { useState } from "react";
import { LoaderFunctionArgs, useLoaderData } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { ScrollArea } from "../components/scroll-area";
import { Avatar, AvatarFallback } from "../components/avatar";
import {
  Trophy,
  TrendingUp,
  Activity,
  Users,
  DollarSign,
  Target,
  Medal,
  Crown,
  Zap,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
// import { Route } from "./+types/leaderboard";
import {
  getLeaderboardStats,
  getTopTradersPerformanceTrend,
  getTopTraders,
} from "../database/leaderboard";

type TimePeriod = "7d" | "30d" | "all";

interface Trader {
  rank: number;
  userId: string;
  nickname: string;
  profitRate: number;
  totalTrades: number;
  winRate: number;
  strategy: string;
  tier: "premium" | "starter" | "free";
  totalProfit: number;
  avgDailyProfit: number;
}

const getTierConfig = (tier: Trader["tier"]) => {
  switch (tier) {
    case "premium":
      return {
        color: "bg-yellow-400/20 text-yellow-500 border-yellow-400/50",
        icon: Crown,
        label: "프리미엄",
      };
    case "starter":
      return {
        color: "bg-blue-400/20 text-blue-400 border-blue-400/50",
        icon: Medal,
        label: "스타터",
      };
    case "free":
      return {
        color: "bg-gray-400/20 text-gray-400 border-gray-400/50",
        icon: Zap,
        label: "프리",
      };
  }
};

const formatCurrency = (value: number) => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`;
  }
  return `${value.toLocaleString()}원`;
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") || "30d") as TimePeriod;

  const stats = await getLeaderboardStats();
  const trendData = await getTopTradersPerformanceTrend(period);
  const traders = await getTopTraders();

  return {
    stats,
    trendData,
    traders,
    period,
  };
}

export default function AutoTradingLeaderboard() {
  const {
    stats,
    trendData,
    traders,
    period: initialPeriod,
  } = useLoaderData<typeof loader>();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialPeriod);

  // URL 파라미터를 업데이트하여 데이터 재조회
  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    window.location.href = `/leaderboard?period=${newPeriod}`;
  };

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-accent" />
          <h1 className="text-2xl">리더보드</h1>
        </div>
        <p className="text-muted-foreground">
          상위 트레이더들의 실시간 트레이딩 성과를 확인하세요
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 트레이더</p>
                <p className="text-2xl mt-1">
                  {stats.totalTraders.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 수익률</p>
                <p className="text-2xl mt-1 text-green-500">
                  +{stats.avgProfitRate.toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총누적 거래량</p>
                <p className="text-2xl mt-1">
                  {formatCurrency(Number(stats.totalVolume))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  총누적 김프진입 횟수
                </p>
                <p className="text-2xl mt-1">
                  {stats.totalEntries.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Period Filter */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">기간</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timePeriod === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("7d")}
            >
              7일
            </Button>
            <Button
              variant={timePeriod === "30d" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("30d")}
            >
              30일
            </Button>
            <Button
              variant={timePeriod === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePeriodChange("all")}
            >
              전체
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Profit Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>상위 트레이더 수익률 추이</CardTitle>
          <CardDescription>
            {timePeriod === "7d" && "최근 7일간 상위 5명의 일별 평균 수익률"}
            {timePeriod === "30d" && "최근 30일간 상위 5명의 일별 평균 수익률"}
            {timePeriod === "all" && "전체 기간 상위 5명의 일별 평균 수익률"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, ""]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="trader1"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  name="1위"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trader2"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="2위"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trader3"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="3위"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trader4"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="4위"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trader5"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="5위"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              선택한 기간에 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>트레이더 순위</CardTitle>
          <CardDescription>
            최고 성과를 내고 있는 트레이더 TOP 10
          </CardDescription>
        </CardHeader>
        <CardContent>
          {traders.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {traders.map((trader) => {
                  const tierConfig = getTierConfig(trader.tier);
                  const TierIcon = tierConfig.icon;

                  return (
                    <Card
                      key={trader.userId}
                      className={`transition-all hover:shadow-lg hover:border-primary/50 ${
                        trader.rank <= 3 ? "border-accent/30 bg-accent/5" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        {/* Mobile Layout - Stack vertically */}
                        <div className="lg:hidden space-y-3">
                          {/* Top Row: Rank and Avatar & Name */}
                          <div className="flex items-center gap-3">
                            {/* Rank */}
                            <div className="flex-shrink-0 w-10 text-center">
                              {trader.rank <= 3 ? (
                                <div
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                    trader.rank === 1
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : trader.rank === 2
                                        ? "bg-gray-300/20 text-gray-300"
                                        : "bg-orange-600/20 text-orange-500"
                                  }`}
                                >
                                  <Trophy className="w-4 h-4" />
                                </div>
                              ) : (
                                <span className="text-lg text-muted-foreground">
                                  #{trader.rank}
                                </span>
                              )}
                            </div>

                            {/* Avatar & Name */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="w-10 h-10 border-2 border-primary/30">
                                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                  {trader.nickname.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">
                                    {trader.nickname}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`${tierConfig.color} border flex items-center gap-1 text-xs`}
                                  >
                                    <TierIcon className="w-2.5 h-2.5" />
                                    {tierConfig.label}
                                  </Badge>
                                </div>
                                {trader.strategy && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    자동매매 전략 사용중
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bottom Row: Stats */}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                수익률
                              </p>
                              <p
                                className={`text-sm font-medium ${
                                  trader.profitRate > 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {trader.profitRate > 0 ? "+" : ""}
                                {trader.profitRate.toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                승률
                              </p>
                              <p className="text-sm font-medium">
                                {trader.winRate}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                거래
                              </p>
                              <p className="text-sm font-medium">
                                {trader.totalTrades.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">
                                일평균
                              </p>
                              <p className="text-sm font-medium text-green-500">
                                {formatCurrency(trader.avgDailyProfit)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout - Horizontal */}
                        <div className="hidden lg:flex items-center gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-12 text-center">
                            {trader.rank <= 3 ? (
                              <div
                                className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                                  trader.rank === 1
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : trader.rank === 2
                                      ? "bg-gray-300/20 text-gray-300"
                                      : "bg-orange-600/20 text-orange-500"
                                }`}
                              >
                                <Trophy className="w-5 h-5" />
                              </div>
                            ) : (
                              <span className="text-xl text-muted-foreground">
                                #{trader.rank}
                              </span>
                            )}
                          </div>

                          {/* Avatar & Name */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="w-12 h-12 border-2 border-primary/30">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {trader.nickname.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {trader.nickname}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`${tierConfig.color} border flex items-center gap-1`}
                                >
                                  <TierIcon className="w-3 h-3" />
                                  {tierConfig.label}
                                </Badge>
                              </div>
                              {trader.strategy && (
                                <p className="text-sm text-muted-foreground truncate">
                                  자동매매 전략 사용중
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-6">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                수익률
                              </p>
                              <p
                                className={`mt-1 ${
                                  trader.profitRate > 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {trader.profitRate > 0 ? "+" : ""}
                                {trader.profitRate.toFixed(2)}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                거래 횟수
                              </p>
                              <p className="mt-1">
                                {trader.totalTrades.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                승률
                              </p>
                              <p className="mt-1">{trader.winRate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">
                                일평균 수익
                              </p>
                              <p className="mt-1 text-green-500">
                                {formatCurrency(trader.avgDailyProfit)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              트레이더 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Notice */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium">리더보드 안내</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • 순위는 선택한 기간의 누적 수익률을 기준으로 산정됩니다
                </li>
                <li>• 데이터는 5분마다 실시간으로 업데이트됩니다</li>
                <li>
                  • 티어는 전체 기간 수익률과 거래 횟수를 종합하여 부여됩니다
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
