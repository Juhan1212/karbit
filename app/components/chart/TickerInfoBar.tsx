import { useCallback, useEffect, useState } from "react";
import Select from "../shared/Select";
import { memo } from "react";
import type {
  CandleBarData,
  PositionData,
  TickerData,
} from "../../types/marketInfo";
import type { CryptoOption } from "../../stores/cryptoOptionState";
import { useCryptoOptionsStore } from "../../stores/cryptoOptionState";
import { createWebSocketStore } from "../../stores/chartState";
import { useChartDataStore } from "../../stores/chartDataStore";

const TickerInfoBar = memo(
  ({
    store,
    symbol,
    exchange,
    activePositions,
    onSymbolChange,
  }: {
    store: ReturnType<typeof createWebSocketStore>;
    symbol: string;
    exchange: string;
    activePositions?: Array<{
      coinSymbol: string;
      krExchange: string;
      frExchange: string;
    }>;
    onSymbolChange?: (newSymbol: string) => void;
  }) => {
    const { addMessageListener, removeMessageListener } = store.getState();
    const [tickerData, settickerData] = useState<TickerData>({
      change_percentage: null,
      funding_rate: null,
      index_price: null,
      mark_price: null,
    });
    const { cryptoOptions, setCryptoOption } = useCryptoOptionsStore();

    // ChartDataStore에서 테더 가격과 실시간 환율 가져오기
    const { tetherPrice, exchangeRate } = useChartDataStore();

    const formatNumber = (num: string | number | null, decimal: number) =>
      num !== null ? Number(num).toFixed(decimal) : "--";

    const priceChangeStatus =
      tickerData.change_percentage === null
        ? "neutral"
        : parseFloat(tickerData.change_percentage) > 0
          ? "positive"
          : parseFloat(tickerData.change_percentage) < 0
            ? "negative"
            : "neutral";

    const getFundingRateClass = (rate: number | null) => {
      if (rate === null || rate === 0) return "neutral";
      if (rate > 0) return "positive";
      return "negative";
    };

    const handleMessage = useCallback(
      (data: TickerData | CandleBarData | PositionData) => {
        if (data.channel === "futures.tickers") {
          const t = data as TickerData;
          settickerData((prev) => ({
            ...prev,
            change_percentage:
              t.change_percentage !== undefined
                ? t.change_percentage
                : prev.change_percentage,
            funding_rate:
              t.funding_rate !== undefined ? t.funding_rate : prev.funding_rate,
            mark_price:
              t.mark_price !== undefined ? t.mark_price : prev.mark_price,
            index_price:
              t.index_price !== undefined ? t.index_price : prev.index_price,
          }));
        }
      },
      []
    );

    // 심볼 변경 시 스토어의 심볼 업데이트
    const handleSelectChange = useCallback(
      (option: CryptoOption) => {
        if (onSymbolChange) {
          onSymbolChange(option.value as string);
        }
      },
      [onSymbolChange]
    );

    useEffect(() => {
      addMessageListener(handleMessage);
      return () => {
        removeMessageListener(handleMessage);
      };
    }, [
      addMessageListener,
      removeMessageListener,
      handleMessage,
      symbol,
      exchange,
    ]);

    // activePositions에서 티커 정보를 추출하여 cryptoOptions에 설정
    useEffect(() => {
      // 기본 티커 옵션들 (주석처리 - 활성 포지션만 표시)
      // const defaultOptions: CryptoOption[] = [
      //   {
      //     value: "BTC",
      //     label: "BTC/USDT",
      //     icon: "v1741628302/symbol-bitcoin_nptpiz.png",
      //   },
      //   {
      //     value: "ETH",
      //     label: "ETH/USDT",
      //     icon: "v1742519126/eth_pb9fz5.png",
      //   },
      //   {
      //     value: "SOL",
      //     label: "SOL/USDT",
      //     icon: "v1742519126/sol_o3fi9o.png",
      //   },
      // ];

      if (activePositions && activePositions.length > 0) {
        const positionTickers: CryptoOption[] = activePositions.map(
          (position) => ({
            label: `${position.coinSymbol}: ${position.krExchange}/${position.frExchange}`,
            value: position.coinSymbol,
            isPositionTicker: true, // 포지션 티커임을 표시하는 플래그
          })
        );

        // 포지션 티커들만 설정
        setCryptoOption(positionTickers);
      } else {
        // 활성 포지션이 없으면 빈 배열 설정
        setCryptoOption([]);
      }
    }, [activePositions, setCryptoOption]);

    return (
      <div className="info-price">
        <Select
          options={cryptoOptions}
          selectedValue={symbol}
          name="cryptocurrency"
          classNames={{
            root: "crypto-select-box",
            dropdown: "crypto-options",
            option: "crypto-option",
          }}
          onChange={handleSelectChange}
        />
        <div className="border-bar" />
        <div className="price-container">
          <div className="price-wrapper">
            <span className="info-label">테더가격</span>
            <span className="info-value">{formatNumber(tetherPrice, 2)}</span>
          </div>
          <div className="price-wrapper">
            <span className="info-label">실시간환율</span>
            <span className="info-value">{formatNumber(exchangeRate, 2)}</span>
          </div>
          <div className="change-status-display">
            <div className="status-wrapper">
              <span className="status-label"> 24H Change :</span>
              <span className={`status-value ${priceChangeStatus}`}>
                {formatNumber(tickerData.change_percentage, 2)}%
              </span>
            </div>
            <div className="status-wrapper">
              <span className="status-label"> Funding Rate :</span>
              <span
                className={`status-value ${getFundingRateClass(
                  tickerData.funding_rate !== null
                    ? parseFloat(tickerData.funding_rate)
                    : null
                )}`}
              >
                {tickerData.funding_rate !== null
                  ? formatNumber(
                      String(Number(tickerData.funding_rate) * 100),
                      4
                    )
                  : "--"}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TickerInfoBar.displayName = "TickerInfoBar";

export default TickerInfoBar;
