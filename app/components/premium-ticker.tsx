import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Lock, Loader2 } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Badge } from "./badge";
import { Slider } from "./slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
import { formatKRW } from "~/utils/decimal";

type ExRate = {
  seed: number;
  entry_ex_rate: number;
  exit_ex_rate: number;
};
type TickPayload = {
  symbol: string; // e.g., BTC, ETH
  premium?: number; // e.g., 0.025 means +2.5%
  krPrice?: number;
  globalPrice?: number;
  ts?: number;
  korean_ex?: string;
  foreign_ex?: string;
  ex_rates?: ExRate[];
};

type TickMessage = {
  type: "tick" | "subscribed" | "error";
  channel?: string;
  payload?: TickPayload | TickPayload[] | any;
};

type OrderData = {
  krExchange: string;
  frExchange: string;
  orderAmount: number;
  leverage: number;
  krBalance: number;
  frBalance: number;
};

const PremiumTicker = React.memo(
  function PremiumTicker({
    endpoint = "/api/premium/stream",
    isLocked = true,
    onAverageRateChange,
    onItemSelected,
    exchangeBalances = [],
  }: {
    endpoint?: string;
    title?: string;
    isLocked?: boolean;
    onAverageRateChange?: (
      averageRate: number | null,
      selectedSeed: number | null
    ) => void;
    onItemSelected?: (item: TickPayload | null) => void;
    exchangeBalances?: Array<{
      name: string;
      krwBalance: number;
      currency: string;
    }>;
  }) {
    const [items, setItems] = useState<TickPayload[]>([]);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortBy, setSortBy] = useState<"entry" | "exit" | "slippage">(
      "entry"
    );
    const [selectedSeed, setSelectedSeed] = useState<number>(1000000);
    const [selectedItem, setSelectedItem] = useState<TickPayload | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filteredItems, setFilteredItems] = useState<TickPayload[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [pinnedItem, setPinnedItem] = useState<
      | (TickPayload & {
          _entryRate: number | null;
          _exitRate: number | null;
          _slippage: number | null;
        })
      | null
    >(null);
    const [loadingButtons, setLoadingButtons] = useState<Set<string>>(
      new Set()
    );
    const [orderData, setOrderData] = useState<OrderData[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<{
      isOpen: boolean;
      symbol: string;
      koreanEx: string;
      foreignEx: string;
      orderAmount: number;
      leverage: number;
    } | null>(null);
    const esRef = useRef<EventSource | null>(null);
    const tableContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      // ⭐ 모든 플랜에서 실시간 환율 데이터를 표시 (isLocked 체크 제거)
      const es = new EventSource(endpoint);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const msg: TickMessage = JSON.parse(ev.data);
          if (msg.type === "tick") {
            const payload = msg.payload as TickPayload | TickPayload[];
            const newItems = Array.isArray(payload) ? payload : [payload];
            setItems((prev) => {
              // upsert: symbol + korean_ex + foreign_ex 조합이 같으면 교체, 없으면 append
              const key = (it: TickPayload) =>
                `${it.symbol}|${it.korean_ex}|${it.foreign_ex}`;
              // 기존 데이터를 복사
              let updated = [...prev];
              for (const item of newItems) {
                if (!item.symbol || !item.korean_ex || !item.foreign_ex)
                  continue;
                const k = key(item);
                const idx = updated.findIndex((it) => key(it) === k);
                if (idx >= 0) {
                  updated[idx] = item;
                } else {
                  updated.push(item);
                }
              }
              return updated;
            });
          }
        } catch {
          // ignore malformed lines
        }
      };
      es.onerror = () => {
        // Attempt simple reconnect
        es.close();
        setTimeout(() => {
          esRef.current = new EventSource(endpoint);
        }, 1500);
      };
      return () => {
        es.close();
      };
    }, [endpoint]); // ⭐ isLocked 의존성 제거

    // 표 렌더링 - 항상 환율 기준으로 정렬된 모든 데이터 표시
    const sortedItems = useMemo(() => {
      if (!selectedSeed) return [];
      // 환율 및 슬리피지 계산
      const withRate = items.map((it) => {
        let entryRate = null;
        let exitRate = null;
        let slippage = null;
        if (Array.isArray(it.ex_rates)) {
          const found = it.ex_rates.find((ex) => ex.seed === selectedSeed);
          if (found) {
            entryRate = found.entry_ex_rate;
            exitRate = found.exit_ex_rate;
            // 슬리피지 계산: |(진입환율 - 종료환율) / 진입환율| * 100 (%)
            if (entryRate !== null && exitRate !== null && entryRate !== 0) {
              slippage = Math.abs((entryRate - exitRate) / entryRate) * 100;
            }
          }
        }
        return {
          ...it,
          _entryRate: entryRate,
          _exitRate: exitRate,
          _slippage: slippage,
        };
      });

      // sortBy에 따라 정렬
      withRate.sort((a, b) => {
        let aValue: number | null = null;
        let bValue: number | null = null;

        if (sortBy === "entry") {
          aValue = a._entryRate;
          bValue = b._entryRate;
        } else if (sortBy === "exit") {
          aValue = a._exitRate;
          bValue = b._exitRate;
        } else if (sortBy === "slippage") {
          aValue = a._slippage;
          bValue = b._slippage;
        }

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
      return withRate;
    }, [items, selectedSeed, sortOrder, sortBy]);

    // 고정된 아이템의 실시간 데이터 업데이트
    useEffect(() => {
      if (!pinnedItem) return;

      // sortedItems에서 동일한 아이템 찾기
      const updatedItem = sortedItems.find(
        (it) =>
          it.symbol === pinnedItem.symbol &&
          it.korean_ex === pinnedItem.korean_ex &&
          it.foreign_ex === pinnedItem.foreign_ex
      );

      if (updatedItem) {
        setPinnedItem(updatedItem);
      }
    }, [sortedItems, pinnedItem]);

    // 평균 환율 계산 (진입 환율 기준)
    const averageRate = useMemo(() => {
      if (!sortedItems.length || !selectedSeed) return null;

      const validRates = sortedItems
        .filter(
          (item) => item._entryRate !== null && item._entryRate !== undefined
        )
        .map((item) => item._entryRate as number);

      if (validRates.length === 0) return null;

      const sum = validRates.reduce((acc, rate) => acc + rate, 0);
      return sum / validRates.length;
    }, [sortedItems, selectedSeed]);

    // 평균 환율 변경 시 콜백 호출
    useEffect(() => {
      if (onAverageRateChange) {
        onAverageRateChange(averageRate, selectedSeed);
      }
    }, [averageRate, selectedSeed, onAverageRateChange]);

    // 선택된 아이템 변경 시 콜백 호출
    useEffect(() => {
      if (onItemSelected && selectedItem) {
        onItemSelected(selectedItem);
      }
    }, [selectedItem, onItemSelected]);

    // 검색 입력 시 자동완성 필터링
    useEffect(() => {
      if (searchQuery.trim() === "") {
        setFilteredItems([]);
        setShowSuggestions(false);
        return;
      }

      // 티커 심볼로 필터링 (중복 포함)
      const filtered = items
        .filter((item) =>
          item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5); // 최대 5개까지만 표시

      setFilteredItems(filtered);
      setShowSuggestions(filtered.length > 0);
    }, [searchQuery, items]);

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

      // 거래소 이름 매핑 (한글 -> 영어)
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
            // 10000원 단위로 절삭
            const truncatedBalance = Math.floor(minBalance / 10000) * 10000;
            newOrderData.push({
              krExchange: exchangeNameMap[kr.name] || kr.name, // 영어 이름으로 변환
              frExchange: exchangeNameMap[fr.name] || fr.name, // 영어 이름으로 변환
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

    // 티커 검색 및 고정
    const handleSearch = (
      symbol: string,
      koreanEx?: string,
      foreignEx?: string
    ) => {
      const trimmedSymbol = symbol.trim().toUpperCase();
      if (!trimmedSymbol) {
        toast.error("티커 심볼을 입력해주세요");
        return;
      }

      // 테이블에서 해당 티커 찾기
      let targetItem = null;

      if (koreanEx && foreignEx) {
        // 거래소 정보가 있으면 정확히 일치하는 항목 찾기
        targetItem = sortedItems.find(
          (it) =>
            it.symbol.toUpperCase() === trimmedSymbol &&
            it.korean_ex?.toUpperCase() === koreanEx.toUpperCase() &&
            it.foreign_ex?.toUpperCase() === foreignEx.toUpperCase()
        );
      } else {
        // 거래소 정보가 없으면 첫 번째 일치하는 티커 찾기
        targetItem = sortedItems.find(
          (it) => it.symbol.toUpperCase() === trimmedSymbol
        );
      }

      if (!targetItem) {
        toast.error(`${trimmedSymbol} 티커를 찾을 수 없습니다`);
        return;
      }

      // 검색된 아이템을 고정
      setPinnedItem(targetItem);
      setSelectedItem(targetItem);

      // 성공 토스트
      const exchangeInfo =
        koreanEx && foreignEx ? ` (${koreanEx} → ${foreignEx})` : "";
      toast.success(`${trimmedSymbol}${exchangeInfo} 티커를 고정했습니다!`);

      // 검색창 초기화
      setSearchQuery("");
      setShowSuggestions(false);
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

    // 레버리지 조정 함수
    const increaseLeverage = (idx: number) => {
      setOrderData((prev) => {
        const newData = [...prev];
        if (newData[idx]) {
          newData[idx].leverage = prev[idx].leverage + 1;
          // orderAmount 재계산
          const newMax = Math.min(
            newData[idx].krBalance,
            newData[idx].frBalance * newData[idx].leverage
          );
          // 10000원 단위로 절삭
          const truncatedBalance = Math.floor(newMax / 10000) * 10000;
          newData[idx].orderAmount = truncatedBalance;
        }
        return newData;
      });
    };

    const decreaseLeverage = (idx: number) => {
      setOrderData((prev) => {
        const newData = [...prev];
        if (newData[idx] && newData[idx].leverage > 1) {
          newData[idx].leverage = prev[idx].leverage - 1;
          // orderAmount 재계산
          const newMax = Math.min(
            newData[idx].krBalance,
            newData[idx].frBalance * newData[idx].leverage
          );
          // 10000원 단위로 절삭
          const truncatedBalance = Math.floor(newMax / 10000) * 10000;
          newData[idx].orderAmount = truncatedBalance;
        }
        return newData;
      });
    };

    // 컨펌 창 열기
    const openConfirmDialog = (
      symbol: string,
      koreanEx?: string,
      foreignEx?: string
    ) => {
      console.log("Opening confirm dialog for", symbol, koreanEx, foreignEx);
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
        <Card>
          <CardHeader>
            <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <CardTitle className="text-lg font-semibold">
                시장가 진입 실시간 환율
              </CardTitle>
              <div className="sm:static absolute right-0 top-0 sm:right-0 sm:top-0 z-10">
                <Badge variant="secondary" className="gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  실시간
                </Badge>
              </div>
            </div>
            <CardDescription>
              <span className="text-sm text-muted-foreground/80 block">
                💡 실시간 환율과 오차가 있을 수 있습니다.
              </span>
              <span className="text-sm text-muted-foreground/80 block">
                💡 리스트를 클릭하면, 실시간 환율주문이 가능합니다
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ⭐ 모든 플랜에서 실시간 환율 표시 (잠금 UI 제거) */}
            {/* Seed Amount Slider */}
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">시장가 주문금액</label>
              <span className="text-sm text-muted-foreground">
                {formatKRW(selectedSeed)}
              </span>
            </div>
            <div className="w-full">
              <Slider
                value={[selectedSeed]}
                onValueChange={([v]) => setSelectedSeed(v)}
                max={100000000} // 1억
                min={1000000} // 100만
                step={1000000} // 100만 단위
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>100만원</span>
                <span>1억원</span>
              </div>
            </div>

            {/* 티커 검색 기능 */}
            <div className="mt-6 mb-4">
              <label className="text-sm font-medium mb-2 block">
                티커 검색
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch(searchQuery);
                        }
                      }}
                      placeholder="티커 심볼 입력 (예: BTC, ETH)"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {/* 자동완성 드롭다운 */}
                    {showSuggestions && filteredItems.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredItems.map((item) => (
                          <div
                            key={`${item.symbol}|${item.korean_ex}|${item.foreign_ex}`}
                            className="px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                              handleSearch(
                                item.symbol,
                                item.korean_ex,
                                item.foreign_ex
                              );
                            }}
                          >
                            <div className="font-medium">{item.symbol}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.korean_ex} → {item.foreign_ex}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSearch(searchQuery)}
                    className="px-4"
                  >
                    검색
                  </Button>
                </div>
              </div>
            </div>

            {/* 검색된 티커 고정 표시 */}
            {pinnedItem && (
              <div className="mb-4 border-2 border-primary rounded-lg p-3 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-primary">
                    검색된 티커
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPinnedItem(null)}
                    className="h-6 px-2 text-xs"
                  >
                    닫기
                  </Button>
                </div>
                <Table className="text-xs w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "19.5%" }} />
                    <col style={{ width: "19.5%" }} />
                  </colgroup>
                  <TableBody>
                    <TableRow className="bg-primary/10 border-primary/20">
                      <TableCell className="px-2 pl-3 font-medium text-xs text-center">
                        {pinnedItem.symbol}
                      </TableCell>
                      <TableCell className="px-2 text-xs text-center">
                        <div className="font-semibold text-blue-400">
                          {pinnedItem._entryRate !== null &&
                          pinnedItem._entryRate !== undefined
                            ? pinnedItem._entryRate.toFixed(2)
                            : "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          진입
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-xs text-center">
                        <div className="font-semibold text-orange-400">
                          {pinnedItem._exitRate !== null &&
                          pinnedItem._exitRate !== undefined
                            ? pinnedItem._exitRate.toFixed(2)
                            : "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          종료
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-xs text-center">
                        <div className="font-semibold text-purple-400">
                          {pinnedItem._slippage !== null &&
                          pinnedItem._slippage !== undefined
                            ? `${pinnedItem._slippage.toFixed(2)}%`
                            : "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          슬리피지
                        </div>
                      </TableCell>
                      <TableCell className="px-2 text-xs text-muted-foreground text-center">
                        {pinnedItem.korean_ex || "-"}
                      </TableCell>
                      <TableCell className="px-2 text-xs text-muted-foreground text-center">
                        {pinnedItem.foreign_ex || "-"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}

            <div
              ref={tableContainerRef}
              className="max-h-[400px] overflow-y-auto overflow-x-auto scrollbar-thin"
            >
              <Table className="text-xs w-full table-fixed">
                <colgroup>
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "19.5%" }} />
                  <col style={{ width: "19.5%" }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 text-xs text-center">
                      티커
                    </TableHead>
                    <TableHead
                      className="px-2 text-xs cursor-pointer select-none text-center"
                      onClick={() => {
                        if (sortBy === "entry") {
                          setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                        } else {
                          setSortBy("entry");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1 justify-center w-full">
                        진입 환율
                        {sortBy === "entry" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </span>
                    </TableHead>
                    <TableHead
                      className="px-2 text-xs cursor-pointer select-none text-center"
                      onClick={() => {
                        if (sortBy === "exit") {
                          setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                        } else {
                          setSortBy("exit");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1 justify-center w-full">
                        종료 환율
                        {sortBy === "exit" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </span>
                    </TableHead>
                    <TableHead
                      className="px-2 text-xs cursor-pointer select-none text-center"
                      onClick={() => {
                        if (sortBy === "slippage") {
                          setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                        } else {
                          setSortBy("slippage");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1 justify-center w-full">
                        슬리피지
                        {sortBy === "slippage" &&
                          (sortOrder === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </span>
                    </TableHead>
                    <TableHead className="px-2 text-xs text-center">
                      한국거래소
                    </TableHead>
                    <TableHead className="px-2 text-xs text-center">
                      해외거래소
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            데이터를 불러오는 중...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedItems.map((it) => (
                      <TableRow
                        key={
                          it.symbol + "|" + it.korean_ex + "|" + it.foreign_ex
                        }
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedItem(it)}
                      >
                        <TableCell className="px-2 pl-3 font-medium text-xs text-center">
                          {it.symbol}
                        </TableCell>
                        <TableCell className="px-2 text-xs text-center">
                          <span className="text-blue-600 dark:text-blue-400">
                            {it._entryRate !== null &&
                            it._entryRate !== undefined
                              ? it._entryRate
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 text-xs text-center">
                          <span className="text-orange-600 dark:text-orange-400">
                            {it._exitRate !== null && it._exitRate !== undefined
                              ? it._exitRate
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 text-xs text-center">
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            {it._slippage !== null && it._slippage !== undefined
                              ? it._slippage.toFixed(2)
                              : "-"}
                            %
                          </span>
                        </TableCell>
                        <TableCell className="px-2 text-xs text-muted-foreground text-center">
                          {it.korean_ex || "-"}
                        </TableCell>
                        <TableCell className="px-2 text-xs text-muted-foreground text-center">
                          {it.foreign_ex || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 주문 컨펌 다이얼로그 */}
        <Dialog
          open={confirmDialog?.isOpen}
          onOpenChange={(open) => {
            if (!open) setConfirmDialog(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>포지션 진입 확인</DialogTitle>
              <DialogDescription>
                아래 정보로 포지션을 진입하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    심볼
                  </label>
                  <p className="text-lg font-semibold">
                    {confirmDialog?.symbol}
                  </p>
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
  },
  (prevProps: any, nextProps: any) => {
    // exchangeBalances를 JSON.stringify로 깊은 비교
    if (
      JSON.stringify(prevProps.exchangeBalances) !==
      JSON.stringify(nextProps.exchangeBalances)
    ) {
      return false;
    }
    // 다른 props는 얕은 비교 (기본 React.memo 동작)
    return (
      prevProps.endpoint === nextProps.endpoint &&
      prevProps.isLocked === nextProps.isLocked &&
      prevProps.onAverageRateChange === nextProps.onAverageRateChange &&
      prevProps.onItemSelected === nextProps.onItemSelected
    );
  }
);

export default PremiumTicker;
