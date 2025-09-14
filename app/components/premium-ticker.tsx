import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Crown, Lock } from "lucide-react";
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
  title = "호가창 반영 실시간 환율",
  isLocked = true,
}: {
  endpoint?: string;
  title?: string;
  isLocked?: boolean;
}) {
  const [items, setItems] = useState<TickPayload[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedSeed, setSelectedSeed] = useState<number>(1000000);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // isLocked가 true이면 EventSource에 연결하지 않음
    if (isLocked) {
      return;
    }

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
  }, [endpoint, isLocked]);

  // seed 범위: 1000000 ~ 100000000, 1000000 단위 고정
  const seedMin = 1000000;
  const seedMax = 100000000;
  const seedStep = 1000000;

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

  const tableRows = useMemo(() => {
    if (!selectedSeed) return null;
    return sortedItems.map((it) => (
      <TableRow key={it.symbol + "|" + it.korean_ex + "|" + it.foreign_ex}>
        <TableCell className="px-2 font-medium min-w-[60px] max-w-[80px] w-[70px]">
          {it.symbol}
        </TableCell>
        <TableCell className="px-2 min-w-[80px] max-w-[100px] w-[90px] text-right">
          {it._rate !== null && it._rate !== undefined ? it._rate : "-"}
        </TableCell>
        <TableCell className="px-2 text-xs text-muted-foreground min-w-[100px] max-w-[120px] w-[110px]">
          {it.korean_ex || "-"}
        </TableCell>
        <TableCell className="px-2 text-xs text-muted-foreground min-w-[100px] max-w-[120px] w-[110px]">
          {it.foreign_ex || "-"}
        </TableCell>
      </TableRow>
    ));
  }, [sortedItems]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              호가창 반영 실시간 환율
              {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              {!isLocked && <Crown className="w-4 h-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription>시드금액 기반 실제 예상 거래 환율</CardDescription>
          </div>
          {isLocked && (
            <Badge variant="outline" className="gap-1">
              <Crown className="w-3 h-3" />
              Starter 이상 필요
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLocked ? (
          <div className="relative">
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center space-y-2 p-4 lg:p-6 bg-background/80 rounded-lg border mx-4">
                <Lock className="w-6 h-6 lg:w-8 lg:h-8 mx-auto text-muted-foreground" />
                <h3 className="font-medium text-sm lg:text-base">
                  Starter 플랜이 필요합니다
                </h3>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  호가창 기반 실시간 환율을 확인하려면 플랜을 업그레이드하세요
                </p>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 text-white">
                  플랜 업그레이드
                </button>
              </div>
            </div>
            {/* Blurred content for locked state */}
            <div className="blur-sm pointer-events-none">
              {/* Seed Amount Slider */}
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium">시드 금액</label>
                <span className="text-sm text-muted-foreground">1000만원</span>
              </div>
              <div className="w-full mb-4">
                <Slider
                  value={[10000000]}
                  max={100000000}
                  min={1000000}
                  step={1000000}
                  className="w-full"
                  disabled={true}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>100만원</span>
                  <span>1억원</span>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <Table className="text-xs min-w-[420px] w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 text-xs">티커</TableHead>
                      <TableHead className="px-2 text-xs text-right">
                        환율
                      </TableHead>
                      <TableHead className="px-2 text-xs">한국거래소</TableHead>
                      <TableHead className="px-2 text-xs">해외거래소</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Mock data for locked state */}
                    <TableRow>
                      <TableCell className="px-2 font-medium">BTC</TableCell>
                      <TableCell className="px-2 text-right">1380.42</TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        bithumb
                      </TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        binance
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-2 font-medium">ETH</TableCell>
                      <TableCell className="px-2 text-right">1381.26</TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        bithumb
                      </TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        binance
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-2 font-medium">XRP</TableCell>
                      <TableCell className="px-2 text-right">1382.99</TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        bithumb
                      </TableCell>
                      <TableCell className="px-2 text-muted-foreground">
                        binance
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                disabled={isLocked}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>100만원</span>
                <span>1억원</span>
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto overflow-x-auto scrollbar-thin">
              <Table className="text-xs min-w-[420px] w-full">
                <colgroup>
                  <col
                    style={{
                      width: "48px",
                      minWidth: "40px",
                      maxWidth: "80px",
                    }}
                  />
                  <col
                    style={{
                      width: "70px",
                      minWidth: "50px",
                      maxWidth: "100px",
                    }}
                  />
                  <col
                    style={{
                      width: "80px",
                      minWidth: "60px",
                      maxWidth: "120px",
                    }}
                  />
                  <col
                    style={{
                      width: "80px",
                      minWidth: "60px",
                      maxWidth: "120px",
                    }}
                  />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 min-w-[40px] max-w-[80px] w-[48px] text-xs sm:min-w-[60px] sm:w-[70px]">
                      티커
                    </TableHead>
                    <TableHead
                      className="px-2 min-w-[50px] max-w-[100px] w-[70px] text-xs sm:min-w-[80px] sm:w-[90px] cursor-pointer select-none text-right"
                      onClick={() =>
                        setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        환율
                        {sortOrder === "asc" ? (
                          <ChevronUp className="w-3 h-3 inline" />
                        ) : (
                          <ChevronDown className="w-3 h-3 inline" />
                        )}
                      </span>
                    </TableHead>
                    <TableHead className="px-2 min-w-[60px] max-w-[120px] w-[80px] text-xs sm:min-w-[100px] sm:w-[110px]">
                      한국거래소
                    </TableHead>
                    <TableHead className="px-2 min-w-[60px] max-w-[120px] w-[80px] text-xs sm:min-w-[100px] sm:w-[110px]">
                      해외거래소
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((it) => (
                    <TableRow
                      key={it.symbol + "|" + it.korean_ex + "|" + it.foreign_ex}
                    >
                      <TableCell className="px-2 font-medium min-w-[40px] max-w-[80px] w-[48px] text-xs sm:min-w-[60px] sm:w-[70px]">
                        {it.symbol}
                      </TableCell>
                      <TableCell className="px-2 min-w-[50px] max-w-[100px] w-[70px] text-xs sm:min-w-[80px] sm:w-[90px] text-right">
                        {it._rate !== null && it._rate !== undefined
                          ? it._rate
                          : "-"}
                      </TableCell>
                      <TableCell className="px-2 text-xs text-muted-foreground min-w-[60px] max-w-[120px] w-[80px] sm:min-w-[100px] sm:w-[110px]">
                        {it.korean_ex || "-"}
                      </TableCell>
                      <TableCell className="px-2 text-xs text-muted-foreground min-w-[60px] max-w-[120px] w-[80px] sm:min-w-[100px] sm:w-[110px]">
                        {it.foreign_ex || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
