import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { LoaderFunctionArgs } from "react-router";
import {
  useLoaderData,
  redirect,
  useFetcher,
  useSearchParams,
} from "react-router";
import "~/assets/styles/chart/index.scss";
import { validateSession } from "~/database/session";
import {
  getUserExchangeConnections,
  getUserExchangeBalances,
} from "~/database/exchange";
import {
  getUserActiveStrategy,
  formatStrategyForFrontend,
} from "~/database/strategy";
import CompChart from "~/components/chart/CompChart";
import { KoreanExchangeType } from "~/types/exchange";
import {
  getUserActivePositions,
  getUserTradingHistoryPaginated,
  getUserTradingHistoryCount,
  getUserTradingStats,
} from "~/database/position";
import { getCommonCoinsByExchanges, getRestrictedCoins } from "~/database/coin";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { useUser, useUserPlan } from "~/stores";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Switch } from "../components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Slider } from "../components/slider";
import { Input } from "../components/input";
import { Label } from "../components/label";
import { Checkbox } from "../components/checkbox";
import { Separator } from "../components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/collapsible";
import { ActivePositionDisplay } from "../components/active-position-display";
import { ActivePositionManagement } from "../components/active-position-management";
import { TradingStats } from "../components/trading-stats";
import { TradingHistoryTable } from "../components/trading-history-table";
import { AutoComplete, AutoCompleteOption } from "../components/autocomplete";
import {
  AlertTriangle,
  AlertCircle,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Info,
  Plus,
  Minus,
  StopCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/tooltip";
import { formatKRW } from "~/utils/decimal";

export function meta() {
  return [
    { title: "Auto Trading - Karbit" },
    { name: "description", content: "Manage automated trading strategies" },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (!token) {
      throw redirect("/auth");
    }

    // 사용자 인증 확인
    const user = await validateSession(token);
    if (!user) {
      throw redirect("/auth");
    }

    // URL에서 페이지 파라미터 추출
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = 10; // 페이지당 항목 수

    // 사용자의 거래소 연결 상태 조회
    const connections = await getUserExchangeConnections(user.id);

    // 사용자의 활성 전략 조회
    const activeStrategy = await getUserActiveStrategy(user.id);

    // 연결된 거래소들의 이름 추출
    const connectedExchangeNames = connections
      .filter((conn) => conn.isConnected)
      .map((conn) => conn.exchangeName);

    // 연결된 거래소들의 공통 코인 목록 조회 (연결된 거래소가 없으면 빈 배열)
    const availableCoins =
      connectedExchangeNames.length > 0
        ? await getCommonCoinsByExchanges(connectedExchangeNames)
        : [];

    // 사용자의 거래소별 잔액 조회 (연결된 거래소가 있을 때만)
    const exchangeBalances =
      connections.filter((conn) => conn.isConnected).length > 0
        ? await getUserExchangeBalances(user.id)
        : [];

    // 사용자의 활성 포지션 데이터 조회 (차트에서 사용할 티커 정보)
    const activePositions = await getUserActivePositions(user.id);
    const activePositionCount = activePositions.length;

    // 입출금 제한이 있는 코인들 조회
    const restrictedCoins = await getRestrictedCoins();

    // 사용자의 거래 내역 조회 (페이지네이션)
    const tradingHistory = await getUserTradingHistoryPaginated(
      user.id,
      page,
      limit
    );

    // 총 거래 내역 수 조회
    const totalCount = await getUserTradingHistoryCount(user.id);
    const totalPages = Math.ceil(totalCount / limit);

    // 거래 통계 조회
    const tradingStats = await getUserTradingStats(user.id);

    return {
      connections,
      activeStrategy: activeStrategy
        ? formatStrategyForFrontend(activeStrategy)
        : null,
      availableCoins,
      exchangeBalances,
      activePositionCount,
      activePositions,
      restrictedCoins,
      tradingHistory,
      tradingStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    };
  } catch (error) {
    if (error instanceof Response) {
      throw redirect("/auth");
    }
    console.error("autotrading loader error:", error);
    return {
      connections: [],
      activeStrategy: null,
      availableCoins: [],
      exchangeBalances: [],
      activePositionCount: 0,
      activePositions: [],
      restrictedCoins: [],
      tradingHistory: [],
      tradingStats: {
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalProfit: 0,
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
      },
    };
  }
}

export default function AutoTrading() {
  const {
    connections,
    activeStrategy,
    availableCoins,
    exchangeBalances,
    activePositionCount: initialActivePositionCount,
    activePositions: rawActivePositions,
    restrictedCoins,
    tradingHistory: initialTradingHistory,
    tradingStats: initialTradingStats,
    pagination: initialPagination,
  } = useLoaderData<typeof loader>();
  const user = useUser();

  // rawActivePositions를 올바른 형태로 변환
  const activePositions = useMemo(() => {
    if (!rawActivePositions || !Array.isArray(rawActivePositions)) {
      return [];
    }
    return rawActivePositions.map((position: any) => ({
      coinSymbol: position.coin_symbol,
      krExchange: position.kr_exchange,
      frExchange: position.fr_exchange,
      totalKrVolume: position.total_kr_volume,
      totalFrVolume: position.total_fr_volume,
      totalKrFunds: position.total_kr_funds,
      totalFrFunds: position.total_fr_funds,
      positionCount: position.position_count,
      latestEntryTime: position.latest_entry_time,
    }));
  }, [rawActivePositions]);
  const userPlan = useUserPlan();
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();

  // 폴링을 위한 state
  const [activePositionCount, setActivePositionCount] = useState(
    initialActivePositionCount
  );
  const [polledActivePositions, setPolledActivePositions] =
    useState(activePositions);
  const [selectedTicker, setSelectedTicker] = useState(
    activePositions[0]?.coinSymbol || "BTC"
  );
  const [tradingHistory, setTradingHistory] = useState(initialTradingHistory);
  const [tradingStats, setTradingStats] = useState(initialTradingStats);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingTradingData, setIsLoadingTradingData] = useState(false);

  // URL 파라미터에서 현재 페이지 추출
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // 활성 전략이 있으면 그 정보로 초기화, 없으면 기본값 사용
  const [isEnabled, setIsEnabled] = useState(!!activeStrategy);
  const [seedAmount, setSeedAmount] = useState([
    activeStrategy?.seedAmount || 10000000,
  ]);
  const [coinMode, setCoinMode] = useState<"auto" | "custom">(
    activeStrategy?.coinMode || "custom"
  );
  const [selectedCoin1, setSelectedCoin1] = useState(
    activeStrategy?.selectedCoins?.[0] ||
      (availableCoins.length > 0 ? availableCoins[0].id : "BTC")
  );
  const [selectedCoin2, setSelectedCoin2] = useState(
    activeStrategy?.selectedCoins?.[1] || "none"
  );
  const [selectedCoin3, setSelectedCoin3] = useState(
    activeStrategy?.selectedCoins?.[2] || "none"
  );
  const [entryRate, setEntryRate] = useState(
    activeStrategy?.entryRate || 1350.0
  );
  const [exitRate, setExitRate] = useState(activeStrategy?.exitRate || 1370.0);
  const [seedDivision, setSeedDivision] = useState(
    activeStrategy?.seedDivision || 2
  );
  const [leverage, setLeverage] = useState(activeStrategy?.leverage || 1);
  const [allowAverageDown, setAllowAverageDown] = useState(
    activeStrategy?.allowAverageDown || false
  );
  const [allowAverageUp, setAllowAverageUp] = useState(
    activeStrategy?.allowAverageUp || false
  );

  // 거래소별 잔액 및 환율 관련 state
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(
    null
  );

  // 제한된 코인 테이블 표시 상태 (기본값: 펼쳐진 상태)
  const [showRestrictedCoins, setShowRestrictedCoins] = useState(true);

  // 동적으로 업데이트되는 제한된 코인 목록 상태
  const [currentRestrictedCoins, setCurrentRestrictedCoins] =
    useState(restrictedCoins);

  // 폴링 함수에서 최신 상태를 참조하기 위한 ref
  const polledActivePositionsRef = useRef(polledActivePositions);
  const activePositionCountRef = useRef(activePositionCount);
  const tradingHistoryRef = useRef(tradingHistory);
  const tradingStatsRef = useRef(tradingStats);
  const paginationRef = useRef(pagination);
  const currentPageRef = useRef(currentPage);

  // ref를 최신 상태로 업데이트
  useEffect(() => {
    polledActivePositionsRef.current = polledActivePositions;
  }, [polledActivePositions]);

  useEffect(() => {
    activePositionCountRef.current = activePositionCount;
  }, [activePositionCount]);

  useEffect(() => {
    tradingHistoryRef.current = tradingHistory;
  }, [tradingHistory]);

  useEffect(() => {
    tradingStatsRef.current = tradingStats;
  }, [tradingStats]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

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

  // 5분마다 제한된 코인 목록 갱신
  useEffect(() => {
    const fetchRestrictedCoins = async () => {
      try {
        const response = await fetch("/api/inquiry-restricted-coin", {
          headers: {
            Accept: "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.restrictedCoins) {
            // 데이터가 실제로 변경되었는지 확인
            const hasChanged =
              JSON.stringify(currentRestrictedCoins) !==
              JSON.stringify(data.restrictedCoins);

            // 변경된 경우에만 상태 업데이트
            if (hasChanged) {
              setCurrentRestrictedCoins(data.restrictedCoins);
            }
          }
        }
      } catch (error) {
        console.error("제한된 코인 목록 갱신 오류:", error);
      }
    };

    // 초기 로딩 시 한 번 실행
    fetchRestrictedCoins();

    // 5분(300초)마다 실행
    const interval = setInterval(fetchRestrictedCoins, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentRestrictedCoins]);

  // 연결된 거래소 확인
  const hasConnectedExchanges = connections.some((conn) => conn.isConnected);

  // 환율 적용 금액 계산 함수
  const calculateRequiredAmount = (exchange: any, seedAmount: number) => {
    if (
      exchange.type === "domestic" ||
      exchange.exchangeName === KoreanExchangeType.업비트 ||
      exchange.exchangeName === KoreanExchangeType.빗썸
    ) {
      return seedAmount; // 국내거래소는 KRW 그대로
    } else {
      // 환율 정보가 아직 로드되지 않은 경우 null 반환
      if (!currentExchangeRate) {
        return null;
      }
      return seedAmount / currentExchangeRate; // 해외거래소는 USD로 변환
    }
  };

  // 금액 포맷팅 함수
  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "KRW") {
      return (amount / 10000).toFixed(0) + "만원";
    } else {
      return (
        "$" +
        amount.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      );
    }
  };

  // 잔액 상태 확인 함수
  const getBalanceStatus = (
    availableBalance: number,
    requiredAmount: number | null
  ) => {
    if (requiredAmount === null) {
      return "loading"; // 환율 정보 로딩 중
    }
    if (availableBalance >= requiredAmount) {
      return "sufficient";
    } else if (availableBalance >= requiredAmount * 0.5) {
      return "warning";
    } else {
      return "insufficient";
    }
  };

  // 실시간 환율 업데이트 함수 (Upbit REST API 폴링 방식)
  const setupExchangeRatePolling = async () => {
    try {
      let retryCount = 0;
      const maxRetries = 5;
      let intervalId: NodeJS.Timeout | null = null;

      // 업비트 REST API로 환율 조회 함수
      const fetchUpbitRate = async () => {
        const response = await fetch(
          "https://api.upbit.com/v1/ticker?markets=KRW-USDT"
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data[0]?.trade_price || 1355.5;
      };

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
            // 최대 재시도 횟수 초과 시 폴링 중단 및 에러 토스트
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
            toast.error("업비트 api 서버와 연결이 원활하지 않습니다");
          }
        }
      };

      // 폴링 시작 (1초 간격)
      intervalId = setInterval(updateExchangeRate, 1000);

      // 페이지 가시성 변경 감지 (페이지를 벗어나면 폴링 중단)
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        } else if (document.visibilityState === "visible" && !intervalId) {
          // 페이지가 다시 보이면 폴링 재시작
          retryCount = 0; // 재시도 카운터 초기화
          intervalId = setInterval(updateExchangeRate, 1000);
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // cleanup 함수 반환
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } catch (error) {
      console.error("환율 시스템 초기화 오류:", error);
      toast.error("환율 시스템 초기화에 실패했습니다");
    }
  };

  // 컴포넌트 마운트 시 환율 정보 초기화
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeExchangeRate = async () => {
      cleanup = await setupExchangeRatePolling();
    };

    initializeExchangeRate();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // 활성 포지션 폴링 (5초 간격)
  const pollActivePositions = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setIsLoadingPositions(true);
      }
      try {
        const response = await fetch("/api/active-positions");
        if (response.ok) {
          const data = await response.json();
          // 전체 활성 포지션 데이터를 받아와서 변환
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
          const hasChanged =
            JSON.stringify(polledActivePositionsRef.current) !==
              JSON.stringify(transformedPositions) ||
            activePositionCountRef.current !== data.activePositionCount;

          // 변경된 경우에만 상태 업데이트
          if (hasChanged) {
            setPolledActivePositions(transformedPositions);
            setActivePositionCount(data.activePositionCount);
          }
        }
      } catch (error) {
        console.error("Active positions polling error:", error);
      } finally {
        if (showLoading) {
          setIsLoadingPositions(false);
        }
      }
    },
    [] // dependency array에서 상태값들 제거
  );

  // 거래 데이터 폴링 (30초 간격)
  const pollTradingData = useCallback(
    async (page?: number, showLoading = false) => {
      if (showLoading) {
        setIsLoadingTradingData(true);
      }
      try {
        const targetPage = page || currentPageRef.current;
        const response = await fetch(`/api/trading-data?page=${targetPage}`);
        if (response.ok) {
          const data = await response.json();

          // 데이터가 실제로 변경되었는지 확인
          const hasChanged =
            JSON.stringify(tradingHistoryRef.current) !==
              JSON.stringify(data.tradingHistory) ||
            JSON.stringify(tradingStatsRef.current) !==
              JSON.stringify(data.tradingStats) ||
            JSON.stringify(paginationRef.current) !==
              JSON.stringify(data.pagination);

          // 변경된 경우에만 상태 업데이트
          if (hasChanged) {
            setTradingHistory(data.tradingHistory);
            setTradingStats(data.tradingStats);
            setPagination(data.pagination);
          }
        }
      } catch (error) {
        console.error("Trading data polling error:", error);
      } finally {
        if (showLoading) {
          setIsLoadingTradingData(false);
        }
      }
    },
    [] // dependency array에서 상태값들 제거
  );

  // 폴링 설정
  useEffect(() => {
    // 초기 로딩 시에만 로딩 상태 표시
    pollActivePositions(true);
    pollTradingData(undefined, true);

    // 활성 포지션 폴링 (5초 간격) - 백그라운드에서는 로딩 표시 없음
    const positionsInterval = setInterval(
      () => pollActivePositions(false),
      5000
    );

    // 거래 데이터 폴링 (30초 간격) - 백그라운드에서는 로딩 표시 없음
    const tradingDataInterval = setInterval(
      () => pollTradingData(undefined, false),
      30000
    );

    // 페이지 가시성 변경 시 폴링 제어
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearInterval(positionsInterval);
        clearInterval(tradingDataInterval);
      } else if (document.visibilityState === "visible") {
        // 페이지가 다시 보이면 즉시 한 번 업데이트하고 폴링 재시작 (로딩 표시)
        pollActivePositions(true);
        pollTradingData(undefined, true);
        const newPositionsInterval = setInterval(
          () => pollActivePositions(false),
          5000
        );
        const newTradingDataInterval = setInterval(
          () => pollTradingData(undefined, false),
          30000
        );
        return { newPositionsInterval, newTradingDataInterval };
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(positionsInterval);
      clearInterval(tradingDataInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // dependency array를 빈 배열로 변경

  // 페이지 변경 시 거래 데이터 즉시 업데이트 (로딩 표시)
  useEffect(() => {
    pollTradingData(currentPage, true);
  }, [currentPage]); // pollTradingData 제거

  const adjustRate = (
    type: "entry" | "exit",
    operation: "increase" | "decrease"
  ) => {
    const step = 0.01;
    if (type === "entry") {
      setEntryRate((prev) =>
        operation === "increase" ? prev + step : Math.max(0, prev - step)
      );
    } else {
      setExitRate((prev) =>
        operation === "increase" ? prev + step : Math.max(0, prev - step)
      );
    }
  };

  // 선택된 코인 목록 필터링
  const getSelectedCoins = () => {
    const coins = [selectedCoin1, selectedCoin2, selectedCoin3].filter(
      (coin) => coin !== "" && coin !== "none"
    );
    return coins;
  };

  // 거래소 이름을 한국어로 변환하는 함수
  const formatExchangeNames = (exchangeNames: string[]) => {
    const exchangeMapping: Record<string, string> = {
      업비트: "업비트",
      빗썸: "빗썸",
      바이낸스: "바이낸스",
      바이빗: "바이빗",
      OKX: "OKX",
    };

    const formattedNames = exchangeNames
      .map((name) => exchangeMapping[name] || name)
      .sort();

    return formattedNames.join("&");
  };

  // AutoComplete 옵션 생성 함수
  const createAutoCompleteOptions = (
    coins: typeof availableCoins
  ): AutoCompleteOption[] => {
    return coins.map((coin) => ({
      value: coin.id,
      label: coin.symbol,
      searchText: `${coin.symbol} ${coin.name} ${coin.availableExchanges?.join(" ") || ""}`,
      metadata: coin,
    }));
  };

  // 사용 가능한 코인 옵션을 AutoComplete 형태로 변환
  const getAutoCompleteOptions = (
    currentValue: string
  ): AutoCompleteOption[] => {
    const selectedCoins = [selectedCoin1, selectedCoin2, selectedCoin3].filter(
      (coin) => coin !== "" && coin !== "none" && coin !== currentValue
    );
    const filteredCoins = availableCoins.filter(
      (coin) => !selectedCoins.includes(coin.id)
    );
    return createAutoCompleteOptions(filteredCoins);
  };

  // "선택 안함" 옵션이 포함된 AutoComplete 옵션 (코인 2, 3용)
  const getOptionalAutoCompleteOptions = (
    currentValue: string
  ): AutoCompleteOption[] => {
    const noneOption: AutoCompleteOption = {
      value: "none",
      label: "선택 안함",
      searchText: "선택 안함 none",
      metadata: { symbol: "", name: "선택 안함", availableExchanges: [] },
    };

    return [noneOption, ...getAutoCompleteOptions(currentValue)];
  };

  // 자동매매 시작 조건 확인
  const conditions = useMemo(() => {
    const hasKoreanExchange = connections.some(
      (c) =>
        c.isConnected &&
        (c.exchangeName === KoreanExchangeType.업비트 ||
          c.exchangeName === KoreanExchangeType.빗썸)
    );
    const hasGlobalExchange = connections.some(
      (c) =>
        c.isConnected &&
        (c.exchangeName === KoreanExchangeType.바이낸스 ||
          c.exchangeName === KoreanExchangeType.바이빗 ||
          c.exchangeName === KoreanExchangeType.OKX)
    );
    const hasStarterPlan = userPlan && userPlan.name !== "Free";

    return [
      {
        text: "최소 1개의 국내 거래소 연결",
        satisfied: hasKoreanExchange,
      },
      {
        text: "최소 1개의 해외 거래소 연결",
        satisfied: hasGlobalExchange,
      },
      {
        text: "Starter 플랜 이상 구독",
        satisfied: hasStarterPlan,
      },
    ];
  }, [connections, userPlan]);

  // 모든 조건이 만족되었는지 확인
  const allConditionsSatisfied = useMemo(() => {
    return conditions.every((condition) => condition.satisfied);
  }, [conditions]);

  // 자동매매 관련 액션 핸들러 (시작, 중지, 설정변경 통합)
  const handleAutoTradingAction = (actionType: "start" | "stop" | "update") => {
    const selectedCoins = [selectedCoin1, selectedCoin2, selectedCoin3].filter(
      (coin) => coin !== "" && coin !== "none"
    );

    // start나 update일 때만 검증 수행
    if (actionType === "start" || actionType === "update") {
      if (!seedAmount[0] || isNaN(seedAmount[0]) || seedAmount[0] <= 0) {
        toast.error("시드 금액을 올바르게 입력하세요.");
        return;
      }
      if (coinMode === "custom" && selectedCoins.length === 0) {
        toast.error("최소 1개 이상의 코인을 선택하세요.");
        return;
      }
      if (!entryRate || isNaN(entryRate) || entryRate <= 0) {
        toast.error("진입 환율을 올바르게 입력하세요.");
        return;
      }
      if (!exitRate || isNaN(exitRate) || exitRate <= 0) {
        toast.error("종료 환율을 올바르게 입력하세요.");
        return;
      }
      if (!seedDivision || isNaN(seedDivision) || seedDivision < 1) {
        toast.error("시드 분할 횟수를 올바르게 입력하세요.");
        return;
      }

      // 모든 연결된 거래소의 잔액 체크
      for (const exchange of exchangeBalances) {
        let requiredAmount = seedAmount[0];
        // 해외 거래소는 환율 적용
        if (exchange.currency === "USDT" && currentExchangeRate) {
          requiredAmount = Math.ceil(seedAmount[0] / currentExchangeRate);
        }
        if (exchange.availableBalance < requiredAmount) {
          toast.error(
            `${exchange.exchangeName}의 보유잔액이 필요금액(${requiredAmount} ${exchange.currency})보다 부족합니다.`
          );
          return;
        }
      }
    }

    const formData = new FormData();
    formData.append("action", actionType);

    // start나 update일 때 전략 파라미터 전송
    if (actionType === "start" || actionType === "update") {
      formData.append("seedAmount", seedAmount[0].toString());
      formData.append("coinMode", coinMode);
      formData.append("selectedCoins", JSON.stringify(selectedCoins));
      formData.append("entryRate", entryRate.toString());
      formData.append("exitRate", exitRate.toString());
      formData.append("seedDivision", seedDivision.toString());
      formData.append("leverage", leverage.toString());
      formData.append("allowAverageDown", allowAverageDown.toString());
      formData.append("allowAverageUp", allowAverageUp.toString());
    }

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/strategy",
    });
  };

  // 기존 함수들을 새로운 통합 함수로 래핑
  const handleAutoTradingToggle = () => {
    handleAutoTradingAction(isEnabled ? "stop" : "start");
  };

  const handleAutoTradingUpdate = () => {
    handleAutoTradingAction("update");
  };

  // UI 업데이트는 fetcher.data가 정상적으로 들어왔을 때 useEffect에서 처리
  // fetcher.data가 정상적으로 들어오면 UI 업데이트
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        const message = fetcher.data.message;
        if (message.includes("시작")) {
          setIsEnabled(true);
          toast.success(message);
        } else if (message.includes("중지")) {
          setIsEnabled(false);
          toast.success(message);
        } else if (message.includes("변경")) {
          // 설정 변경의 경우 isEnabled 상태는 그대로 유지
          toast.success(message);
        }
      } else if (fetcher.data.message) {
        toast.error(fetcher.data.message);
      } else {
        toast.error("서버 오류가 발생했습니다. 다시 시도해주세요.");
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header with Prominent Toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1>자동매매 설정</h1>
            <p className="text-muted-foreground">
              김치 프리미엄 기반 자동매매 전략을 설정하세요
            </p>
          </div>
        </div>

        {/* Prominent Auto Trading Control */}
        <div className="hidden lg:flex items-center justify-center p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg border-2 border-dashed border-primary/20">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-medium mb-1">자동매매 상태</div>
              <div className="flex flex-col items-center gap-1">
                <Badge
                  variant={isEnabled ? "destructive" : "secondary"}
                  className="text-sm px-3 py-1"
                >
                  {isEnabled ? "실행 중" : "정지"}
                </Badge>
                {activeStrategy?.planExpiryInfo && (
                  <Badge
                    variant={
                      activeStrategy.planExpiryInfo.startsWith("D-")
                        ? "outline"
                        : "destructive"
                    }
                    className="text-xs px-2 py-1"
                  >
                    {activeStrategy.planExpiryInfo.startsWith("D-")
                      ? `${activeStrategy.planExpiryInfo.replace("D-", "")}일 후 플랜 만료`
                      : activeStrategy.planExpiryInfo}
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-px h-12 bg-border"></div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                onClick={handleAutoTradingToggle}
                disabled={!allConditionsSatisfied} // 거래소 연동 필요
                className="gap-2 px-6 text-white"
              >
                {isEnabled ? (
                  <>
                    <Pause className="w-4 h-4" />
                    자동매매 정지
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    자동매매 시작
                  </>
                )}
              </Button>
              {isEnabled && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleAutoTradingUpdate}
                        disabled={fetcher.state === "submitting"}
                        className="gap-2 px-6"
                      >
                        <Settings className="w-4 h-4" />
                        {fetcher.state === "submitting"
                          ? "설정 변경 중..."
                          : "설정 변경"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-white">
                      <p>
                        자동매매 설정을 변경할 수 있습니다. 예를 들어, 커스텀
                        모드일 때, 거래코인을 변경할 수 있습니다
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Toggle */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between">
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "실행 중" : "정지"}
            </Badge>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleAutoTradingToggle}
              disabled={!allConditionsSatisfied} // 거래소 연동 필요
            />
          </div>
        </div>
      </div>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>자동매매 시작 조건</CardTitle>
          <CardDescription>
            다음 조건을 모두 만족해야 자동매매를 시작할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    condition.satisfied
                      ? "border-green-500 bg-green-500"
                      : "border-muted"
                  }`}
                >
                  {condition.satisfied ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2 h-2 bg-muted rounded-full" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    condition.satisfied
                      ? "text-green-700 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {condition.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trading Status */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">현재 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">
              {isEnabled ? "실행 중" : "정지"}
            </div>
            <div className="text-xs text-muted-foreground">
              {isEnabled
                ? activeStrategy
                  ? `전략: ${activeStrategy.name}`
                  : "자동매매 진행 중"
                : allConditionsSatisfied
                  ? "시작 준비 완료"
                  : "연동 필요"}
            </div>
          </CardContent>
        </Card>

        <ActivePositionDisplay
          count={activePositionCount}
          isLoading={isLoadingPositions}
        />
      </div>

      {/* Active Position Management - Full width section */}
      <ActivePositionManagement
        positions={polledActivePositions}
        isLoading={isLoadingPositions}
        currentExchangeRate={currentExchangeRate || 1300}
        onPositionClose={(coinSymbol) => {
          // 포지션 종료 후 새로고침 (로딩 표시)
          pollActivePositions(true);
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
              현재 포지션 추이를 실시간으로 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <p className="text-muted-foreground mb-4">
                자동매매를 시작하면 활성 포지션의 차트를 실시간으로 확인할 수
                있습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                아래 설정을 완료한 후 자동매매를 활성화해보세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategy Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>기본 설정</CardTitle>
            <CardDescription>
              자동매매 기본 파라미터를 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seed Amount */}
            <div className="space-y-3">
              <div className="border-b border-border pb-2 mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  시드 금액 설정
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  시드금액은 원화 기준이며, 국내 거래소와 해외 거래소에 해당
                  금액이 각각 준비되어 있어야 합니다. 주문가능금액이 설정한
                  시드금액보다 부족할 경우 자동매매 주문이 실패할 수 있습니다.
                </p>
              </div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">시드 금액</label>
                <span className="text-sm text-muted-foreground">
                  {formatKRW(seedAmount[0])}
                </span>
              </div>
              <Slider
                value={seedAmount}
                onValueChange={setSeedAmount}
                max={100000000} // 1억
                min={1000000} // 100만
                step={1000000} // 100만 단위
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100만원</span>
                <span>1억원</span>
              </div>
            </div>

            {/* Exchange Balance Information */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    연결된 거래소별 잔액 현황
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm text-white">
                          연결된 거래소별 주문가능잔액과 시드금액 기준
                          필요자금을 확인하세요.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  현재 환율: 1 USD ={" "}
                  {currentExchangeRate
                    ? currentExchangeRate.toLocaleString()
                    : "-"}{" "}
                  KRW
                </p>
              </div>

              <div className="space-y-3">
                {exchangeBalances.map((exchange) => {
                  const requiredAmount = calculateRequiredAmount(
                    exchange,
                    seedAmount[0]
                  );
                  const balanceStatus = getBalanceStatus(
                    exchange.availableBalance,
                    requiredAmount
                  );

                  return (
                    <div
                      key={exchange.exchangeName}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{exchange.icon}</span>
                          <span className="text-sm font-medium">
                            {exchange.exchangeName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {exchange.type === "domestic" ? "국내" : "해외"}
                          </Badge>
                        </div>
                        <div
                          className={`text-xs px-2 py-1 rounded ${
                            balanceStatus === "loading"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300"
                              : balanceStatus === "sufficient"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : balanceStatus === "warning"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {balanceStatus === "loading"
                            ? "로딩중"
                            : balanceStatus === "sufficient"
                              ? "충분"
                              : balanceStatus === "warning"
                                ? "부족"
                                : "매우부족"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground mb-1">
                            보유 잔액
                          </div>
                          <div className="font-medium">
                            {formatCurrency(
                              exchange.availableBalance,
                              exchange.currency
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">
                            필요 금액
                          </div>
                          <div className="font-medium">
                            {requiredAmount !== null
                              ? formatCurrency(
                                  requiredAmount,
                                  exchange.currency
                                )
                              : "-"}
                          </div>
                        </div>
                      </div>

                      {balanceStatus !== "sufficient" &&
                        balanceStatus !== "loading" &&
                        requiredAmount !== null && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {exchange.type === "domestic"
                              ? `${formatCurrency(requiredAmount - exchange.availableBalance, exchange.currency)} 추가 입금 필요`
                              : `$${Math.ceil(requiredAmount - exchange.availableBalance).toLocaleString()} 추가 입금 필요`}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              {exchangeBalances.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">연결된 거래소가 없습니다.</p>
                  <p className="text-xs">
                    거래소 연동 페이지에서 거래소를 연결해주세요.
                  </p>
                </div>
              )}
            </div>

            {/* Coin Selection Mode */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  거래 코인 선택
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  거래할 암호화폐를 선택하세요
                </p>

                {/* 입출금 제한 코인 표시 */}
                {currentRestrictedCoins.length > 0 && (
                  <div className="mt-3">
                    <Collapsible
                      open={showRestrictedCoins}
                      onOpenChange={setShowRestrictedCoins}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>
                              입출금 제한 코인 {currentRestrictedCoins.length}개
                            </span>
                            {showRestrictedCoins ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        <div className="text-xs text-muted-foreground mb-2">
                          다음 코인들은 입출금 제한이 있어 거래에 주의가
                          필요합니다. 또한, 입출금 제한 코인은 5분마다
                          최신화됩니다.
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-8 text-xs">
                                  거래소
                                </TableHead>
                                <TableHead className="h-8 text-xs">
                                  코인
                                </TableHead>
                                <TableHead className="h-8 text-xs">
                                  입금
                                </TableHead>
                                <TableHead className="h-8 text-xs">
                                  출금
                                </TableHead>
                                <TableHead className="h-8 text-xs">
                                  네트워크
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentRestrictedCoins
                                .slice(0, 20)
                                .map((coin, index) => (
                                  <TableRow key={index} className="text-xs">
                                    <TableCell className="py-2">
                                      {coin.exchangeName}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <div>
                                        <div className="font-medium">
                                          {coin.coinSymbol}
                                        </div>
                                        <div className="text-muted-foreground text-xs truncate max-w-[100px]">
                                          {coin.displayName}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2">
                                      {coin.depositYn ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <X className="w-3 h-3 text-red-500" />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      {coin.withdrawYn ? (
                                        <Check className="w-3 h-3 text-green-500" />
                                      ) : (
                                        <X className="w-3 h-3 text-red-500" />
                                      )}
                                    </TableCell>
                                    <TableCell className="py-2 text-muted-foreground">
                                      {coin.netType || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          {currentRestrictedCoins.length > 20 && (
                            <div className="text-xs text-muted-foreground text-center py-2 bg-muted/30">
                              {currentRestrictedCoins.length - 20}개 코인 더
                              있음...
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-select"
                    checked={coinMode === "auto"}
                    onCheckedChange={(checked) => {
                      if (userPlan?.name === "Premium") {
                        setCoinMode(checked ? "auto" : "custom");
                      }
                    }}
                    disabled={userPlan?.name !== "Premium"}
                  />
                  <Label htmlFor="auto-select" className="text-sm">
                    자동 선택 {userPlan?.name !== "Premium" && "(Premium 전용)"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="custom-select"
                    checked={coinMode === "custom"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCoinMode("custom");
                      } else if (userPlan?.name === "Premium") {
                        setCoinMode("auto");
                      }
                      // 프리미엄이 아닌 사용자가 사용자 정의를 해제하려고 하면 아무것도 하지 않음
                    }}
                  />
                  <Label htmlFor="custom-select" className="text-sm">
                    사용자 정의
                  </Label>
                </div>
              </div>

              {/* Custom Coin Selection with 3 Select Boxes */}
              {coinMode === "custom" && (
                <div className="space-y-3 pl-6 border-l-2 border-muted">
                  <div className="text-xs text-muted-foreground">
                    거래할 코인을 선택하세요 (최대 3개)
                  </div>

                  {/* 거래소 연결 경고문 */}
                  {!hasConnectedExchanges && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        거래소 연결이 완료되지 않아 선택할 수 없습니다. 거래소를
                        먼저 연결해주세요.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">코인 1 (필수)</Label>
                    <AutoComplete
                      value={selectedCoin1}
                      onSelect={setSelectedCoin1}
                      options={getAutoCompleteOptions(selectedCoin1)}
                      placeholder={
                        hasConnectedExchanges
                          ? "코인을 검색하거나 선택하세요"
                          : "거래소를 먼저 연결해주세요"
                      }
                      disabled={!hasConnectedExchanges}
                      renderOption={(option) => (
                        <div className="flex items-center gap-2">
                          <span>{option.metadata.symbol}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.metadata.name}
                            {option.metadata.availableExchanges &&
                              option.metadata.availableExchanges.length > 0 && (
                                <span className="ml-1">
                                  (
                                  {formatExchangeNames(
                                    option.metadata.availableExchanges
                                  )}
                                  )
                                </span>
                              )}
                          </span>
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">코인 2 (선택)</Label>
                    <AutoComplete
                      value={selectedCoin2}
                      onSelect={setSelectedCoin2}
                      options={getOptionalAutoCompleteOptions(selectedCoin2)}
                      placeholder={
                        hasConnectedExchanges
                          ? "코인을 검색하거나 선택하세요"
                          : "거래소를 먼저 연결해주세요"
                      }
                      disabled={!hasConnectedExchanges}
                      renderOption={(option) => {
                        if (option.value === "none") {
                          return (
                            <span className="text-muted-foreground">
                              선택 안함
                            </span>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <span>{option.metadata.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.metadata.name}
                              {option.metadata.availableExchanges &&
                                option.metadata.availableExchanges.length >
                                  0 && (
                                  <span className="ml-1">
                                    (
                                    {formatExchangeNames(
                                      option.metadata.availableExchanges
                                    )}
                                    )
                                  </span>
                                )}
                            </span>
                          </div>
                        );
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">코인 3 (선택)</Label>
                    <AutoComplete
                      value={selectedCoin3}
                      onSelect={setSelectedCoin3}
                      options={getOptionalAutoCompleteOptions(selectedCoin3)}
                      placeholder={
                        hasConnectedExchanges
                          ? "코인을 검색하거나 선택하세요"
                          : "거래소를 먼저 연결해주세요"
                      }
                      disabled={!hasConnectedExchanges}
                      renderOption={(option) => {
                        if (option.value === "none") {
                          return (
                            <span className="text-muted-foreground">
                              선택 안함
                            </span>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <span>{option.metadata.symbol}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.metadata.name}
                              {option.metadata.availableExchanges &&
                                option.metadata.availableExchanges.length >
                                  0 && (
                                  <span className="ml-1">
                                    (
                                    {formatExchangeNames(
                                      option.metadata.availableExchanges
                                    )}
                                    )
                                  </span>
                                )}
                            </span>
                          </div>
                        );
                      }}
                    />
                  </div>

                  {getSelectedCoins().length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      선택된 코인: {getSelectedCoins().join(", ")} (
                      {getSelectedCoins().length}/3)
                    </div>
                  )}
                </div>
              )}

              {/* Auto Selection Info */}
              {coinMode === "auto" && userPlan?.name === "Premium" && (
                <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded border-l-2 border-primary">
                  💡 AI가 김치 프리미엄 분석을 통해 최적의 코인을 자동으로
                  선택합니다
                </div>
              )}
            </div>

            {/* Exchange Rate Settings */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    환율 설정
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm text-white">
                          포지션 진입과 종료 시점을 결정하는 USD/KRW 환율을
                          설정합니다.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  포지션 진입과 종료 기준 환율을 설정하세요
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  현재 환율: 1 USD ={" "}
                  {currentExchangeRate
                    ? currentExchangeRate.toLocaleString()
                    : "-"}{" "}
                  KRW
                </p>
              </div>

              {/* Entry Rate */}
              <div className="space-y-2">
                <Label className="text-sm">포지션 진입 환율</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRate("entry", "decrease")}
                    className="p-2 h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      value={entryRate.toFixed(2)}
                      onChange={(e) =>
                        setEntryRate(parseFloat(e.target.value) || 0)
                      }
                      className="text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      원
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRate("entry", "increase")}
                    className="p-2 h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Exit Rate */}
              <div className="space-y-2">
                <Label className="text-sm">포지션 종료 환율</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRate("exit", "decrease")}
                    className="p-2 h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      value={exitRate.toFixed(2)}
                      onChange={(e) =>
                        setExitRate(parseFloat(e.target.value) || 0)
                      }
                      className="text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      원
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => adjustRate("exit", "increase")}
                    className="p-2 h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                💡 진입 환율이 종료 환율보다 낮으면 환율 하락 시 매수, 상승 시
                매도하는 전략입니다.
              </div>
            </div>

            {/* Seed Division Setting */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    시드 분할 설정
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm text-white">
                          시드를 여러 번에 나누어 진입하여 리스크를 분산할 수
                          있습니다.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  시드를 분할하여 리스크를 분산하세요
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">분할 횟수</Label>
                <Select
                  value={seedDivision.toString()}
                  onValueChange={(value) => setSeedDivision(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1회 (일괄 진입)</SelectItem>
                    <SelectItem value="2">2회 분할</SelectItem>
                    <SelectItem value="3">3회 분할</SelectItem>
                    <SelectItem value="4">4회 분할</SelectItem>
                    <SelectItem value="5">5회 분할</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {seedDivision === 1
                    ? "전체 시드를 한 번에 투입합니다"
                    : `시드를 ${seedDivision}번에 나누어 진입합니다 (회당 ${Math.round(
                        100 / seedDivision
                      )}%씩)`}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  거래소에 주문 가능한 잔액이 부족하거나 소진되면 포지션 주문이
                  실패할 수 있습니다. 충분한 잔액을 유지해 주세요.
                </AlertDescription>
              </Alert>
            </div>

            {/* Leverage Settings */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    해외거래소 레버리지 설정
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-sm text-white">
                          해외거래소(바이낸스, 바이비트, OKX)에서 사용할
                          레버리지 배수를 설정합니다. 높은 레버리지는 높은
                          수익률과 함께 높은 리스크를 동반합니다.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  해외거래소 선물거래 레버리지 배수를 설정하세요
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">레버리지 배수</Label>
                <Select
                  value={leverage.toString()}
                  onValueChange={(value) => setLeverage(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1배</SelectItem>
                    <SelectItem value="2">2배</SelectItem>
                    <SelectItem value="3">3배</SelectItem>
                    <SelectItem value="5">5배</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  {leverage === 1
                    ? "현물거래로 진행됩니다 (레버리지 없음)"
                    : `${leverage}배 레버리지가 적용됩니다`}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  레버리지는 수익과 손실을 모두 증폭시킵니다. 높은 레버리지 사용
                  시 충분한 마진을 유지하여 강제청산을 방지하세요.
                </AlertDescription>
              </Alert>
            </div>

            {/* Average Down/Up Settings */}
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <h3 className="text-base font-semibold text-foreground">
                  추가 진입 설정
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  물타기와 불타기 허용 여부를 설정하세요
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">물타기 허용</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-sm text-white">
                              현재 진입 환율보다 낮은 환율에서 추가 진입을
                              허용합니다.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      현재 진입 환율보다 낮을 때 추가 진입
                    </div>
                  </div>
                  <Switch
                    checked={allowAverageDown}
                    onCheckedChange={setAllowAverageDown}
                    disabled={userPlan?.name === "Free"}
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">불타기 허용</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-sm text-white">
                              현재 진입 환율보다 높은 환율에서도 추가 진입을
                              허용합니다.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      현재 진입 환율보다 높아도 추가 진입
                    </div>
                  </div>
                  <Switch
                    checked={allowAverageUp}
                    onCheckedChange={setAllowAverageUp}
                    disabled={userPlan?.name === "Free"}
                  />
                </div>

                {userPlan?.name === "Free" && (
                  <div className="text-xs text-muted-foreground">
                    추가 진입 설정은 Starter 플랜 이상에서 사용 가능합니다
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              고급 전략
              <Badge variant="secondary" className="ml-auto">
                Premium
              </Badge>
            </CardTitle>
            <CardDescription>AI 기반 고급 전략 및 알림 설정</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-b border-border pb-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    AI 전략 모드
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-md text-white">
                          AI가 실시간 분석으로 포지션 진입과 종료 환율을 자동
                          조정합니다.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  고정된 환율이 아닌 실시간 AI 분석으로 유동적 진입
                </p>
              </div>

              <div className="space-y-2">
                <Select disabled={userPlan?.name !== "Premium"}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        userPlan?.name === "Premium"
                          ? "AI 모드 선택"
                          : "Premium 플랜 필요"
                      }
                    />
                  </SelectTrigger>
                  {userPlan?.name === "Premium" && (
                    <SelectContent>
                      <SelectItem value="conservative">보수적 AI</SelectItem>
                      <SelectItem value="balanced">균형 AI</SelectItem>
                      <SelectItem value="aggressive">공격적 AI</SelectItem>
                    </SelectContent>
                  )}
                </Select>
                <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded border-l-2 border-primary">
                  💡 AI 모드는 실시간 테더가격과의 갭, 차트 백테스팅 결과,
                  기술적 지표들을 종합 분석하여 사용자가 설정한 고정 환율이 아닌
                  유동적인 기준으로 포지션에 진입합니다. 시장 상황에 따라 최적의
                  타이밍을 AI가 판단하여 자동으로 매매를 실행합니다.
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-base font-semibold text-foreground">
                    알림 설정
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    거래 알림 방식을 설정하세요
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">웹훅 알림</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-sm text-white">
                                포지션 진입 시 상세 정보와 진입 근거를 웹훅으로
                                전송합니다.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        포지션 진입점 상세 정보와 진입 근거 전송
                      </div>
                    </div>
                    <Switch disabled={userPlan?.name === "Free"} />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">텔레그램 알림</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-sm text-white">
                                포지션 진입 시 텔레그램으로 실시간 알림을
                                받습니다.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        포지션 진입점 상세 정보와 진입 근거 전송
                      </div>
                    </div>
                    <Switch disabled={userPlan?.name === "Free"} />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="border-b border-border pb-2 mb-4">
                  <h3 className="text-base font-semibold text-foreground">
                    백테스트
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Karbit 독점 김치프리미엄 매매 백테스팅
                  </p>
                </div>

                <div className="space-y-2">
                  <Select disabled={userPlan?.name !== "Premium"}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          userPlan?.name === "Premium"
                            ? "기간 선택"
                            : "Premium 플랜 필요"
                        }
                      />
                    </SelectTrigger>
                    {userPlan?.name === "Premium" && (
                      <SelectContent>
                        <SelectItem value="1m">1개월</SelectItem>
                        <SelectItem value="3m">3개월</SelectItem>
                        <SelectItem value="6m">6개월</SelectItem>
                        <SelectItem value="1y">1년</SelectItem>
                      </SelectContent>
                    )}
                  </Select>
                  <div className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded border-l-2 border-secondary">
                    🚀 Karbit에서만 제공하는 독점적인 김치프리미엄 기반 자동매매
                    백테스팅을 통해 전략의 과거 성과를 분석하고 최적화된
                    매개변수를 찾을 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Statistics */}
      <TradingStats stats={tradingStats} isLoading={isLoadingTradingData} />

      {/* Trading History */}
      <TradingHistoryTable
        tradingHistory={tradingHistory}
        pagination={pagination}
        isLoading={isLoadingTradingData}
      />

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>제어판</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              disabled={!isEnabled || activePositionCount === 0}
              variant="destructive"
              className="flex-1 gap-2"
              title={
                activePositionCount === 0
                  ? "종료할 포지션이 없습니다"
                  : `모든 활성 포지션 ${activePositionCount}개 강제 종료`
              }
            >
              <StopCircle className="w-4 h-4" />
              전체 포지션 강제 종료 ({activePositionCount})
            </Button>
            <Button
              disabled={userPlan?.name !== "Premium"}
              variant="outline"
              className="flex-1 gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              {userPlan?.name === "Premium"
                ? "백테스트 실행"
                : "백테스트 (Premium)"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
