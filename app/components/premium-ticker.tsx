import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Lock } from "lucide-react";
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
import { formatKRW } from "~/utils/decimal";

type ExRate = { seed: number; ex_rate: number };
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

export function PremiumTicker({
  endpoint = "/api/premium/stream",
  isLocked = true,
  onAverageRateChange,
  onItemSelected,
}: {
  endpoint?: string;
  title?: string;
  isLocked?: boolean;
  onAverageRateChange?: (
    averageRate: number | null,
    selectedSeed: number | null
  ) => void;
  onItemSelected?: (item: TickPayload | null) => void;
}) {
  const [items, setItems] = useState<TickPayload[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSeed, setSelectedSeed] = useState<number>(1000000);
  const [selectedItem, setSelectedItem] = useState<TickPayload | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredItems, setFilteredItems] = useState<TickPayload[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [pinnedItem, setPinnedItem] = useState<
    (TickPayload & { _rate: number | null }) | null
  >(null);
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
              if (!item.symbol || !item.korean_ex || !item.foreign_ex) continue;
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
    // 환율 기준 정렬
    const withRate = items.map((it) => {
      let rate = null;
      if (Array.isArray(it.ex_rates)) {
        const found = it.ex_rates.find((ex) => ex.seed === selectedSeed);
        if (found) rate = found.ex_rate;
      }
      return { ...it, _rate: rate };
    });
    withRate.sort((a, b) => {
      if (a._rate == null && b._rate == null) return 0;
      if (a._rate == null) return 1;
      if (b._rate == null) return -1;
      return sortOrder === "asc" ? a._rate - b._rate : b._rate - a._rate;
    });
    return withRate;
  }, [items, selectedSeed, sortOrder]);

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

  // 평균 환율 계산
  const averageRate = useMemo(() => {
    if (!sortedItems.length || !selectedSeed) return null;

    const validRates = sortedItems
      .filter((item) => item._rate !== null && item._rate !== undefined)
      .map((item) => item._rate as number);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              호가창 반영 실시간 환율
              {/* ⭐ Free 플랜도 볼 수 있으므로 Lock 아이콘 제거 */}
            </CardTitle>
            <CardDescription>
              시드금액 기반 실제 예상 거래 환율
              <br />
              <span className="text-xs text-muted-foreground/80 mt-1 block">
                ※ 포지션 진입 버튼을 누르면, 선택된 코인의 한국거래소에서는
                매수를, 반대로 해외거래소에서는 매도(short)를 동시에 합니다.
              </span>
              <span className="text-xs text-muted-foreground/80 block">
                ※ karbit에서 제공하는 실시간 환율과 오차가 있을 수 있습니다.
              </span>
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            실시간
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* ⭐ 모든 플랜에서 실시간 환율 표시 (잠금 UI 제거) */}
        {/* Seed Amount Slider */}
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">시드 금액</label>
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
          <label className="text-sm font-medium mb-2 block">티커 검색</label>
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
                <col style={{ width: "12%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "25%" }} />
              </colgroup>
              <TableBody>
                <TableRow className="bg-primary/10 border-primary/20">
                  <TableCell className="px-1 pr-4 text-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-green-500 hover:text-white focus:ring-2 focus:ring-green-400 transition-colors duration-150 cursor-pointer shadow-sm border border-green-300 mx-auto"
                      onClick={async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch("/api/open-position", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              coinSymbol: pinnedItem.symbol,
                              krExchange: pinnedItem.korean_ex?.toUpperCase(),
                              frExchange: pinnedItem.foreign_ex?.toUpperCase(),
                              amount: 10000,
                              leverage: 2,
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            toast.success(
                              `${pinnedItem.symbol} 포지션진입 성공!`
                            );
                          } else {
                            toast.error(
                              data.message ||
                                `${pinnedItem.symbol} 포지션진입 실패`
                            );
                            if (data.redirectTo) {
                              setTimeout(() => {
                                window.location.href = data.redirectTo;
                              }, 1000);
                            }
                          }
                        } catch (error) {
                          toast.error(`포지션진입 실패: ${error}`);
                        }
                      }}
                    >
                      <span className="hidden sm:inline">포지션진입</span>
                      <span className="sm:hidden">진입</span>
                    </Button>
                  </TableCell>
                  <TableCell className="px-2 pl-4 font-medium text-xs text-center">
                    {pinnedItem.symbol}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-center font-semibold text-primary">
                    {pinnedItem._rate !== null && pinnedItem._rate !== undefined
                      ? pinnedItem._rate
                      : "-"}
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
              <col style={{ width: "12%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 text-xs text-center">
                  {/* 포지션진입 버튼 칸 */}
                </TableHead>
                <TableHead className="px-2 text-xs text-center">티커</TableHead>
                <TableHead
                  className="px-2 text-xs cursor-pointer select-none text-center"
                  onClick={() =>
                    setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                  }
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    환율
                    {sortOrder === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
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
              {sortedItems.map((it) => (
                <TableRow
                  key={it.symbol + "|" + it.korean_ex + "|" + it.foreign_ex}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedItem(it)}
                >
                  <TableCell className="px-1 pr-3 text-center">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-green-500 hover:text-white focus:ring-2 focus:ring-green-400 transition-colors duration-150 cursor-pointer shadow-sm border border-green-300 mx-auto"
                      onClick={async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch("/api/open-position", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              coinSymbol: it.symbol,
                              krExchange: it.korean_ex?.toUpperCase(),
                              frExchange: it.foreign_ex?.toUpperCase(),
                              amount: 10000,
                              leverage: 2,
                            }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            toast.success(`${it.symbol} 포지션진입 성공!`);
                          } else {
                            toast.error(
                              data.message || `${it.symbol} 포지션진입 실패`
                            );
                            // 거래소 인증 에러인 경우 리다이렉트
                            if (data.redirectTo) {
                              setTimeout(() => {
                                window.location.href = data.redirectTo;
                              }, 1000);
                            }
                          }
                        } catch (error) {
                          toast.error(`포지션진입 실패: ${error}`);
                        }
                      }}
                    >
                      <span className="hidden sm:inline">포지션진입</span>
                      <span className="sm:hidden">진입</span>
                    </Button>
                  </TableCell>
                  <TableCell className="px-2 pl-3 font-medium text-xs text-center">
                    {it.symbol}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-center">
                    {it._rate !== null && it._rate !== undefined
                      ? it._rate
                      : "-"}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground text-center">
                    {it.korean_ex || "-"}
                  </TableCell>
                  <TableCell className="px-2 text-xs text-muted-foreground text-center">
                    {it.foreign_ex || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
