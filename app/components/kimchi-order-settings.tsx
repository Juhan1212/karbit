import React, { useState, useEffect, useMemo } from "react";
import RealtimeOrderBook from "./orderbook";
import { createWebSocketStore } from "../stores/chartState";
import { motion } from "framer-motion";
import type { StoreApi } from "zustand";
import type { WebSocketState } from "../stores/chartState";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { formatKRW } from "~/utils/decimal";

type OrderData = {
  krExchange: string;
  frExchange: string;
  orderAmount: number;
  leverage: number;
  krBalance: number;
  frBalance: number;
};

type TickPayload = {
  symbol: string;
  premium?: number;
  krPrice?: number;
  globalPrice?: number;
  ts?: number;
  korean_ex?: string;
  foreign_ex?: string;
  ex_rates?: Array<{ seed: number; ex_rate: number }>;
};

interface KimchiOrderSettingsProps {
  exchangeBalances: Array<{
    name: string;
    krwBalance: number;
    currency: string;
  }>;
  selectedItem?: TickPayload;
  koreanWebSocketStore?: StoreApi<WebSocketState> | null;
  foreignWebSocketStore?: StoreApi<WebSocketState> | null;
  tetherPrice?: number | null;
  legalExchangeRate?: number | null;
}

export default function KimchiOrderSettings({
  exchangeBalances,
  selectedItem,
  koreanWebSocketStore,
  foreignWebSocketStore,
  tetherPrice,
  legalExchangeRate,
}: KimchiOrderSettingsProps) {
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [krAveragePrice, setKrAveragePrice] = useState<number | null>(null);
  const [frAveragePrice, setFrAveragePrice] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadingButtons, setLoadingButtons] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    symbol: string;
    koreanEx: string;
    foreignEx: string;
    orderAmount: number;
    leverage: number;
  } | null>(null);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // orderData 초기화
  const exchangeBalancesStr = useMemo(
    () => JSON.stringify(exchangeBalances),
    [exchangeBalances]
  );

  useEffect(() => {
    if (!Array.isArray(exchangeBalances) || exchangeBalances.length < 2) {
      setOrderData([]);
      return;
    }

    const exchangeNameMap: Record<string, string> = {
      빗썸: "bithumb",
      업비트: "upbit",
      바이빗: "bybit",
      바이낸스: "binance",
      OKX: "okx",
    };

    const krExchanges = exchangeBalances.filter((e) => e.currency === "KRW");
    const frExchanges = exchangeBalances.filter((e) => e.currency !== "KRW");
    const newOrderData: OrderData[] = [];

    krExchanges.forEach((kr) => {
      frExchanges.forEach((fr) => {
        if (kr.krwBalance != null && fr.krwBalance != null) {
          const minBalance = Math.min(kr.krwBalance, fr.krwBalance);
          const truncatedBalance = Math.floor(minBalance / 10000) * 10000;
          newOrderData.push({
            krExchange: exchangeNameMap[kr.name] || kr.name,
            frExchange: exchangeNameMap[fr.name] || fr.name,
            orderAmount: truncatedBalance,
            leverage: 1,
            krBalance: kr.krwBalance,
            frBalance: fr.krwBalance,
          });
        }
      });
    });
    setOrderData(newOrderData);
  }, [exchangeBalancesStr]);

  const krExchanges = exchangeBalances.filter((e) => e.currency === "KRW");
  const frExchanges = exchangeBalances.filter((e) => e.currency !== "KRW");

  const pairs: Array<{
    kr: (typeof krExchanges)[0];
    fr: (typeof frExchanges)[0];
  }> = [];

  krExchanges.forEach((kr) => {
    frExchanges.forEach((fr) => {
      pairs.push({ kr, fr });
    });
  });

  const currentPair =
    pairs.length > 0
      ? pairs[Math.min(currentPairIndex, pairs.length - 1)]
      : null;
  const currentOrder =
    orderData.length > 0
      ? orderData[Math.min(currentPairIndex, orderData.length - 1)]
      : null;

  // WebSocket 스토어 생성 (항상 useMemo 호출하여 Hook 순서 유지)
  const krStore = useMemo(() => {
    if (!selectedItem || !currentPair) return null;
    if (koreanWebSocketStore) return koreanWebSocketStore;
    return createWebSocketStore({
      exchange: currentPair.kr.name.toLowerCase(),
      symbol: selectedItem.symbol,
      interval: "1m",
    });
  }, [koreanWebSocketStore, selectedItem, currentPair?.kr.name]);

  const frStore = useMemo(() => {
    if (!selectedItem || !currentPair) return null;
    if (foreignWebSocketStore) return foreignWebSocketStore;
    return createWebSocketStore({
      exchange: currentPair.fr.name.toLowerCase(),
      symbol: selectedItem.symbol,
      interval: "1m",
    });
  }, [foreignWebSocketStore, selectedItem, currentPair?.fr.name]);

  // 프리미엄 계산 (항상 최상위 레벨에서 호출)
  const premiums = useMemo(() => {
    if (!krAveragePrice || !frAveragePrice) {
      return {
        tetherPremium: null,
        legalPremium: null,
      };
    }

    const exchangeRate = krAveragePrice / frAveragePrice;

    const tetherPremium = tetherPrice
      ? ((exchangeRate - tetherPrice) / tetherPrice) * 100
      : null;

    const legalPremium = legalExchangeRate
      ? ((exchangeRate - legalExchangeRate) / legalExchangeRate) * 100
      : null;

    return {
      tetherPremium,
      legalPremium,
    };
  }, [krAveragePrice, frAveragePrice, tetherPrice, legalExchangeRate]);

  if (pairs.length === 0) return null;
  if (!currentPair || !currentOrder) return null;
  const maxBalance = Math.min(
    currentOrder.krBalance,
    currentOrder.frBalance * currentOrder.leverage
  );

  const increaseLeverage = () => {
    setOrderData((prev) => {
      const newData = [...prev];
      if (newData[currentPairIndex]) {
        newData[currentPairIndex].leverage++;
        const newMax = Math.min(
          newData[currentPairIndex].krBalance,
          newData[currentPairIndex].frBalance *
            newData[currentPairIndex].leverage
        );
        newData[currentPairIndex].orderAmount =
          Math.floor(newMax / 10000) * 10000;
      }
      return newData;
    });
  };

  const decreaseLeverage = () => {
    setOrderData((prev) => {
      const newData = [...prev];
      if (newData[currentPairIndex] && newData[currentPairIndex].leverage > 1) {
        newData[currentPairIndex].leverage--;
        const newMax = Math.min(
          newData[currentPairIndex].krBalance,
          newData[currentPairIndex].frBalance *
            newData[currentPairIndex].leverage
        );
        newData[currentPairIndex].orderAmount =
          Math.floor(newMax / 10000) * 10000;
      }
      return newData;
    });
  };

  const updateOrderAmount = (value: number) => {
    setOrderData((prev) => {
      const newData = [...prev];
      if (newData[currentPairIndex]) {
        newData[currentPairIndex].orderAmount = value;
      }
      return newData;
    });
  };

  const startEntryAnimation = () => {
    // 애니메이션 기능 제거됨
  };

  // 포지션 진입 로딩 상태 관리
  const setButtonLoading = (symbol: string, loading: boolean) => {
    setLoadingButtons((prev) => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(symbol);
      } else {
        newSet.delete(symbol);
      }
      return newSet;
    });
  };

  const isButtonLoading = (symbol: string) => {
    return loadingButtons.has(symbol);
  };

  // 컨펌 창 열기
  const openConfirmDialog = (
    symbol: string,
    koreanEx?: string,
    foreignEx?: string
  ) => {
    const order = orderData.find(
      (o) => o.krExchange === koreanEx && o.frExchange === foreignEx
    );
    if (!order) {
      toast.error("주문 정보를 찾을 수 없습니다");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      symbol,
      koreanEx: koreanEx || "",
      foreignEx: foreignEx || "",
      orderAmount: order.orderAmount,
      leverage: order.leverage,
    });
  };

  // 컨펌 창에서 주문 확인
  const handleConfirmOrder = async () => {
    if (!confirmDialog) return;
    const { symbol, koreanEx, foreignEx } = confirmDialog;
    setConfirmDialog(null);
    await handleOpenPosition(symbol, koreanEx, foreignEx);
  };

  // 포지션 진입 핸들러
  const handleOpenPosition = async (
    symbol: string,
    koreanEx?: string,
    foreignEx?: string
  ) => {
    setButtonLoading(symbol, true);
    try {
      const order = orderData.find(
        (o) => o.krExchange === koreanEx && o.frExchange === foreignEx
      );
      const amount = order ? order.orderAmount : undefined;
      const leverage = order ? order.leverage : 1;

      if (!amount || !leverage) {
        toast.error("주문금액 또는 레버리지가 설정되지 않았습니다");
        return;
      }

      const res = await fetch("/api/open-position", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coinSymbol: symbol,
          krExchange: koreanEx?.toUpperCase(),
          frExchange: foreignEx?.toUpperCase(),
          amount,
          leverage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${symbol} 포지션진입 성공!`);
      } else {
        toast.error(data.message || `${symbol} 포지션진입 실패`);
        // 거래소 인증 에러인 경우 리다이렉트
        if (data.redirectTo) {
          setTimeout(() => {
            window.location.href = data.redirectTo;
          }, 1000);
        }
      }
    } catch (error) {
      toast.error(`포지션진입 실패: ${error}`);
    } finally {
      setButtonLoading(symbol, false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              김치 프리미엄 트레이딩
            </h2>
            <p className="text-slate-400">수동매매</p>
          </motion.div>

          {/* Pair Selector */}
          {pairs.length > 1 && (
            <div className="flex gap-2 justify-center mb-6 flex-wrap">
              {pairs.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPairIndex(idx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentPairIndex === idx
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {pair.kr.name} ↔ {pair.fr.name}
                </button>
              ))}
            </div>
          )}

          {/* Main Animation Area */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-6 lg:p-8">
              <div className="relative">
                {/* Trading Platforms */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
                  {/* Korean Exchange */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="border-2 border-green-500/30 bg-green-500/5 rounded-xl">
                      <div className="p-6">
                        <div className="text-center space-y-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-white mb-1">
                              🇰🇷 {currentPair.kr.name}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">
                              한국 거래소
                            </p>
                            <div className="space-y-2">
                              <div className="text-2xl text-white">
                                {currentOrder.krBalance.toLocaleString()}원
                              </div>
                              KRW
                              <div className="text-xs text-slate-400">
                                (단위:만원)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Center Area */}
                  {selectedItem ? (
                    <div className="flex flex-col items-center justify-center gap-4 relative">
                      {/* Order Settings */}
                      <div className="w-full max-w-xs space-y-4">
                        {/* Leverage Control */}
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-300">
                              해외거래소 레버리지
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={decreaseLeverage}
                                disabled={currentOrder.leverage <= 1}
                                className="w-8 h-8 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-30 text-white font-bold"
                              >
                                -
                              </button>
                              <span className="text-lg font-bold text-blue-400 min-w-[3rem] text-center">
                                {currentOrder.leverage}x
                              </span>
                              <button
                                onClick={increaseLeverage}
                                className="w-8 h-8 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Order Amount */}
                        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-medium text-slate-300">
                              주문금액
                            </label>
                            <span className="text-sm font-semibold text-white">
                              {currentOrder.orderAmount.toLocaleString()}원
                            </span>
                          </div>
                          <input
                            type="range"
                            value={currentOrder.orderAmount}
                            onChange={(e) =>
                              updateOrderAmount(Number(e.target.value))
                            }
                            min={10000}
                            max={maxBalance}
                            step={10000}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-2">
                            <span>0원</span>
                            <span>최대: {maxBalance.toLocaleString()}원</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Placeholder when no ticker is selected */
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-slate-700 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-slate-400">
                            티커 선택 필요
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-slate-400 text-sm">
                        프리미엄 티커에서 코인을 선택해주세요
                      </div>
                    </div>
                  )}

                  {/* Global Exchange */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <div className="border-2 border-red-500/30 bg-red-500/5 rounded-xl">
                      <div className="p-6">
                        <div className="text-center space-y-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                              <TrendingDown className="w-6 h-6 text-red-500" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-white mb-1">
                              🌎 {currentPair.fr.name}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">
                              해외 거래소
                            </p>
                            <div className="space-y-2">
                              <div className="text-2xl text-white">
                                {currentOrder.frBalance.toLocaleString()}원
                              </div>
                              KRW 환산 주문가능금액
                              <div className="text-xs text-slate-400">
                                (단위:만원)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Orderbook Section */}
        {selectedItem && (
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Korean Exchange Orderbook */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                <RealtimeOrderBook
                  exchange={currentPair.kr.name.toLowerCase()}
                  symbol={`${selectedItem.symbol}`}
                  store={krStore!}
                  title={`${currentPair.kr.name} 오더북`}
                  orderAmount={currentOrder?.orderAmount}
                  onAveragePriceUpdate={setKrAveragePrice}
                />
              </div>

              {/* Center Exchange Rate Display */}
              <div className="flex items-center justify-center">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 w-full max-w-sm">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">
                        {selectedItem.symbol} <br />
                        주문금액 시장가 진입시 <br />
                        실시간 환율
                      </h3>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold text-blue-400">
                          ₩
                          {krAveragePrice && frAveragePrice
                            ? (krAveragePrice / frAveragePrice).toFixed(2)
                            : "계산중..."}
                        </div>
                        <div className="text-sm text-slate-400">
                          KR: ₩{krAveragePrice?.toLocaleString() || "N/A"} | FR:
                          ₩{frAveragePrice?.toLocaleString() || "N/A"}
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() =>
                              openConfirmDialog(
                                selectedItem.symbol,
                                currentOrder.krExchange,
                                currentOrder.frExchange
                              )
                            }
                            disabled={isButtonLoading(selectedItem.symbol)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                          >
                            {isButtonLoading(selectedItem.symbol)
                              ? "진입중..."
                              : "포지션 진입"}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {premiums.tetherPremium !== null && (
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                premiums.tetherPremium > 0
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              <span>테더대비 프리미엄</span>
                              <span>
                                {premiums.tetherPremium > 0 ? "+" : ""}
                                {premiums.tetherPremium.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {premiums.legalPremium !== null && (
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                                premiums.legalPremium > 0
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              }`}
                            >
                              <span>법정화폐대비 프리미엄</span>
                              <span>
                                {premiums.legalPremium > 0 ? "+" : ""}
                                {premiums.legalPremium.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                      {currentTime.toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Foreign Exchange Orderbook */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                <RealtimeOrderBook
                  exchange={currentPair.fr.name.toLowerCase()}
                  symbol={`${selectedItem.symbol}`}
                  store={frStore!}
                  title={`${currentPair.fr.name} 오더북`}
                  orderAmount={currentOrder?.orderAmount}
                  onAveragePriceUpdate={setFrAveragePrice}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={confirmDialog?.isOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>포지션 진입 확인</DialogTitle>
            <DialogDescription>
              아래 정보로 포지션을 진입하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  심볼
                </label>
                <p className="text-lg font-semibold">{confirmDialog?.symbol}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  한국거래소
                </label>
                <p className="text-lg font-semibold">
                  {confirmDialog?.koreanEx}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  해외거래소
                </label>
                <p className="text-lg font-semibold">
                  {confirmDialog?.foreignEx}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  레버리지
                </label>
                <p className="text-lg font-semibold">
                  {confirmDialog?.leverage}x
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                주문금액
              </label>
              <p className="text-xl font-bold text-primary">
                {formatKRW(confirmDialog?.orderAmount || 0)}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• 한국거래소: 매수 (Long)</p>
              <p>• 해외거래소: 매도 (Short)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              취소
            </Button>
            <Button
              onClick={handleConfirmOrder}
              disabled={isButtonLoading(confirmDialog?.symbol || "")}
            >
              {isButtonLoading(confirmDialog?.symbol || "") ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  처리중...
                </>
              ) : (
                "진입 확인"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
