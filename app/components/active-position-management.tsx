import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import {
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchExchangeTicker,
  type TickerData,
} from "~/utils/exchangeApiClient";

// 유틸리티 함수들
const formatKRW = (amount: number) => {
  const roundedAmount = Math.round(amount); // 1원 단위로 반올림
  return `${roundedAmount.toLocaleString()}원`;
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
}

export const ActivePositionManagement = React.memo(
  function ActivePositionManagement({
    positions,
    isLoading = false,
    onPositionClose,
    currentExchangeRate = 1300, // 기본값 설정
  }: ActivePositionManagementProps) {
    const [closingPositions, setClosingPositions] = useState<Set<string>>(
      new Set()
    );
    const [isExpanded, setIsExpanded] = useState(false);
    const [positionBalances, setPositionBalances] = useState<
      Map<string, PositionBalance>
    >(new Map());
    const [isPriceLoading, setIsPriceLoading] = useState(false);
    const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

    // 전체 포트폴리오 수익률 계산
    const calculateTotalPortfolioStats = useCallback(() => {
      let totalInvestment = 0;
      let totalCurrentValue = 0;
      let totalProfit = 0;

      // positionBalances에서 이미 계산된 값들을 합산
      positionBalances.forEach((balance) => {
        if (!isNaN(balance.totalInvestment)) {
          totalInvestment += balance.totalInvestment;
        }
        if (!isNaN(balance.krBalanceKrw) && !isNaN(balance.frBalanceKrw)) {
          totalCurrentValue += balance.krBalanceKrw + balance.frBalanceKrw;
        }
        if (!isNaN(balance.currentProfit)) {
          totalProfit += balance.currentProfit;
        }
      });

      // 1원 단위로 반올림
      totalInvestment = Math.round(totalInvestment);
      totalCurrentValue = Math.round(totalCurrentValue);
      totalProfit = Math.round(totalProfit);

      const profitRate =
        totalInvestment > 0 && !isNaN(totalInvestment)
          ? (totalProfit / totalInvestment) * 100
          : 0;

      return {
        totalInvestment: isNaN(totalInvestment) ? 0 : totalInvestment,
        totalCurrentValue: isNaN(totalCurrentValue) ? 0 : totalCurrentValue,
        totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
        profitRate: isNaN(profitRate) ? 0 : profitRate,
      };
    }, [positions, positionBalances]);

    // 개별 포지션의 가격 정보 조회 함수 - 직접 거래소 API 호출
    const fetchPositionPrice = async (position: ActivePosition) => {
      try {
        const [krTicker, frTicker] = await Promise.all([
          // 한국 거래소 가격 조회 (원화)
          fetchExchangeTicker(position.krExchange, position.coinSymbol),
          // 해외 거래소 가격 조회 (USDT)
          fetchExchangeTicker(position.frExchange, position.coinSymbol),
        ]);

        return {
          coinSymbol: position.coinSymbol,
          krPrice: krTicker.price,
          frPrice: frTicker.price, // USDT 가격
        };
      } catch (error) {
        console.error(`가격 조회 실패 (${position.coinSymbol}):`, error);
        return null;
      }
    };

    // 모든 포지션의 가격 및 수익 정보 업데이트
    const updatePositionBalances = useCallback(async () => {
      if (positions.length === 0) {
        setPositionBalances(new Map());
        return;
      }

      setIsPriceLoading(true);
      const newBalances = new Map<string, PositionBalance>();

      for (const position of positions) {
        try {
          const priceData = await fetchPositionPrice(position);

          if (priceData) {
            // DB에서 받은 실제 보유량과 투자금액
            const totalKrVolume = position.totalKrVolume || 0;
            const totalFrVolume = position.totalFrVolume || 0;
            const totalKrFunds = position.totalKrFunds || 0;
            const totalFrFunds = position.totalFrFunds || 0;

            // 실시간 잔액 계산 (1원 단위 반올림)
            const krBalanceKrw = Math.round(totalKrVolume * priceData.krPrice);
            const frBalanceKrw = Math.round(
              totalFrVolume * priceData.frPrice * currentExchangeRate
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
              krPrice: priceData.krPrice,
              frPrice: priceData.frPrice,
              krBalanceKrw, // 실시간 국내잔액
              frBalanceKrw, // 실시간 해외잔액 (KRW 환산)
              totalInvestment,
              currentProfit,
              profitRate,
              lastUpdated: Date.now(),
            });
          }
        } catch (error) {
          console.error(
            `포지션 업데이트 실패 (${position.coinSymbol}):`,
            error
          );
        }
      }

      setPositionBalances(newBalances);
      setLastPriceUpdate(new Date());
      setIsPriceLoading(false);
    }, [positions, currentExchangeRate]);

    // 10초마다 가격 업데이트
    useEffect(() => {
      if (positions.length === 0) return;

      // 초기 로딩
      updatePositionBalances();

      // 10초마다 업데이트
      const interval = setInterval(updatePositionBalances, 10000);

      // 페이지 가시성 변경 감지
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          updatePositionBalances();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }, [updatePositionBalances]);

    // 수동 새로고침 함수
    const handleManualRefresh = () => {
      updatePositionBalances();
      toast.success("가격 정보를 업데이트했습니다");
    };

    const handleClosePosition = async (
      coinSymbol: string,
      krExchange: string,
      frExchange: string
    ) => {
      if (closingPositions.has(coinSymbol)) return;

      setClosingPositions((prev) => new Set(prev).add(coinSymbol));

      try {
        const response = await fetch("/api/close-position", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coinSymbol, krExchange, frExchange }),
        });

        if (response.ok) {
          toast.success(`${coinSymbol} 포지션이 성공적으로 종료되었습니다.`);
          onPositionClose?.(coinSymbol);
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || "포지션 종료에 실패했습니다.");
        }
      } catch (error) {
        console.error("포지션 종료 오류:", error);
        toast.error("포지션 종료 중 오류가 발생했습니다.");
      } finally {
        setClosingPositions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(coinSymbol);
          return newSet;
        });
      }
    };

    const getExchangeNames = (krExchange: string, frExchange: string) => {
      const krName =
        krExchange === "upbit"
          ? "업비트"
          : krExchange === "bithumb"
            ? "빗썸"
            : krExchange;
      const frName =
        frExchange === "binance"
          ? "바이낸스"
          : frExchange === "bybit"
            ? "바이비트"
            : frExchange === "okx"
              ? "OKX"
              : frExchange;

      return { krName, frName };
    };

    if (isLoading) {
      return (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                활성 포지션 관리
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  포지션 데이터 로딩 중...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (positions.length === 0) {
      return (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                활성 포지션 관리
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  종료할 포지션이 없습니다
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex flex-col space-y-1">
              <CardTitle className="text-sm font-medium">
                활성 포지션 관리
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>총 {positions[0]?.positionCount || 0}개 포지션</span>
                {positions[0]?.latestEntryTime && (
                  <span>
                    최근 진입:{" "}
                    {formatDateForDisplay(positions[0].latestEntryTime)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {positions.length}개 코인
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          {isExpanded && (
            <CardContent>
              <div className="space-y-4">
                {/* 전체 투자 금액 및 수익률 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      국내 투자금액
                    </p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatKRW(
                        Math.round(
                          positions.reduce((sum, pos) => {
                            const funds = Number(pos.totalKrFunds) || 0;
                            return sum + (isNaN(funds) ? 0 : funds);
                          }, 0)
                        )
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      해외 투자금액
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatKRW(
                        Math.round(
                          positions.reduce((sum, pos) => {
                            const funds = Number(pos.totalFrFunds) || 0;
                            const krwValue = isNaN(funds)
                              ? 0
                              : funds * currentExchangeRate;
                            return sum + (isNaN(krwValue) ? 0 : krwValue);
                          }, 0)
                        )
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">총 투자금액</p>
                    <p className="text-xl font-bold">
                      {formatKRW(
                        positions.reduce((sum, pos) => {
                          const krFunds = Number(pos.totalKrFunds) || 0;
                          const frFunds = Number(pos.totalFrFunds) || 0;
                          const frKrwValue = isNaN(frFunds)
                            ? 0
                            : frFunds * currentExchangeRate;
                          return (
                            sum +
                            (isNaN(krFunds + frKrwValue)
                              ? 0
                              : krFunds + frKrwValue)
                          );
                        }, 0)
                      )}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">전체 수익률</p>
                    {(() => {
                      const stats = calculateTotalPortfolioStats();
                      return (
                        <>
                          <div
                            className={`text-xl font-bold ${
                              stats.profitRate >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {stats.profitRate >= 0 ? "+" : ""}
                            {stats.profitRate.toFixed(2)}%
                          </div>
                          <p
                            className={`text-sm ${
                              stats.totalProfit >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {stats.totalProfit >= 0 ? "+" : ""}
                            {formatKRW(Math.abs(stats.totalProfit))}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 가격 업데이트 상태 표시 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {isPriceLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        가격 정보 업데이트 중...
                      </>
                    ) : lastPriceUpdate ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        마지막 업데이트: {lastPriceUpdate.toLocaleTimeString()}
                      </>
                    ) : (
                      "가격 정보 로딩 중..."
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isPriceLoading}
                    className="h-7 px-2"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isPriceLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">코인</TableHead>
                        <TableHead className="w-[120px]">거래소</TableHead>
                        <TableHead className="text-right w-[120px]">
                          실시간 국내잔액(KRW)
                        </TableHead>
                        <TableHead className="text-right w-[120px]">
                          실시간 해외잔액(KRW)
                        </TableHead>
                        <TableHead className="text-right w-[120px]">
                          실시간 현재수익
                        </TableHead>
                        <TableHead className="text-center w-[80px]">
                          상태
                        </TableHead>
                        <TableHead className="text-right w-[100px]">
                          액션
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((position) => {
                        const { krName, frName } = getExchangeNames(
                          position.krExchange,
                          position.frExchange
                        );
                        const isClosing = closingPositions.has(
                          position.coinSymbol
                        );
                        const balanceData = positionBalances.get(
                          position.coinSymbol
                        );

                        return (
                          <TableRow key={position.coinSymbol}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm">
                                  {position.coinSymbol}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {krName}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {frName}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                {balanceData ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {formatKRW(balanceData.krBalanceKrw)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ₩{balanceData.krPrice.toLocaleString()}
                                    </div>
                                  </div>
                                ) : isPriceLoading ? (
                                  <div className="flex items-center justify-end">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                {balanceData ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {formatKRW(balanceData.frBalanceKrw)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      ${balanceData.frPrice.toLocaleString()}
                                    </div>
                                  </div>
                                ) : isPriceLoading ? (
                                  <div className="flex items-center justify-end">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="text-sm">
                                {balanceData ? (
                                  <div className="space-y-1">
                                    <div
                                      className={`flex items-center justify-end gap-1 font-medium ${
                                        balanceData.currentProfit >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {balanceData.currentProfit >= 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3" />
                                      )}
                                      {formatKRW(
                                        Math.abs(balanceData.currentProfit)
                                      )}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        balanceData.profitRate >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {balanceData.profitRate > 0 ? "+" : ""}
                                      {balanceData.profitRate.toFixed(2)}%
                                    </div>
                                  </div>
                                ) : isPriceLoading ? (
                                  <div className="flex items-center justify-end">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                {isPriceLoading ? (
                                  <div className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-xs text-muted-foreground">
                                      업데이트 중
                                    </span>
                                  </div>
                                ) : balanceData ? (
                                  <div className="flex items-center gap-1">
                                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-green-600">
                                      실시간
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    <span className="text-xs text-amber-600">
                                      대기중
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleClosePosition(
                                    position.coinSymbol,
                                    position.krExchange,
                                    position.frExchange
                                  )
                                }
                                disabled={isClosing}
                                className="h-8 px-3"
                              >
                                {isClosing ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    종료 중
                                  </>
                                ) : (
                                  <>
                                    <X className="mr-1 h-3 w-3" />
                                    종료
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {positions.length > 3 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {positions.length}개의 활성 포지션이 표시되었습니다
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }
);
