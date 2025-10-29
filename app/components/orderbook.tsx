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
  type: "ask" | "bid"
): number => {
  if (!entries.length || !orderAmount) return 0;

  // 정렬: ask는 가격 오름차순 (최저가부터), bid는 가격 내림차순 (최고가부터)
  const sortedEntries = [...entries].sort((a, b) => {
    return type === "ask" ? a.price - b.price : b.price - a.price;
  });

  let totalValue = 0;
  let totalAmount = 0;
  let remainingAmount = orderAmount;

  for (const entry of sortedEntries) {
    if (remainingAmount <= 0) break;

    const useAmount = Math.min(remainingAmount, entry.amount);
    totalValue += entry.price * useAmount;
    totalAmount += useAmount;
    remainingAmount -= useAmount;
  }

  return totalAmount > 0 ? totalValue / totalAmount : 0;
};

// ============================================
// 최적화된 개별 Row 컴포넌트 (memo로 불필요한 리렌더 방지)
// ============================================
const OrderBookRow = memo<{
  entry: OrderBookEntry;
  maxTotal: number;
  type: "bid" | "ask";
  onSelect: (entry: OrderBookEntry) => void;
}>(({ entry, maxTotal, type, onSelect }) => {
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
          {entry.price.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}
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
}

export default function RealtimeOrderBook({
  exchange,
  symbol,
  store,
  title = "실시간 오더북",
  orderAmount,
  onAveragePriceUpdate,
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

          // 평균 가격 계산 및 콜백 호출
          if (orderAmount && onAveragePriceUpdate) {
            const isKoreanExchange =
              exchange === "bithumb" || exchange === "upbit";
            const type = isKoreanExchange ? "ask" : "bid";
            const entries = isKoreanExchange
              ? pendingUpdateRef.current.asks
              : pendingUpdateRef.current.bids;
            const averagePrice = calculateAveragePrice(
              entries,
              orderAmount,
              type
            );
            onAveragePriceUpdate(averagePrice);
          }

          pendingUpdateRef.current = null;
        }
        rafRef.current = undefined;
      });
    }
  };

  // ==================== WebSocket Store 연결 ====================
  useEffect(() => {
    // orderbook 데이터 리스너 등록
    const handleMessage = (data: any) => {
      if (data.channel === "orderbook" && data.symbol === symbol) {
        updateOrderBook(data);
      }
    };

    store.getState().addMessageListener(handleMessage);
    // connectWebSocket은 CompChart에서 이미 호출하므로 여기서는 제거

    return () => {
      store.getState().removeMessageListener(handleMessage);
      // disconnectWebSocket도 CompChart에서 관리하므로 여기서는 제거
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [store, symbol]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-full py-10 px-4">
      <div className="max-w-full mx-auto h-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
              <p className="text-slate-400 text-xs">
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

              <button
                className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                disabled
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 스프레드 정보 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">최고 매수가</div>
              <div className="text-green-400 font-bold text-sm">
                {orderBook.bids[0]
                  ? orderBook.bids[0].price.toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">스프레드</div>
              <div className="text-yellow-400 font-bold text-sm">
                {spread.toLocaleString()} ({spreadPercent.toFixed(3)}%)
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">최저 매도가</div>
              <div className="text-red-400 font-bold text-sm">
                {orderBook.asks[0]
                  ? orderBook.asks[0].price.toLocaleString()
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Orderbook Content - 세로 통합 레이아웃 */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-slate-900/50 border-b border-slate-700 text-xs font-medium text-slate-400">
            <div>가격(KRW)</div>
            <div className="text-right">수량</div>
            <div className="text-right">총액</div>
          </div>

          {/* 매도 호가 (Asks) - 역순으로 표시 */}
          <div className="space-y-0.5 py-2">
            {orderBook.asks
              .slice(0, 10)
              .reverse()
              .map((ask, index) => {
                const percentage = (ask.total / maxTotal) * 100;
                return (
                  <div
                    key={`ask-${index}`}
                    className="relative cursor-pointer hover:bg-red-500/5 transition-colors"
                    onClick={() => setSelectedEntry(ask)}
                  >
                    <div
                      className="absolute right-0 top-0 h-full bg-red-500/10 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative grid grid-cols-3 gap-2 px-4 py-1.5 text-sm">
                      <div className="text-red-400 font-mono">
                        {ask.price.toLocaleString()}
                      </div>
                      <div className="text-white font-mono text-right">
                        {ask.amount.toFixed(4)}
                      </div>
                      <div className="text-slate-400 font-mono text-right text-xs">
                        {ask.total.toLocaleString("ko-KR", {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* 현재가 구분선 */}
          <div className="relative py-3 px-4 bg-slate-900/80 border-y-2 border-yellow-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-bold text-sm">현재가</span>
            </div>
            <div className="text-white font-bold text-lg font-mono">
              {orderBook.bids[0]
                ? orderBook.bids[0].price.toLocaleString()
                : "-"}
            </div>
          </div>

          {/* 매수 호가 (Bids) */}
          <div className="space-y-0.5 py-2">
            {orderBook.bids.slice(0, 10).map((bid, index) => {
              const percentage = (bid.total / maxTotal) * 100;
              return (
                <div
                  key={`bid-${index}`}
                  className="relative cursor-pointer hover:bg-green-500/5 transition-colors"
                  onClick={() => setSelectedEntry(bid)}
                >
                  <div
                    className="absolute right-0 top-0 h-full bg-green-500/10 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="relative grid grid-cols-3 gap-2 px-4 py-1.5 text-sm">
                    <div className="text-green-400 font-mono">
                      {bid.price.toLocaleString()}
                    </div>
                    <div className="text-white font-mono text-right">
                      {bid.amount.toFixed(4)}
                    </div>
                    <div className="text-slate-400 font-mono text-xs text-right">
                      {bid.total.toLocaleString("ko-KR", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 선택된 항목 정보 */}
        {selectedEntry && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-blue-500/30 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs mb-1">선택된 호가</div>
                <div className="text-white font-bold text-lg">
                  {selectedEntry.price.toLocaleString()} KRW
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
                  {selectedEntry.total.toLocaleString()} KRW
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
