import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import { multiWebSocketCoordinator } from "~/stores/multi-websocket-coordinator";
import type { OrderBookData } from "~/types/marketInfo";

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

// ============================================
// 오더북 엔트리 타입
// ============================================
interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

// ============================================
// 코인 수량 기반 평균 가격 계산 함수 (종료 시 사용)
// orderbook.tsx의 calculateAveragePriceByVolume과 동일
// ============================================
const calculateAveragePriceByVolume = (
  entries: OrderBookEntry[],
  coinVolume: number,
  type: "ask" | "bid",
  isKoreanExchange: boolean,
  tetherPrice?: number | null
): number => {
  if (!entries.length || !coinVolume) return 0;

  // 정렬: ask는 가격 오름차순 (최저가부터), bid는 가격 내림차순 (최고가부터)
  const sortedEntries = [...entries].sort((a, b) => {
    return type === "ask" ? a.price - b.price : b.price - a.price;
  });

  let totalValue = 0; // 총 금액 (KRW 또는 USDT)
  let totalVolume = 0; // 총 코인 수량
  let remainingVolume = coinVolume;

  for (const entry of sortedEntries) {
    if (remainingVolume <= 0) break;

    // entry.amount는 해당 호가의 코인 수량
    const useVolume = Math.min(remainingVolume, entry.amount);
    totalValue += entry.price * useVolume;
    totalVolume += useVolume;
    remainingVolume -= useVolume;
  }

  if (totalVolume === 0) return 0;

  return totalValue / totalVolume;
};

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
  leverage?: number;
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

    // 실시간 오더북 데이터로 계산된 평균 가격 저장
    const [realtimePrices, setRealtimePrices] = useState<
      Map<
        string,
        {
          krExitPrice: number;
          frExitPrice: number;
          lastUpdated: number;
        }
      >
    >(new Map());

    // RAF를 사용한 스로틀링을 위한 ref
    const rafRef = useRef<number | undefined>(undefined);
    const pendingUpdatesRef = useRef<Map<string, any>>(new Map());

    // realtimePrices를 ref로도 저장하여 클로저 문제 해결
    const realtimePricesRef = useRef(realtimePrices);

    // currentExchangeRate를 ref로 저장하여 의존성 배열에서 제거
    const currentExchangeRateRef = useRef(currentExchangeRate);

    // realtimePrices가 변경될 때마다 ref 업데이트
    useEffect(() => {
      realtimePricesRef.current = realtimePrices;
    }, [realtimePrices]);

    // currentExchangeRate가 변경될 때마다 ref 업데이트
    useEffect(() => {
      currentExchangeRateRef.current = currentExchangeRate;
    }, [currentExchangeRate]);

    // ==================== WebSocket 오더북 데이터 수신 ====================
    useEffect(() => {
      if (positions.length === 0) {
        setRealtimePrices(new Map());
        return;
      }

      // console.log(
      //   "[ActivePositionManagement] Setting up WebSocket listeners for positions:",
      //   positions.length
      // );

      // 각 거래소별로 별도의 핸들러 생성하여 거래소 정보를 클로저로 캡처
      const storeHandlers = new Map<string, (data: any) => void>();

      const stores = multiWebSocketCoordinator.getAllStores();

      stores.forEach((store) => {
        const exchangeName =
          Array.from(multiWebSocketCoordinator["stores"].entries()).find(
            ([_, s]) => s === store
          )?.[0] || "";

        const handleMessage = (data: any) => {
          if (data.channel !== "orderbook") return;

          const symbol = data.symbol;

          // 이 거래소와 심볼에 해당하는 포지션 찾기
          const position = positions.find((p) => {
            const krExchange = p.krExchange?.toLowerCase();
            const frExchange = p.frExchange?.toLowerCase();
            return (
              p.coinSymbol === symbol &&
              (krExchange === exchangeName || frExchange === exchangeName)
            );
          });

          if (!position) return;

          // 포지션과 거래소 정보를 함께 저장
          const key = `${symbol}_${exchangeName}`;
          pendingUpdatesRef.current.set(key, {
            position,
            orderbook: data as OrderBookData,
            exchange: exchangeName,
          });

          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(() => {
              // ref를 사용하여 최신 값 가져오기
              const updates = new Map(realtimePricesRef.current);

              // 심볼별로 그룹화
              const symbolGroups = new Map<string, Map<string, any>>();

              pendingUpdatesRef.current.forEach((value, key) => {
                const symbol = value.position.coinSymbol;
                if (!symbolGroups.has(symbol)) {
                  symbolGroups.set(symbol, new Map());
                }
                symbolGroups.get(symbol)!.set(value.exchange, value);
              });

              // 각 심볼별로 처리
              symbolGroups.forEach((exchangeData, symbol) => {
                try {
                  const position = Array.from(exchangeData.values())[0]
                    .position;
                  const krExchange = position.krExchange?.toLowerCase();
                  const frExchange = position.frExchange?.toLowerCase();

                  // 기존 값 가져오기 (없으면 0으로 초기화)
                  const existing = updates.get(symbol) || {
                    krExitPrice: 0,
                    frExitPrice: 0,
                    lastUpdated: 0,
                  };

                  let krExitPrice = existing.krExitPrice;
                  let frExitPrice = existing.frExitPrice;

                  // 한국 거래소 데이터 처리
                  if (krExchange && exchangeData.has(krExchange)) {
                    const krData = exchangeData.get(krExchange);
                    if (
                      krData &&
                      krData.orderbook.bids &&
                      krData.orderbook.bids.length > 0
                    ) {
                      const krVolume = position.totalKrVolume || 0;
                      if (krVolume > 0) {
                        const newKrPrice = calculateAveragePriceByVolume(
                          krData.orderbook.bids,
                          krVolume,
                          "bid",
                          true,
                          null
                        );
                        if (newKrPrice > 0) {
                          krExitPrice = newKrPrice;
                        }
                      }
                    }
                  }

                  // 해외 거래소 데이터 처리
                  if (frExchange && exchangeData.has(frExchange)) {
                    const frData = exchangeData.get(frExchange);
                    if (
                      frData &&
                      frData.orderbook.asks &&
                      frData.orderbook.asks.length > 0
                    ) {
                      const frVolume = position.totalFrVolume || 0;
                      if (frVolume > 0) {
                        const newFrPrice = calculateAveragePriceByVolume(
                          frData.orderbook.asks,
                          frVolume,
                          "ask",
                          false,
                          currentExchangeRateRef.current
                        );
                        if (newFrPrice > 0) {
                          frExitPrice = newFrPrice;
                        }
                      }
                    }
                  }

                  // 둘 다 0이 아닐 때만 업데이트 (초기 로딩 시 방지)
                  if (krExitPrice > 0 && frExitPrice > 0) {
                    updates.set(symbol, {
                      krExitPrice,
                      frExitPrice,
                      lastUpdated: Date.now(),
                    });
                  }
                } catch (error) {
                  console.error(
                    `[ActivePositionManagement] Error calculating price for ${symbol}:`,
                    error
                  );
                }
              });

              setRealtimePrices(updates);
              pendingUpdatesRef.current.clear();
              rafRef.current = undefined;
            });
          }
        };

        storeHandlers.set(exchangeName, handleMessage);
        store.getState().addMessageListener(handleMessage);
      });

      // console.log(
      //   "[ActivePositionManagement] WebSocket listeners registered for",
      //   stores.length,
      //   "stores"
      // );

      return () => {
        stores.forEach((store) => {
          const exchangeName =
            Array.from(multiWebSocketCoordinator["stores"].entries()).find(
              ([_, s]) => s === store
            )?.[0] || "";
          const handler = storeHandlers.get(exchangeName);
          if (handler) {
            store.getState().removeMessageListener(handler);
          }
        });
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        // console.log(
        //   "[ActivePositionManagement] WebSocket listeners cleaned up"
        // );
      };
    }, [positions]); // currentExchangeRate 제거 - ref로 관리

    // Dashboard Store에서 Exit Average Price 구독 (더 이상 사용하지 않음 - 실시간 오더북 사용)
    // const { krExitAveragePrice, frExitAveragePrice } = useDashboardStore();

    // 모든 포지션의 가격 및 수익 정보 업데이트 (useMemo로 계산 최적화)
    const positionBalances = useMemo(() => {
      // 포지션이 없으면 빈 맵 반환
      if (positions.length === 0) {
        return new Map<string, PositionBalance>();
      }

      const newBalances = new Map<string, PositionBalance>();

      for (const position of positions) {
        try {
          // 실시간 오더북 데이터에서 평균 가격 가져오기
          const realtimePrice = realtimePrices.get(position.coinSymbol);

          // 실시간 가격이 없으면 해당 포지션은 계산하지 않음
          if (
            !realtimePrice ||
            realtimePrice.krExitPrice === 0 ||
            realtimePrice.frExitPrice === 0
          ) {
            continue;
          }

          const krExitAveragePrice = realtimePrice.krExitPrice;
          const frExitAveragePrice = realtimePrice.frExitPrice;

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
            lastUpdated: realtimePrice.lastUpdated,
            leverage: position.leverage,
          });
        } catch (error) {
          console.error(
            `포지션 잔액 업데이트 실패 (${position.coinSymbol}):`,
            error
          );
        }
      }

      return newBalances;
    }, [positions, currentExchangeRate, realtimePrices]);

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
          <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
            <div className="sm:static absolute right-0 top-0 sm:right-0 sm:top-0 z-10">
              <Badge variant="secondary" className="gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                실시간
              </Badge>
            </div>
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
                      {(() => {
                        const total = Array.from(
                          positionBalances.values()
                        ).reduce(
                          (sum, balance) =>
                            sum + balance.krBalanceKrw + balance.frBalanceKrw,
                          0
                        );
                        return total === 0 ? "-" : formatKRW(total);
                      })()}
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
                      {(() => {
                        const totalInvestment = Array.from(
                          positionBalances.values()
                        ).reduce(
                          (sum, balance) => sum + balance.totalInvestment,
                          0
                        );
                        return totalInvestment === 0
                          ? "-"
                          : formatKRW(totalInvestment);
                      })()}
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
                          KR 거래소
                        </th>
                        <th className="w-28 px-4 py-4 text-right text-xs font-semibold text-gray-200 dark:text-gray-100 uppercase tracking-wider">
                          FR 거래소
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
                          FR 레버리지
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
                            <td className="px-4 py-4 text-center">
                              <span className="font-bold text-base">
                                {position.krExchange?.toUpperCase() || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="font-bold text-base">
                                {position.frExchange?.toUpperCase() || "-"}
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
                            <td className="px-4 py-4 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                              {position.leverage
                                ? position.leverage + "x"
                                : "-"}
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
