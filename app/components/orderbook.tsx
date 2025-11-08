import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { Activity, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { createWebSocketStore } from "../stores/chartState";
import type { OrderBookData } from "../types/marketInfo";
import { useStore } from "zustand/react";

// ============================================
// 타입 정의
// ============================================
interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

// ============================================
// 평균 가격 계산 함수
// ============================================
const calculateAveragePrice = (
  entries: OrderBookEntry[],
  orderAmount: number,
  type: "ask" | "bid",
  isKoreanExchange: boolean,
  tetherPrice?: number | null
): number => {
  if (!entries.length || !orderAmount) return 0;

  // orderAmount가 음수일 경우 100만원(1,000,000 KRW)을 기본값으로 사용
  const calculationAmount = orderAmount > 0 ? orderAmount : 1000000;

  // 해외거래소의 경우 orderAmount를 USDT로 변환 (KRW 기준 orderAmount를 tetherPrice로 나누어 USDT 금액 계산)
  const effectiveOrderAmount = isKoreanExchange
    ? calculationAmount
    : tetherPrice
      ? calculationAmount / tetherPrice
      : calculationAmount;

  // 정렬: ask는 가격 오름차순 (최저가부터), bid는 가격 내림차순 (최고가부터)
  const sortedEntries = [...entries].sort((a, b) => {
    return type === "ask" ? a.price - b.price : b.price - a.price;
  });

  let totalValue = 0; // 총 금액 (KRW 또는 USDT)
  let totalVolume = 0; // 총 수량 (코인)
  let remainingAmount = effectiveOrderAmount; // 남은 주문 금액

  for (const entry of sortedEntries) {
    if (remainingAmount <= 0) break;

    // entry.total은 해당 호가의 총 금액 (price * amount)
    // remainingAmount는 주문 금액
    const useValue = Math.min(remainingAmount, entry.total);

    // 사용할 코인 수량 계산: 금액 / 가격 = 수량
    const useVolume = useValue / entry.price;

    totalValue += useValue;
    totalVolume += useVolume;
    remainingAmount -= useValue;
  }

  // 평균 가격 = 총 금액 / 총 수량
  return totalVolume > 0 ? totalValue / totalVolume : 0;
};

// ============================================
// 코인 수량 기반 평균 가격 계산 함수 (종료 시 사용)
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

  const averagePriceInLocalCurrency = totalValue / totalVolume;

  // // 해외 거래소의 경우 USDT 가격을 KRW로 환산
  // if (!isKoreanExchange && tetherPrice) {
  //   return averagePriceInLocalCurrency * tetherPrice;
  // }

  return averagePriceInLocalCurrency;
};

// ============================================
// 최적화된 개별 Row 컴포넌트 (memo로 불필요한 리렌더 방지)
// ============================================
const OrderBookRow = memo<{
  entry: OrderBookEntry;
  maxTotal: number;
  type: "bid" | "ask";
  exchange: string;
  onSelect: (entry: OrderBookEntry) => void;
}>(({ entry, maxTotal, type, exchange, onSelect }) => {
  const percentage = (entry.total / maxTotal) * 100;
  const isAsk = type === "ask";

  return (
    <div
      className={`relative cursor-pointer transition-colors duration-150 ${
        isAsk ? "hover:bg-red-500/5" : "hover:bg-green-500/5"
      }`}
      onClick={() => onSelect(entry)}
    >
      {/* 배경 바 - CSS transition으로 부드럽게 */}
      <div
        className={`absolute right-0 top-0 h-full transition-all duration-300 ease-out ${
          isAsk ? "bg-red-500/10" : "bg-green-500/10"
        }`}
        style={{ width: `${percentage}%` }}
      />

      {/* 데이터 */}
      <div className="relative grid grid-cols-3 gap-2 px-4 py-1.5 text-sm">
        <div
          className={`font-mono ${isAsk ? "text-red-400" : "text-green-400"}`}
        >
          {entry.price.toLocaleString("ko-KR", {
            maximumFractionDigits: 10,
            minimumFractionDigits: 0,
          })}
        </div>
        <div className="text-white font-mono text-right">
          {entry.amount.toFixed(4)}
        </div>
        <div className="text-slate-400 font-mono text-right text-xs">
          {entry.total.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
});

OrderBookRow.displayName = "OrderBookRow";

// ============================================
// 메인 컴포넌트
// ============================================
interface RealtimeOrderBookProps {
  exchange: string;
  symbol: string;
  store: ReturnType<typeof createWebSocketStore>; // WebSocket 스토어
  title?: string;
  orderAmount?: number; // 주문금액
  onAveragePriceUpdate?: (averagePrice: number) => void; // 평균 가격 업데이트 콜백
  tetherPrice?: number | null; // 테더 가격 (USDT/KRW 환율)
  currentPosition?: any; // 현재 포지션 정보
  onExitAveragePriceUpdate?: (exitAveragePrice: number) => void; // 종료 시 평균 가격 업데이트 콜백
}

export default function RealtimeOrderBook({
  exchange,
  symbol,
  store,
  title = "실시간 오더북",
  orderAmount,
  onAveragePriceUpdate,
  tetherPrice,
  currentPosition,
  onExitAveragePriceUpdate,
}: RealtimeOrderBookProps) {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [],
    asks: [],
    timestamp: Date.now(),
  });
  const [selectedEntry, setSelectedEntry] = useState<OrderBookEntry | null>(
    null
  );

  // RAF를 사용한 스로틀링
  const rafRef = useRef<number | undefined>(undefined);
  const pendingUpdateRef = useRef<OrderBookData | null>(null);

  // 현재 symbol을 참조하기 위한 ref
  const symbolRef = useRef(symbol);

  // symbol이 변경될 때마다 ref 업데이트 및 orderBook 초기화
  useEffect(() => {
    symbolRef.current = symbol;
    // symbol이 변경되면 오더북 초기화
    setOrderBook({
      bids: [],
      asks: [],
      timestamp: Date.now(),
    });
    pendingUpdateRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  }, [symbol]);

  // 스토어에서 연결 상태 가져오기
  const isConnected = useStore(store, (state) => state.isConnected);

  // 최대 total 값 계산 (useMemo로 캐싱)
  const maxTotal = useMemo(() => {
    const maxBid = Math.max(...orderBook.bids.map((b) => b.total), 0);
    const maxAsk = Math.max(...orderBook.asks.map((a) => a.total), 0);
    return Math.max(maxBid, maxAsk);
  }, [orderBook.bids, orderBook.asks]);

  // 스프레드 계산 (useMemo로 캐싱)
  const { spread, spreadPercent } = useMemo(() => {
    const s =
      orderBook.asks[0] && orderBook.bids[0]
        ? orderBook.asks[0].price - orderBook.bids[0].price
        : 0;
    const sp = orderBook.bids[0] ? (s / orderBook.bids[0].price) * 100 : 0;
    return { spread: s, spreadPercent: sp };
  }, [orderBook.asks, orderBook.bids]);

  // RequestAnimationFrame을 사용한 부드러운 업데이트
  const updateOrderBook = (newData: OrderBookData) => {
    pendingUpdateRef.current = newData;

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setOrderBook(pendingUpdateRef.current);

          const isKoreanExchange =
            exchange === "빗썸" ||
            exchange === "업비트" ||
            exchange === "upbit" ||
            exchange === "bithumb";

          // 1. 진입 시 평균 가격 계산 (orderAmount가 있을 때 - 음수일 경우에도 계산)
          if (orderAmount !== undefined && onAveragePriceUpdate) {
            const entryType = isKoreanExchange ? "ask" : "bid";
            const entryEntries = isKoreanExchange
              ? pendingUpdateRef.current.asks
              : pendingUpdateRef.current.bids;

            // 오더북 데이터가 실제로 있는지 확인
            if (entryEntries && entryEntries.length > 0) {
              const entryAveragePrice = calculateAveragePrice(
                entryEntries,
                orderAmount,
                entryType,
                isKoreanExchange,
                tetherPrice
              );

              // 유효한 값일 때만 업데이트
              if (entryAveragePrice > 0) {
                onAveragePriceUpdate(entryAveragePrice);
              }
            }
          }

          // 2. 종료 시 평균 가격 계산 (포지션이 있을 때)
          if (currentPosition && onExitAveragePriceUpdate) {
            // 종료 시: 한국 거래소는 매도(bid), 해외 거래소는 매수(ask)
            const exitType = isKoreanExchange ? "bid" : "ask";
            const exitEntries = isKoreanExchange
              ? pendingUpdateRef.current.bids
              : pendingUpdateRef.current.asks;

            // 포지션의 코인 수량 사용
            const positionVolume = isKoreanExchange
              ? currentPosition.totalKrVolume || 0
              : currentPosition.totalFrVolume || 0;

            // 오더북 데이터와 포지션 볼륨이 유효한지 확인
            if (exitEntries && exitEntries.length > 0 && positionVolume > 0) {
              const exitAveragePrice = calculateAveragePriceByVolume(
                exitEntries,
                positionVolume,
                exitType,
                isKoreanExchange,
                tetherPrice
              );

              // 유효한 값일 때만 업데이트
              if (exitAveragePrice > 0) {
                onExitAveragePriceUpdate(exitAveragePrice);
              }
            }
          }

          pendingUpdateRef.current = null;
        }
        rafRef.current = undefined;
      });
    }
  };

  // ==================== orderAmount 변경 시 재계산 ====================
  useEffect(() => {
    // orderAmount가 변경되면 현재 오더북 데이터로 평균 가격 재계산
    if (!orderBook.bids.length && !orderBook.asks.length) return;
    if (orderAmount === undefined) return;

    const isKoreanExchange =
      exchange === "빗썸" ||
      exchange === "업비트" ||
      exchange === "upbit" ||
      exchange === "bithumb";

    // 진입 시 평균 가격 재계산
    if (onAveragePriceUpdate) {
      const entryType = isKoreanExchange ? "ask" : "bid";
      const entryEntries = isKoreanExchange ? orderBook.asks : orderBook.bids;

      if (entryEntries && entryEntries.length > 0) {
        const entryAveragePrice = calculateAveragePrice(
          entryEntries,
          orderAmount,
          entryType,
          isKoreanExchange,
          tetherPrice
        );

        if (entryAveragePrice > 0) {
          onAveragePriceUpdate(entryAveragePrice);
        }
      }
    }
  }, [orderAmount, orderBook, exchange, tetherPrice, onAveragePriceUpdate]);

  // ==================== WebSocket Store 연결 ====================
  useEffect(() => {
    // orderbook 데이터 리스너 등록 (ref를 사용하여 최신 symbol 참조)
    const handleMessage = (data: any) => {
      // symbolRef.current를 사용하여 최신 symbol과 비교
      if (data.channel === "orderbook" && data.symbol === symbolRef.current) {
        updateOrderBook(data);
      }
    };

    store.getState().addMessageListener(handleMessage);

    // 초기 데이터 요청 - store가 준비되면 즉시 연결 상태 확인
    const checkConnection = () => {
      const state = store.getState();
      if (!state.isConnected) {
        // WebSocket이 연결되지 않은 경우 재연결 시도
        // (주의: 이 로직은 상위 컴포넌트에서 이미 연결 관리를 하고 있다면 제거 가능)
      }
    };

    checkConnection();

    return () => {
      store.getState().removeMessageListener(handleMessage);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [store]); // symbol 제거하고 store만 의존성으로
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-full py-10 px-4">
      <div className="max-w-full mx-auto h-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold text-white mb-1 whitespace-nowrap">
                {title}
              </h2>
              <p className="text-slate-400 text-xs whitespace-nowrap">
                {exchange.toUpperCase()} · {symbol}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs ${
                  isConnected
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span>실시간</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>연결 끊김</span>
                  </>
                )}
              </div>

              {/* <button
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                disabled
              >
                <RefreshCw className="w-4 h-4" />
              </button> */}
            </div>
          </div>

          {/* 스프레드 정보 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">최고 매수가</div>
              <div className="text-green-400 font-bold text-sm">
                {orderBook.bids[0]
                  ? orderBook.bids[0].price.toLocaleString("ko-KR", {
                      maximumFractionDigits: 10,
                      minimumFractionDigits: 0,
                    })
                  : "-"}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">스프레드</div>
              <div className="text-yellow-400 font-bold text-sm">
                {spread.toLocaleString("ko-KR", {
                  maximumFractionDigits: 10,
                  minimumFractionDigits: 0,
                })}{" "}
                ({spreadPercent.toFixed(3)}%)
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">최저 매도가</div>
              <div className="text-red-400 font-bold text-sm">
                {orderBook.asks[0]
                  ? orderBook.asks[0].price.toLocaleString("ko-KR", {
                      maximumFractionDigits: 10,
                      minimumFractionDigits: 0,
                    })
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Orderbook Content - 세로 통합 레이아웃 */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-medium text-slate-400">
            <div>
              가격(
              {exchange === "빗썸" || exchange === "업비트" ? "KRW" : "USDT"})
            </div>
            <div className="text-right">수량</div>
            <div className="text-right">총액</div>
          </div>

          {/* 매도 호가 (Asks) - 역순으로 표시 */}
          <div className="space-y-0.5 py-2">
            {orderBook.asks
              .slice(0, 10)
              .reverse()
              .map((ask, index) => (
                <OrderBookRow
                  key={`ask-${index}`}
                  entry={ask}
                  maxTotal={maxTotal}
                  type="ask"
                  exchange={exchange}
                  onSelect={setSelectedEntry}
                />
              ))}
          </div>

          {/* 현재가 구분선 */}
          <div className="relative py-3 px-4 bg-slate-900/80 border-y-2 border-yellow-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-bold text-sm">현재가</span>
            </div>
            <div className="text-white font-bold text-lg font-mono">
              {orderBook.bids[0]
                ? orderBook.bids[0].price.toLocaleString("ko-KR", {
                    maximumFractionDigits: 10,
                    minimumFractionDigits: 0,
                  })
                : "-"}
            </div>
          </div>

          {/* 매수 호가 (Bids) */}
          <div className="space-y-0.5 py-2">
            {orderBook.bids.slice(0, 10).map((bid, index) => (
              <OrderBookRow
                key={`bid-${index}`}
                entry={bid}
                maxTotal={maxTotal}
                type="bid"
                exchange={exchange}
                onSelect={setSelectedEntry}
              />
            ))}
          </div>
        </div>

        {/* 선택된 항목 정보 */}
        {selectedEntry && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs mb-1">선택된 호가</div>
                <div className="text-white font-bold text-lg">
                  {selectedEntry.price.toLocaleString("ko-KR", {
                    maximumFractionDigits: 10,
                    minimumFractionDigits: 0,
                  })}{" "}
                  {exchange === "빗썸" || exchange === "업비트"
                    ? "KRW"
                    : "USDT"}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1 text-right">
                  수량
                </div>
                <div className="text-blue-400 font-bold text-lg">
                  {selectedEntry.amount.toFixed(4)} BTC
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1 text-right">
                  총액
                </div>
                <div className="text-slate-300 font-bold text-lg">
                  {selectedEntry.total.toLocaleString("ko-KR", {
                    maximumFractionDigits: 10,
                    minimumFractionDigits: 0,
                  })}{" "}
                  {exchange === "빗썸" || exchange === "업비트"
                    ? "KRW"
                    : "USDT"}
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="mt-4 text-center text-slate-500 text-xs">
          마지막 업데이트:{" "}
          {new Date(orderBook.timestamp).toLocaleTimeString("ko-KR")}
        </div>
      </div>
    </div>
  );
}
