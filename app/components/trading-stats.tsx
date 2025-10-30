import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Loader } from "lucide-react";

interface TradingStatsProps {
  stats: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    totalProfit: number;
  };
  isLoading?: boolean;
}

export const TradingStats = React.memo(function TradingStats({
  stats,
  isLoading = false,
}: TradingStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">로딩 중...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Single Card Layout */}
      <Card className="lg:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">트레이딩 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">총 거래</div>
              <div className="text-xl font-bold">{stats.totalTrades}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">진입 횟수</div>
              <div className="text-xl font-bold">{stats.openTrades}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">종료 횟수</div>
              <div className="text-xl font-bold">{stats.closedTrades}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">총 수익</div>
              <div
                className={`text-xl font-bold ${
                  stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.totalProfit >= 0 ? "+" : ""}
                {stats.totalProfit.toFixed(2)}₩
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop: Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">총 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              총 포지션 진입횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{stats.openTrades}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">
              총 포지션 종료횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedTrades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">총 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {stats.totalProfit >= 0 ? "+" : ""}
              {stats.totalProfit.toFixed(2)}₩
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
});
