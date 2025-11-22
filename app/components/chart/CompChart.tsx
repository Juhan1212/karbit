import { useMemo, useEffect, useState } from "react";
import { multiWebSocketCoordinator } from "../../stores/multi-websocket-coordinator";
import TickerInfoBar from "./TickerInfoBar";
import CompTradingviewChart from "./CompTradingviewChart";
import TimeSelector from "./TimeSelectorBox";
import { useStore } from "zustand/react";
import type { StoreApi } from "zustand";
import type { WebSocketState } from "../../stores/chartState";

interface CompChartProps {
  koreanEx: string;
  foreignEx: string;
  symbol?: string;
  interval?: string;
  activePositions?: Array<{
    coinSymbol: string;
    krExchange: string;
    frExchange: string;
  }>;
  onSymbolChange?: (newSymbol: string) => void;
}

export const CompChart = ({
  koreanEx,
  foreignEx,
  symbol,
  interval,
  activePositions,
  onSymbolChange,
}: CompChartProps) => {
  // Coordinator에서 스토어 가져오기
  const [koreanStore, setKoreanStore] =
    useState<StoreApi<WebSocketState> | null>(null);
  const [foreignStore, setForeignStore] =
    useState<StoreApi<WebSocketState> | null>(null);

  useEffect(() => {
    const korean = multiWebSocketCoordinator.getStore(koreanEx);
    const foreign = multiWebSocketCoordinator.getStore(foreignEx);

    // Store가 없는 경우 짧은 지연 후 재시도 (WebSocket 연결 대기)
    if (!korean || !foreign) {
      const retryTimer = setTimeout(() => {
        const retryKorean = multiWebSocketCoordinator.getStore(koreanEx);
        const retryForeign = multiWebSocketCoordinator.getStore(foreignEx);

        setKoreanStore(retryKorean || null);
        setForeignStore(retryForeign || null);
      }, 100); // 100ms 대기 후 재시도

      return () => clearTimeout(retryTimer);
    }

    setKoreanStore(korean || null);
    setForeignStore(foreign || null);
  }, [koreanEx, foreignEx]);

  // Hooks는 항상 같은 순서로 호출되어야 함 - 조건부 체크 전에 모든 훅 선언
  const store1 = koreanStore;
  const store2 = foreignStore;

  // useStore 훅들을 조건부 이전에 호출 (null일 경우를 위해 더미 스토어 제공)
  const dummyStore: StoreApi<WebSocketState> = {
    getState: () =>
      ({
        symbol: symbol || "",
        interval: interval || "1m",
        isReconnecting: false,
      }) as WebSocketState,
    setState: () => {},
    subscribe: () => () => {},
    destroy: () => {},
  } as any;

  const storeSymbol = useStore(store1 || dummyStore, (state) => state.symbol);
  const storeInterval = useStore(
    store1 || dummyStore,
    (state) => state.interval
  );
  const isReconnecting1 = useStore(
    store1 || dummyStore,
    (state) => state.isReconnecting
  );
  const isReconnecting2 = useStore(
    store2 || dummyStore,
    (state) => state.isReconnecting
  );
  const isReconnecting = isReconnecting1 || isReconnecting2;

  // 스토어가 없으면 로딩 표시
  if (!koreanStore || !foreignStore) {
    return (
      <div
        className="chart-container"
        style={{
          position: "relative",
          backgroundColor: "rgb(19, 18, 21)",
          minHeight: "500px",
          width: "100%",
          height: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#eee", fontSize: "1.2rem" }}>
          웹소켓 연결 중...
        </div>
      </div>
    );
  }

  // 이 시점에서 store는 null이 아님이 보장됨
  const guaranteedStore1 = store1 as StoreApi<WebSocketState>;
  const guaranteedStore2 = store2 as StoreApi<WebSocketState>;

  return (
    <div
      className="chart-container"
      style={{
        position: "relative",
        backgroundColor: "rgb(19, 18, 21)",
        minHeight: "500px",
        width: "100%",
        height: "auto",
      }}
    >
      {isReconnecting && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(19, 18, 21, 0.7)",
            zIndex: 1000,
          }}
        >
          <div
            className="spinner"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                border: "8px solid #eee",
                borderTop: "8px solid #6c63ff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span
              style={{ color: "#eee", marginTop: "16px", fontSize: "1.2rem" }}
            >
              `{koreanEx} 정책상 10초의 재연결 딜레이가 발생합니다...`
            </span>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      <TickerInfoBar
        exchange={foreignEx}
        symbol={storeSymbol}
        store={guaranteedStore2}
        activePositions={activePositions}
        onSymbolChange={(newSymbol: string) => {
          guaranteedStore1.getState().setSymbolWithoutReconnect(newSymbol);
          guaranteedStore2.getState().setSymbolWithoutReconnect(newSymbol);
          onSymbolChange?.(newSymbol);
        }}
      />
      <div className="chart-wrapper">
        <TimeSelector
          store={guaranteedStore1}
          onIntervalChange={(newInterval) => {
            guaranteedStore1.getState().setInterval(newInterval);
            guaranteedStore2.getState().setInterval(newInterval);
          }}
        />
        <CompTradingviewChart
          store1={guaranteedStore1}
          store2={guaranteedStore2}
          symbol={storeSymbol}
          interval={storeInterval}
          exchange1={koreanEx}
          exchange2={foreignEx}
        />
      </div>
    </div>
  );
};

export default CompChart;
