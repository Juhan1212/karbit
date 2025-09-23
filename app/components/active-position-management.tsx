import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

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

    // 개별 포지션의 가격 정보 조회 함수 - 서버 API GET 호출
    const fetchPositionPrice = async (position: ActivePosition) => {
      try {
        const params = new URLSearchParams({
          krExchange: position.krExchange,
          frExchange: position.frExchange,
          coinSymbol: position.coinSymbol,
        });
        const res = await fetch(
          `/api/proxy/position/price?${params.toString()}`
        );
        if (!res.ok) throw new Error("API 요청 실패");
        const data = await res.json();
        return {
          coinSymbol: position.coinSymbol,
          krPrice: data.krPrice ?? 0,
          frPrice: data.frPrice ?? 0,
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
              krBalanceKrw,
              frBalanceKrw,
              totalInvestment,
              currentProfit,
              profitRate,
              lastUpdated: Date.now(),
            });
          }
        } catch (error) {
          console.error(
            `포지션 잔액 업데이트 실패 (${position.coinSymbol}):`,
            error
          );
        }
      }

      setPositionBalances(newBalances);
      setIsPriceLoading(false);
      setLastPriceUpdate(new Date());
    }, [positions, currentExchangeRate]);

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
      <Card>
        <CardHeader>
          <CardTitle>실시간 포지션 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-4 text-black">
              현재 활성화된 포지션이 없습니다.
            </div>
          ) : (
            <>
              {/* 전체 요약 테이블 */}
              <div className="mb-6 border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-semibold">
                        총 자산
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        총 투자금액
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        현재 수익
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-center font-medium">
                        {formatKRW(
                          Array.from(positionBalances.values()).reduce(
                            (sum, balance) =>
                              sum + balance.krBalanceKrw + balance.frBalanceKrw,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatKRW(
                          Array.from(positionBalances.values()).reduce(
                            (sum, balance) => sum + balance.totalInvestment,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatKRW(
                          Array.from(positionBalances.values()).reduce(
                            (sum, balance) => sum + balance.currentProfit,
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* 개별 포지션 테이블 */}
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-semibold">
                        코인
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        KR 가격
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        FR 가격
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        KR 자산
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        FR 자산
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        총 투자금액
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        현재 수익
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        수익률
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        마지막 업데이트
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        강제 종료
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => {
                      const balance = positionBalances.get(position.coinSymbol);
                      return (
                        <TableRow key={position.coinSymbol}>
                          <TableCell className="text-center font-medium">
                            {position.coinSymbol}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance
                              ? balance.krPrice.toLocaleString() + "원"
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance
                              ? balance.frPrice.toLocaleString() + "원"
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance ? formatKRW(balance.krBalanceKrw) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance ? formatKRW(balance.frBalanceKrw) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {balance ? formatKRW(balance.totalInvestment) : "-"}
                          </TableCell>
                          <TableCell
                            className={`text-center font-medium ${balance && balance.currentProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {balance ? formatKRW(balance.currentProfit) : "-"}
                          </TableCell>
                          <TableCell
                            className={`text-center font-medium ${balance && balance.profitRate >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {balance
                              ? balance.profitRate.toFixed(2) + "%"
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {balance && balance.lastUpdated
                              ? formatDateForDisplay(
                                  new Date(balance.lastUpdated).toISOString()
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={closingPositions.has(
                                position.coinSymbol
                              )}
                              onClick={async () => {
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
                            >
                              {closingPositions.has(position.coinSymbol)
                                ? "종료 중..."
                                : "강제 종료"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  onClick={() => {
                    // 모든 포지션 새로 고침
                    updatePositionBalances();
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  새로 고침
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);
