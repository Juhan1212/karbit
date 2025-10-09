import { useMemo, useEffect } from "react";
import { createWebSocketStore } from "../../stores/chartState";
import TickerInfoBar from "./TickerInfoBar";
import CompTradingviewChart from "./CompTradingviewChart";
import TimeSelector from "./TimeSelectorBox";
import { useStore } from "zustand/react";

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
  const store1 = useMemo(
    () =>
      createWebSocketStore({
        exchange: koreanEx,
        symbol,
        interval,
      }),
    [koreanEx, symbol, interval]
  );
  const store2 = useMemo(
    () =>
      createWebSocketStore({
        exchange: foreignEx,
        symbol,
        interval,
      }),
    [foreignEx, symbol, interval]
  );

  useEffect(() => {
    store1.getState().connectWebSocket();
    store2.getState().connectWebSocket();
    return () => {
      console.log("CompChart unmounting, disconnecting websockets");
      store1.getState().disconnectWebSocket();
      store2.getState().disconnectWebSocket();
    };
  }, [store1, store2]);

  // 아래와 같이 스토어로부터 동기화를 시켜야 CompTradingviewChart에 매개변수로 전달해줘서 티커, 봉이 바뀔 때에 CompTradingviewChart가 리렌더링될 수 있다.
  const storeSymbol = useStore(store1, (state) => state.symbol);
  const storeInterval = useStore(store1, (state) => state.interval);
  const isReconnecting1 = useStore(store1, (state) => state.isReconnecting);
  const isReconnecting2 = useStore(store2, (state) => state.isReconnecting);
  const isReconnecting = isReconnecting1 || isReconnecting2;

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
        store={store2}
        activePositions={activePositions}
        onSymbolChange={(newSymbol: string) => {
          store1.getState().setSymbol(newSymbol);
          store2.getState().setSymbol(newSymbol);
          onSymbolChange?.(newSymbol);
        }}
      />
      <div className="chart-wrapper">
        <TimeSelector
          store={store1}
          onIntervalChange={(newInterval) => {
            store1.getState().setInterval(newInterval);
            store2.getState().setInterval(newInterval);
          }}
        />
        <CompTradingviewChart
          store1={store1}
          store2={store2}
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
