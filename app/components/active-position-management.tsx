import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { useDashboardStore } from "~/stores/dashboard-store";

// 유틸리티 함수들
const formatKRW = (amount: number) => {
  const roundedAmount = Math.round(amount); // 1원 단위로 반올림
  return `${roundedAmount.toLocaleString()}원`;
};

const formatNumber = (num: number, decimals: number = 0) => {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Hydration 에러 방지: 날짜 포맷 함수 (서버/클라이언트 동일)
function formatDateForDisplay(dateString: string) {
  try {
    const date = new Date(dateString);
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  } catch {
    return dateString;
  }
}

interface ActivePosition {
  coinSymbol: string;
  krExchange: string;
  frExchange: string;
  leverage?: number;
  entryRate?: number;
  amount?: number;
  totalKrVolume?: number;
  totalFrVolume?: number;
  totalKrFunds?: number;
  totalFrFunds?: number;
  positionCount?: number;
  latestEntryTime?: string;
}

interface PositionBalance {
  coinSymbol: string;
  krPrice: number;
  frPrice: number;
  krBalanceKrw: number;
  frBalanceKrw: number;
  totalInvestment: number;
  currentProfit: number;
  profitRate: number;
  lastUpdated: number;
}

interface ActivePositionManagementProps {
  positions: ActivePosition[];
  isLoading?: boolean;
  onPositionClose?: (coinSymbol: string) => void;
  currentExchangeRate?: number;
  onTickerSelect?: (coinSymbol: string) => void;
}

export const ActivePositionManagement = React.memo(
  function ActivePositionManagement({
    positions,
    currentExchangeRate = 1300, // 기본값 설정
    onTickerSelect,
  }: ActivePositionManagementProps) {
    const [closingPositions, setClosingPositions] = useState<Set<string>>(
      new Set()
    );
    const [positionBalances, setPositionBalances] = useState<
      Map<string, PositionBalance>
    >(new Map());

    // Dashboard Store에서 Exit Average Price 구독
    const { krExitAveragePrice, frExitAveragePrice } = useDashboardStore();
    // 모든 포지션의 가격 및 수익 정보 업데이트 (Store의 Exit Price 사용)
    const updatePositionBalances = useCallback(async () => {
      if (positions.length === 0) {
        setPositionBalances(new Map());
        return;
      }

      // Exit Price가 없으면 업데이트 불가
      if (krExitAveragePrice === null || frExitAveragePrice === null) {
        return;
      }

      const newBalances = new Map<string, PositionBalance>();

      for (const position of positions) {
        try {
          // DB에서 받은 실제 보유량과 투자금액
          const totalKrVolume = position.totalKrVolume || 0;
          const totalKrFunds = position.totalKrFunds || 0;
          const totalFrFunds = position.totalFrFunds || 0;
          const totalFrVolume = position.totalFrVolume || 0;
          const leverage = position.leverage || 1;

          // 해외거래소 진입 평균가 계산
          const frEntryPrice =
            totalFrVolume > 0 ? totalFrFunds / totalFrVolume : 0;

          // frUnrealizedPnl 역산 (선물거래소 Short 포지션 PnL 계산)
          // Short 포지션: PnL = (Entry Price - Exit Price) × Volume
          // 진입가 > 종료가 = 수익, 진입가 < 종료가 = 손실
          const frUnrealizedPnl =
            (frEntryPrice - frExitAveragePrice) * totalFrVolume;

          // 실시간 잔액 계산 (1원 단위 반올림)
          const krBalanceKrw = Math.round(totalKrVolume * krExitAveragePrice);
          const frBalanceKrw = Math.round(
            (Number(totalFrFunds) + Number(frUnrealizedPnl)) *
              currentExchangeRate
          );

          // 총 투자금액 계산 - NaN 방지를 위한 안전한 처리
          const safeKrFunds =
            isNaN(Number(totalKrFunds)) || totalKrFunds === null
              ? 0
              : Number(totalKrFunds);
          const safeFrFunds =
            isNaN(Number(totalFrFunds)) || totalFrFunds === null
              ? 0
              : Number(totalFrFunds);
          const safeFrFundsKrw = isNaN(safeFrFunds * currentExchangeRate)
            ? 0
            : safeFrFunds * currentExchangeRate;

          const totalInvestment = Math.round(safeKrFunds + safeFrFundsKrw);

          // 현재 총 자산 가치
          const totalCurrentValue = krBalanceKrw + frBalanceKrw;

          // 수익 계산 - NaN 방지를 위한 안전한 처리
          const currentProfit = isNaN(totalInvestment)
            ? 0
            : Math.round(totalCurrentValue - totalInvestment);
          const profitRate =
            totalInvestment > 0 && !isNaN(totalInvestment)
              ? (currentProfit / totalInvestment) * 100
              : 0;

          newBalances.set(position.coinSymbol, {
            coinSymbol: position.coinSymbol,
            krPrice: krExitAveragePrice,
            frPrice: frExitAveragePrice,
            krBalanceKrw,
            frBalanceKrw,
            totalInvestment,
            currentProfit,
            profitRate,
            lastUpdated: Date.now(),
          });
        } catch (error) {
          console.error(
            `포지션 잔액 업데이트 실패 (${position.coinSymbol}):`,
            error
          );
        }
      }

      setPositionBalances(newBalances);
    }, [
      positions,
      currentExchangeRate,
      krExitAveragePrice,
      frExitAveragePrice,
    ]);

    // 포지션 가격 및 수익 정보 초기화
    useEffect(() => {
      updatePositionBalances();
    }, [updatePositionBalances]);

    // 클로징 상태 업데이트
    const handlePositionClose = (coinSymbol: string) => {
      if (closingPositions.has(coinSymbol)) {
        setClosingPositions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(coinSymbol);
          return newSet;
        });
      } else {
        setClosingPositions((prev) => new Set(prev).add(coinSymbol));
      }
    };

    // 포지션 강제 종료
    const handleForceClose = async (
      coinSymbol: string,
      krExchange?: string,
      frExchange?: string
    ) => {
      try {
        if (!krExchange || !frExchange) {
          toast.error("거래소 정보가 누락되었습니다.");
          return;
        }
        const res = await fetch("/api/close-position", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            coinSymbol,
            krExchange: krExchange.toUpperCase(),
            frExchange: frExchange.toUpperCase(),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`${coinSymbol} 포지션이 성공적으로 종료되었습니다.`);
        } else {
          toast.error(data.message || `${coinSymbol} 포지션 종료 실패`);
        }
      } catch (error: any) {
        console.error(`포지션 강제 종료 실패 (${coinSymbol}):`, error);
        toast.error(`포지션 강제 종료 실패 (${coinSymbol}): ${error.message}`);
      }
    };

    return (
      <Card className="shadow-lg">
        <CardHeader className="border-b border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">
                  실시간 포지션 관리
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  현재 포지션 {positions.length}개
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-2 py-2 px-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">5초마다 자동 업데이트</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {positions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <TrendingDown className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                활성 포지션이 없습니다
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                새로운 포지션을 진입하여 거래를 시작하세요
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 전체 요약 카드 - 3열 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 border-blue-500/30 dark:border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20 dark:to-transparent">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        총 포지션금액
                      </p>
                      <div className="p-2 bg-blue-500/20 dark:bg-blue-500/30 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatKRW(
                        Array.from(positionBalances.values()).reduce(
                          (sum, balance) =>
                            sum + balance.krBalanceKrw + balance.frBalanceKrw,
                          0
                        )
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-500/30 dark:border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-transparent dark:from-purple-500/20 dark:to-transparent">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        총 투자금액
                      </p>
                      <div className="p-2 bg-purple-500/20 dark:bg-purple-500/30 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatKRW(
                        Array.from(positionBalances.values()).reduce(
                          (sum, balance) => sum + balance.totalInvestment,
                          0
                        )
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={`border-2 ${
                    Array.from(positionBalances.values()).reduce(
                      (sum, balance) => sum + balance.currentProfit,
                      0
                    ) >= 0
                      ? "border-green-500/30 dark:border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent dark:from-green-500/20 dark:to-transparent"
                      : "border-red-500/30 dark:border-red-500/50 bg-gradient-to-br from-red-500/10 to-transparent dark:from-red-500/20 dark:to-transparent"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        현재 예상수익
                      </p>
                      <div
                        className={`p-2 rounded-lg ${
                          Array.from(positionBalances.values()).reduce(
                            (sum, balance) => sum + balance.currentProfit,
                            0
                          ) >= 0
                            ? "bg-green-500/20 dark:bg-green-500/30"
                            : "bg-red-500/20 dark:bg-red-500/30"
                        }`}
                      >
                        {Array.from(positionBalances.values()).reduce(
                          (sum, balance) => sum + balance.currentProfit,
                          0
                        ) >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-2xl font-bold tabular-nums ${
                        Array.from(positionBalances.values()).reduce(
                          (sum, balance) => sum + balance.currentProfit,
                          0
                        ) >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatKRW(
                        Array.from(positionBalances.values()).reduce(
                          (sum, balance) => sum + balance.currentProfit,
                          0
                        )
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      수수료/슬리피지 제외
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 개별 포지션 테이블 */}
              <div className="border border-gray-500/30 rounded-xl overflow-hidden bg-transparent">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-gradient-to-r from-slate-700/40 to-slate-600/40 dark:from-slate-700/60 dark:to-slate-600/60 border-b border-gray-500/30">
                      <tr>
                        <th className="w-24 px-4 py-4 text-center text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          관리
                        </th>
                        <th className="w-24 px-4 py-4 text-center text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          코인
                        </th>
                        <th className="w-28 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          KR 가격
                        </th>
                        <th className="w-28 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          FR 가격
                        </th>
                        <th className="w-32 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          KR 자산
                        </th>
                        <th className="w-32 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          FR 자산
                        </th>
                        <th className="w-32 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          투자금액
                        </th>
                        <th className="w-32 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          예상수익
                        </th>
                        <th className="w-24 px-4 py-4 text-center text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          수익률
                        </th>
                        <th className="w-28 px-4 py-4 text-center text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          업데이트
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-500/20">
                      {positions.map((position) => {
                        const balance = positionBalances.get(
                          position.coinSymbol
                        );
                        return (
                          <tr
                            key={position.coinSymbol}
                            className="hover:bg-gray-500/10 dark:hover:bg-gray-500/20 transition-colors cursor-pointer"
                            onClick={() => {
                              if (onTickerSelect) {
                                onTickerSelect(position.coinSymbol);
                              }
                            }}
                          >
                            <td className="px-4 py-4 text-center">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={closingPositions.has(
                                  position.coinSymbol
                                )}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setClosingPositions((prev) =>
                                    new Set(prev).add(position.coinSymbol)
                                  );
                                  await handleForceClose(
                                    position.coinSymbol,
                                    position.krExchange,
                                    position.frExchange
                                  );
                                  handlePositionClose(position.coinSymbol);
                                }}
                                className="w-full"
                              >
                                {closingPositions.has(position.coinSymbol) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    종료중
                                  </>
                                ) : (
                                  "종료"
                                )}
                              </Button>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="font-bold text-base">
                                {position.coinSymbol}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums font-medium">
                              {balance
                                ? formatNumber(balance.krPrice, 0) + "원"
                                : "-"}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums font-medium">
                              {balance
                                ? "$" + formatNumber(balance.frPrice, 2)
                                : "-"}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                              {balance ? formatKRW(balance.krBalanceKrw) : "-"}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                              {balance ? formatKRW(balance.frBalanceKrw) : "-"}
                            </td>
                            <td className="px-4 py-4 text-right tabular-nums font-semibold">
                              {balance
                                ? formatKRW(balance.totalInvestment)
                                : "-"}
                            </td>
                            <td
                              className={`px-4 py-4 text-right tabular-nums font-bold ${
                                balance && balance.currentProfit >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {balance ? formatKRW(balance.currentProfit) : "-"}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {balance ? (
                                <Badge
                                  variant={
                                    balance.profitRate >= 0
                                      ? "default"
                                      : "destructive"
                                  }
                                  className={`font-bold tabular-nums ${
                                    balance.profitRate >= 0
                                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  }`}
                                >
                                  {balance.profitRate >= 0 ? "+" : ""}
                                  {balance.profitRate.toFixed(2)}%
                                </Badge>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-4 py-4 text-center text-xs text-muted-foreground tabular-nums">
                              {balance && balance.lastUpdated
                                ? formatDateForDisplay(
                                    new Date(balance.lastUpdated).toISOString()
                                  )
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
