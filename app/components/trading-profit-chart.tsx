import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { useMemo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TradingProfitChartProps {
  closedTrades: {
    id: number;
    coinSymbol: string;
    profit: string | null;
    createdAt: Date | null;
  }[];
  isLoading?: boolean;
}

export function TradingProfitChart({
  closedTrades,
  isLoading,
}: TradingProfitChartProps) {
  // 시간순으로 정렬하여 누적 수익 계산
  const chartData = useMemo(() => {
    // profit과 createdAt이 null이 아닌 거래만 필터링 (이미 CLOSED 상태만 전달됨)
    const validTrades = closedTrades.filter(
      (trade) => trade.profit !== null && trade.createdAt !== null
    );

    // DB에서 이미 createdAt 기준으로 정렬되어 전달됨
    const sortedTrades = validTrades;

    // 누적 수익 계산
    let cumulativeProfit = 0;
    return sortedTrades
      .map((trade) => {
        const profit = parseFloat(trade.profit || "0");
        cumulativeProfit += profit;

        // createdAt null 체크 (위에서 필터링했지만 타입 가드용)
        if (!trade.createdAt) {
          console.warn("Null createdAt for trade ID:", trade.id);
          return null;
        }

        // createdAt 유효성 검사
        const date = new Date(trade.createdAt);

        // Invalid Date 체크
        if (isNaN(date.getTime())) {
          console.warn(
            "Invalid createdAt date:",
            trade.createdAt,
            "for trade ID:",
            trade.id
          );
          return null;
        }

        // 날짜 포맷팅 (MM/DD HH:mm)
        const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

        return {
          date: formattedDate,
          fullDate: date.toISOString(),
          profit: Math.round(profit), // 개별 수익
          cumulativeProfit: Math.round(cumulativeProfit), // 누적 수익
          coinSymbol: trade.coinSymbol,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null); // null 제거
  }, [closedTrades]);

  // 통계 계산
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalProfit: 0,
        averageProfit: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
      };
    }

    const totalProfit = chartData[chartData.length - 1].cumulativeProfit;
    const averageProfit = totalProfit / chartData.length;
    const winningTrades = chartData.filter((d) => d.profit > 0).length;
    const losingTrades = chartData.filter((d) => d.profit < 0).length;
    const winRate = (winningTrades / chartData.length) * 100;

    return {
      totalProfit,
      averageProfit: Math.round(averageProfit),
      winningTrades,
      losingTrades,
      winRate: Math.round(winRate * 10) / 10, // 소수점 첫째자리까지
    };
  }, [chartData]);

  // 로딩 상태
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="w-4 h-4" />
            누적 수익 차트
          </CardTitle>
          <CardDescription>
            종료된 거래의 누적 수익을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 데이터가 없는 경우
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="w-4 h-4" />
            누적 수익 차트
          </CardTitle>
          <CardDescription>
            종료된 거래의 누적 수익을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                종료된 거래가 없습니다
              </h3>
              <p className="text-sm text-muted-foreground">
                거래가 종료되면 누적 수익을 확인할 수 있습니다
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 차트 색상 결정 (최종 누적 수익 기준)
  const finalProfit = stats.totalProfit;
  const lineColor = finalProfit >= 0 ? "#22c55e" : "#ef4444";
  const gradientId = finalProfit >= 0 ? "profitGradient" : "lossGradient";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          {finalProfit >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          누적 수익 차트
        </CardTitle>
        <CardDescription>종료된 거래의 누적 수익을 확인하세요</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 통계 요약 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">누적 수익</p>
            <p
              className={`text-lg font-bold ${finalProfit >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {finalProfit >= 0 ? "+" : ""}₩{stats.totalProfit.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">평균 수익</p>
            <p
              className={`text-lg font-bold ${stats.averageProfit >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {stats.averageProfit >= 0 ? "+" : ""}₩
              {stats.averageProfit.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">총 포지션 종료횟수</p>
            <p className="text-lg font-bold">{chartData.length}회</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">승률</p>
            <p className="text-lg font-bold text-blue-500">{stats.winRate}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">승/패</p>
            <p className="text-lg font-bold">
              <span className="text-green-500">{stats.winningTrades}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-red-500">{stats.losingTrades}</span>
            </p>
          </div>
        </div>

        {/* 차트 */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#f9fafb" }}
                itemStyle={{ color: lineColor }}
                formatter={(value: any, name: string, props: any) => {
                  if (name === "cumulativeProfit") {
                    return [`₩${value.toLocaleString()}`, "누적 수익"];
                  }
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return `${label} (${data.coinSymbol}) - 개별 수익: ${data.profit >= 0 ? "+" : ""}₩${data.profit.toLocaleString()}`;
                  }
                  return label;
                }}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, r: 4 }}
                activeDot={{ r: 6 }}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
