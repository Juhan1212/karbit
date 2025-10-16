import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useNavigate, useLoaderData } from "react-router";
import { useUser, useIsLoading } from "~/stores";
import { validateSession } from "~/database/session";
import {
  getUserActivePositions,
  getUserTradingStats,
  getUserTradingHistoryPaginated,
  getUserTradingHistoryCount,
  getUserDailyProfit,
} from "~/database/position";
import { getUserExchangeBalances } from "~/database/exchange";
import { toast } from "sonner";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { RefreshCw, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { PremiumTicker } from "../components/premium-ticker";
import { getUserCurrentPlan } from "~/database/plan";
import { ActivePositionManagement } from "~/components/active-position-management";
import { TradingStats } from "~/components/trading-stats";
import { TradingHistoryTable } from "~/components/trading-history-table";
import CompChart from "~/components/chart/CompChart";
import "~/assets/styles/chart/index.scss";
import { Badge } from "~/components/badge";

export function meta() {
  return [
    { title: "Dashboard - Karbit" },
    {
      name: "description",
      content: "Cryptocurrency arbitrage trading dashboard",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const token = getAuthTokenFromRequest(request);

  if (!token) {
    return {
      activePositions: [],
      activePositionCount: 0,
      message: "Authentication required",
    };
  }

  const user = await validateSession(token);

  if (!user) {
    return {
      activePositions: [],
      activePositionCount: 0,
      message: "Authentication required",
    };
  }

  try {
    // URL에서 페이지네이션 파라미터 추출
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    // 사용자의 활성 포지션 조회
    const activePositions = await getUserActivePositions(user.id);
    const activePositionCount = activePositions.length;

    // 사용자의 플랜 조회
    const activePlan = await getUserCurrentPlan(user.id);

    // 사용자의 트레이딩 통계 조회
    const tradingStats = await getUserTradingStats(user.id);

    // 사용자의 거래 내역 조회 (페이지네이션)
    const tradingHistory = await getUserTradingHistoryPaginated(
      user.id,
      page,
      limit
    );

    // 총 거래 내역 수 조회
    const totalCount = await getUserTradingHistoryCount(user.id);
    const totalPages = Math.ceil(totalCount / limit);

    // 일일 수익 조회
    const dailyProfit = await getUserDailyProfit(user.id);

    // 사용자의 거래소별 잔액 조회 (에러 발생 시에도 navigation은 되도록)
    let exchangeBalances: Awaited<ReturnType<typeof getUserExchangeBalances>> =
      [];
    try {
      exchangeBalances = await getUserExchangeBalances(user.id);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 401) {
        // toast는 클라이언트에서만 동작하므로, 아래에서 클라이언트에서 처리하도록 안내 메시지 전달
        return {
          activePositions,
          activePositionCount,
          activePlan,
          tradingStats,
          tradingHistory,
          dailyProfit,
          exchangeBalances,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
          },
          message: "EXCHANGE_BALANCE_401",
        };
      }
      // 기타 에러는 무시하고 빈 배열 반환
      exchangeBalances = [];
    }

    return {
      activePositions,
      activePositionCount,
      activePlan,
      tradingStats,
      tradingHistory,
      dailyProfit,
      exchangeBalances,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
      message: "Dashboard data loaded successfully",
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      activePositions: [],
      activePositionCount: 0,
      tradingStats: {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalProfit: 0,
      },
      tradingHistory: [],
      dailyProfit: 0,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 20,
      },
      message: "Error loading dashboard data",
    };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useUser();
  const isLoading = useIsLoading();
  const loaderData = useLoaderData<typeof loader>();

  const {
    activePositions: rawActivePositions,
    activePositionCount: initialActivePositionCount,
    activePlan,
    tradingStats: initialTradingStats,
    tradingHistory: initialTradingHistory,
    pagination: initialPagination,
    dailyProfit: initialDailyProfit,
    exchangeBalances,
    message,
  } = loaderData;
  // 거래소 잔액 401 에러 안내 (클라이언트에서 toast)
  useEffect(() => {
    if (message === "EXCHANGE_BALANCE_401") {
      toast.error(
        "연결된 거래소 웹사이트에 접속하여 api 관리페이지에서 허용 ip주소를 확인해주세요"
      );
    }
  }, [message]);

  // ActivePositionManagement를 위한 상태 변수들
  const [polledActivePositions, setPolledActivePositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(
    null
  );

  // TradingStats를 위한 상태 변수들
  const [tradingStats, setTradingStats] = useState(initialTradingStats);
  const [isLoadingTradingData, setIsLoadingTradingData] = useState(false);

  // TradingHistory를 위한 상태 변수들
  const [tradingHistory, setTradingHistory] = useState(initialTradingHistory);
  const [pagination, setPagination] = useState(initialPagination);

  // 일일 수익 상태
  const [dailyProfit, setDailyProfit] = useState(initialDailyProfit || 0);

  // 평균 환율 상태 (PremiumTicker에서 받아온 값)
  const [averageRate, setAverageRate] = useState<number | null>(null);

  // 선택된 티커 아이템 상태 (PremiumTicker에서 받아온 값)
  const [selectedTickerItem, setSelectedTickerItem] = useState<any>(null);

  // 평균 환율과 테더 가격 비교 계산
  const tetherComparisonData = useMemo(() => {
    if (!currentExchangeRate || !averageRate) {
      return {
        percentage: 0,
        isHigher: true,
        description: "실시간 전체 티커 평균환율보다",
      };
    }

    const diff = currentExchangeRate - averageRate;
    const percentage = (diff / averageRate) * 100;

    return {
      percentage: Math.abs(percentage),
      isHigher: diff > 0,
      description: "실시간 전체 티커 평균환율보다",
    };
  }, [currentExchangeRate, averageRate]);

  // 금액 포맷팅 함수 (간단한 버전)
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "KRW") {
      if (amount >= 100000000) {
        return `₩${(amount / 100000000).toFixed(1)}억`;
      } else if (amount >= 10000) {
        return `₩${(amount / 10000).toFixed(0)}만`;
      } else {
        return `₩${Math.round(amount).toLocaleString()}`;
      }
    } else {
      return `$${Math.round(amount).toLocaleString()}`;
    }
  };

  // 폴링 함수에서 최신 상태를 참조하기 위한 ref
  const polledActivePositionsRef = useRef(polledActivePositions);
  const activePositionCountRef = useRef(initialActivePositionCount);
  const tradingStatsRef = useRef(tradingStats);
  const tradingHistoryRef = useRef(tradingHistory);
  const paginationRef = useRef(pagination);

  // rawActivePositions를 올바른 형태로 변환
  const activePositions = useMemo(() => {
    if (!rawActivePositions || !Array.isArray(rawActivePositions)) {
      return [];
    }
    return rawActivePositions.map((position: any) => ({
      coinSymbol: position.coin_symbol,
      krExchange: position.kr_exchange,
      frExchange: position.fr_exchange,
      leverage: position.leverage,
      entryRate: position.avg_entry_rate,
      amount: position.total_amount,
      currentProfit: position.current_profit || 0,
      profitRate: position.profit_rate || 0,
    }));
  }, [rawActivePositions]);

  const [activePositionCount, setActivePositionCount] = useState(
    initialActivePositionCount
  );

  // Exchange Rate Chart를 위한 상태 변수들
  const [selectedTicker, setSelectedTicker] = useState(
    activePositions[0]?.coinSymbol || "BTC"
  );

  // 선택된 티커에 해당하는 포지션 찾기
  const selectedPosition = useMemo(() => {
    return (
      polledActivePositions.find((p) => p.coinSymbol === selectedTicker) ||
      polledActivePositions[0]
    );
  }, [polledActivePositions, selectedTicker]);

  // polledActivePositions 변경시 selectedTicker 유효성 검사
  useEffect(() => {
    if (polledActivePositions.length > 0) {
      const isValidTicker = polledActivePositions.some(
        (p) => p.coinSymbol === selectedTicker
      );
      if (!isValidTicker) {
        setSelectedTicker(polledActivePositions[0].coinSymbol);
      }
    }
  }, [polledActivePositions, selectedTicker]);

  // 활성 포지션 및 트레이딩 통계 폴링 함수
  const pollActivePositions = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoadingPositions(true);
      setIsLoadingTradingData(true);
    }
    try {
      const response = await fetch("/api/active-positions");

      if (response.ok) {
        const data = await response.json();

        // 활성 포지션 데이터 처리
        const transformedPositions = data.activePositions.map(
          (position: any) => ({
            coinSymbol: position.coin_symbol,
            krExchange: position.kr_exchange,
            frExchange: position.fr_exchange,
            totalKrVolume: position.total_kr_volume,
            totalFrVolume: position.total_fr_volume,
            totalKrFunds: position.total_kr_funds,
            totalFrFunds: position.total_fr_funds,
            positionCount: position.position_count,
            latestEntryTime: position.latest_entry_time,
          })
        );

        // 데이터가 실제로 변경되었는지 확인
        const positionsChanged =
          JSON.stringify(polledActivePositionsRef.current) !==
            JSON.stringify(transformedPositions) ||
          activePositionCountRef.current !== data.activePositionCount;

        const statsChanged =
          JSON.stringify(tradingStatsRef.current) !==
          JSON.stringify(data.tradingStats);

        const historyChanged =
          JSON.stringify(tradingHistoryRef.current) !==
          JSON.stringify(data.tradingHistory);

        const dailyProfitChanged = data.dailyProfit !== dailyProfit;

        // 변경된 경우에만 상태 업데이트
        if (positionsChanged) {
          setPolledActivePositions(transformedPositions);
          setActivePositionCount(data.activePositionCount);
          polledActivePositionsRef.current = transformedPositions;
          activePositionCountRef.current = data.activePositionCount;
        }

        if (statsChanged) {
          setTradingStats(data.tradingStats);
          tradingStatsRef.current = data.tradingStats;
        }

        if (historyChanged) {
          setTradingHistory(data.tradingHistory);
          tradingHistoryRef.current = data.tradingHistory;
        }

        if (dailyProfitChanged) {
          setDailyProfit(data.dailyProfit);
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    } finally {
      if (showLoading) {
        setIsLoadingPositions(false);
        setIsLoadingTradingData(false);
      }
    }
  }, []);

  // 환율 가져오기 로직
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    const fetchUpbitRate = async () => {
      const upbitUrl = "https://api.upbit.com/v1/ticker?markets=KRW-USDT";
      const response = await fetch(
        `/api/proxy?url=${encodeURIComponent(upbitUrl)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data[0]?.trade_price || "-";
    };

    const initializeExchangeRate = async () => {
      // 1. 먼저 초기 환율을 REST API로 조회
      try {
        const initialRate = await fetchUpbitRate();
        setCurrentExchangeRate(initialRate);
      } catch (error) {
        console.error("초기 환율 조회 오류:", error);
      }

      // 2. REST API 폴링으로 실시간 업데이트
      const updateExchangeRate = async () => {
        try {
          const rate = await fetchUpbitRate();
          setCurrentExchangeRate(rate);

          // 성공 시 재시도 카운터 초기화
          retryCount = 0;
        } catch (error) {
          console.error("환율 업데이트 오류:", error);
          retryCount++;

          if (retryCount >= maxRetries) {
            // 최대 재시도 횟수 초과 시 폴링 중단
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            console.error("업비트 api 서버와 연결이 원활하지 않습니다");
          }
        }
      };

      // 폴링 시작 (1초 간격)
      intervalId = setInterval(updateExchangeRate, 1000);
    };

    initializeExchangeRate();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // 활성 포지션 폴링 시작 (5초 간격)
  useEffect(() => {
    // 초기 데이터 로드
    pollActivePositions(true);

    // 5초마다 폴링
    const interval = setInterval(() => pollActivePositions(false), 5000);

    return () => clearInterval(interval);
  }, [pollActivePositions]);

  // tradingStats ref를 최신 상태로 유지
  useEffect(() => {
    tradingStatsRef.current = tradingStats;
  }, [tradingStats]);

  // tradingHistory ref를 최신 상태로 유지
  useEffect(() => {
    tradingHistoryRef.current = tradingHistory;
  }, [tradingHistory]);

  // pagination ref를 최신 상태로 유지
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // 인증 체크 및 리다이렉트
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 사용자
  if (!user) {
    return null; // useEffect에서 리다이렉트 처리
  }

  const currentPlan = activePlan; // 현재 플랜 상태

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1>김치 프리미엄 대시보드</h1>
          <p className="text-muted-foreground">
            {user.name ? `${user.name}님, ` : ""}실시간 환율 모니터링 및
            자동매매 현황
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.reload();
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Live Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-muted-foreground">실시간 데이터 업데이트 중</span>
        <span className="text-xs text-muted-foreground">
          • 마지막 업데이트: 방금 전
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">테더 가격</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-300" />
              </div>
              <Badge
                variant="secondary"
                className="text-xs bg-green-900 text-green-300"
              >
                실시간
              </Badge>
            </div>
            <div className="text-xl lg:text-2xl">₩{currentExchangeRate}</div>
            <div
              className={`flex items-center gap-1 text-xs ${tetherComparisonData.isHigher ? "text-green-600" : "text-red-600"}`}
            >
              {tetherComparisonData.isHigher ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {tetherComparisonData.isHigher ? "+" : "-"}
              {tetherComparisonData.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {tetherComparisonData.description}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">활성 포지션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-300" />
              </div>
              <Badge
                variant="outline"
                className="text-xs text-blue-300 bg-blue-900"
              >
                대기중
              </Badge>
            </div>
            <div className="text-xl lg:text-2xl">{activePositionCount}</div>
            <div className="text-xs text-muted-foreground">
              {activePositionCount > 0 ? "진행중" : "비활성화"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">일일 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-900 rounded-lg flex items-center justify-center">
                {dailyProfit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-yellow-300" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-yellow-300" />
                )}
              </div>
              <Badge
                variant="secondary"
                className="text-xs text-yellow-300 bg-yellow-900"
              >
                오늘
              </Badge>
            </div>
            <div className="text-xl lg:text-2xl">
              {dailyProfit >= 0 ? "+" : ""}₩{dailyProfit.toLocaleString()}
            </div>
            <div
              className={`text-xs ${dailyProfit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              오늘 종료된 거래
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">현재 원화&USDT 자산</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-900 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-purple-300" />
              </div>
              <Badge
                variant="outline"
                className="text-xs text-purple-300 bg-purple-900"
              >
                전체
              </Badge>
            </div>
            {exchangeBalances && exchangeBalances.length > 0 ? (
              <div className="space-y-2">
                {exchangeBalances.map((exchange: any) => (
                  <div
                    key={exchange.exchangeName}
                    className="flex items-start justify-between text-xs gap-2"
                  >
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span>{exchange.icon}</span>
                      <span className="font-medium">
                        {exchange.exchangeName}
                      </span>
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <div className="font-medium">
                        {exchange.error ? (
                          <span className="text-red-500 text-xs leading-tight break-words">
                            {exchange.error}
                          </span>
                        ) : (
                          formatCurrency(
                            exchange.availableBalance,
                            exchange.currency
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="text-xl lg:text-2xl">-</div>
                <div className="text-xs text-muted-foreground">
                  연동 후 확인
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TradingView Widget - Upbit USDTKRW 5분봉 */}
      <div className="my-6">
        <div className="rounded-xl border-2 border-border bg-card p-0 overflow-hidden">
          <iframe
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=UPBIT:USDTKRW&interval=5&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia/Seoul&withdateranges=1&hidevolume=0&hidelegend=0&showpopupbutton=1&popupwidth=1000&popupheight=650"
            width="100%"
            height="400"
            allowFullScreen
            title="TradingView USDTKRW Chart"
            style={{ minWidth: "320px", maxWidth: "100%", display: "block" }}
          />
        </div>
      </div>

      {/* Live Kimchi Premium Ticker */}
      <PremiumTicker
        onAverageRateChange={(avgRate, seed) => {
          setAverageRate(avgRate);
        }}
        onItemSelected={(item) => {
          setSelectedTickerItem(item);
        }}
      />

      {/* Selected Ticker Chart - Only show when a ticker is selected */}
      {selectedTickerItem && (
        <Card className="chart-card-container">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              실시간 {selectedTickerItem.symbol} 환율 차트
            </CardTitle>
            <CardDescription>
              선택한 티커의 실시간 환율을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="chart-card-content" noPadding={true}>
            <CompChart
              koreanEx={selectedTickerItem?.korean_ex || "UPBIT"}
              foreignEx={selectedTickerItem?.foreign_ex || "BYBIT"}
              symbol={selectedTickerItem.symbol}
              interval="1m"
              activePositions={[
                {
                  coinSymbol: selectedTickerItem.symbol,
                  krExchange: selectedTickerItem.korean_ex,
                  frExchange: selectedTickerItem.foreign_ex,
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Active Position Management - Full width section */}
      <ActivePositionManagement
        positions={polledActivePositions}
        isLoading={isLoadingPositions}
        currentExchangeRate={currentExchangeRate || 1300}
        onPositionClose={(coinSymbol) => {
          // 포지션 종료 후 새로고침 (로딩 표시)
          pollActivePositions(true);
        }}
        onTickerSelect={(coinSymbol: string) => {
          // 티커 선택 시 차트 업데이트
          setSelectedTicker(coinSymbol);
        }}
      />

      {/* Exchange Rate Chart - Only show when there are active positions */}
      {activePositionCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              실시간 활성 포지션 환율 차트
            </CardTitle>
            <CardDescription>
              현재 포지션 추이를 실시간으로 확인하세요.
              <br />
              <span className="text-xs text-muted-foreground/80 mt-1 block">
                ※ 빗썸 거래소 측에서 현재 캔들 데이터를 제공하지 않고 있으나
                개발단계에 있습니다. 거래소 업데이트가 되는대로 반영할
                예정입니다.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="chart-card-content" noPadding={true}>
            <CompChart
              koreanEx={selectedPosition?.krExchange || "UPBIT"}
              foreignEx={selectedPosition?.frExchange || "BYBIT"}
              symbol={selectedTicker}
              interval="1m"
              activePositions={polledActivePositions}
              onSymbolChange={setSelectedTicker}
            />
          </CardContent>
        </Card>
      )}

      {/* No Active Positions Message */}
      {activePositionCount === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              실시간 활성 포지션 환율 차트
            </CardTitle>
            <CardDescription>
              현재 포지션 추이를 실시간으로 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                현재 활성화된 포지션이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground">
                *자동매매 페이지에서 설정을 완료한 후 자동매매를 활성화해보세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Statistics */}
      <TradingStats
        stats={
          tradingStats || {
            totalTrades: 0,
            openTrades: 0,
            closedTrades: 0,
            totalProfit: 0,
          }
        }
        isLoading={isLoadingTradingData}
      />

      {/* Trading History */}
      <TradingHistoryTable
        tradingHistory={tradingHistory || []}
        pagination={
          pagination || {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            limit: 20,
          }
        }
        isLoading={isLoadingTradingData}
      />
    </div>
  );
}
