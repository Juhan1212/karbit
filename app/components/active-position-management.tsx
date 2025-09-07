import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import {
  X,
  Loader2,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface ActivePosition {
  coinSymbol: string;
  krExchange: string;
  frExchange: string;
}

interface ActivePositionManagementProps {
  positions: ActivePosition[];
  isLoading?: boolean;
  onPositionClose?: (coinSymbol: string) => void;
}

export const ActivePositionManagement = React.memo(
  function ActivePositionManagement({
    positions,
    isLoading = false,
    onPositionClose,
  }: ActivePositionManagementProps) {
    const [closingPositions, setClosingPositions] = useState<Set<string>>(
      new Set()
    );
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClosePosition = async (
      coinSymbol: string,
      krExchange: string,
      frExchange: string
    ) => {
      if (closingPositions.has(coinSymbol)) return;

      setClosingPositions((prev) => new Set(prev).add(coinSymbol));

      try {
        const response = await fetch("/api/close-position", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ coinSymbol, krExchange, frExchange }),
        });

        if (response.ok) {
          toast.success(`${coinSymbol} 포지션이 성공적으로 종료되었습니다.`);
          onPositionClose?.(coinSymbol);
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || "포지션 종료에 실패했습니다.");
        }
      } catch (error) {
        console.error("포지션 종료 오류:", error);
        toast.error("포지션 종료 중 오류가 발생했습니다.");
      } finally {
        setClosingPositions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(coinSymbol);
          return newSet;
        });
      }
    };

    const getExchangeNames = (krExchange: string, frExchange: string) => {
      const krName =
        krExchange === "upbit"
          ? "업비트"
          : krExchange === "bithumb"
            ? "빗썸"
            : krExchange;
      const frName =
        frExchange === "binance"
          ? "바이낸스"
          : frExchange === "bybit"
            ? "바이비트"
            : frExchange === "okx"
              ? "OKX"
              : frExchange;

      return { krName, frName };
    };

    if (isLoading) {
      return (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                활성 포지션 관리
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  포지션 데이터 로딩 중...
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (positions.length === 0) {
      return (
        <div className="w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                활성 포지션 관리
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  종료할 포지션이 없습니다
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="w-full">
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              활성 포지션 관리 ({positions.length}개)
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {positions.length}개 활성
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          {isExpanded && (
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">코인</TableHead>
                        <TableHead>거래소</TableHead>
                        <TableHead className="text-right w-[120px]">
                          액션
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((position) => {
                        const { krName, frName } = getExchangeNames(
                          position.krExchange,
                          position.frExchange
                        );
                        const isClosing = closingPositions.has(
                          position.coinSymbol
                        );

                        return (
                          <TableRow key={position.coinSymbol}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm">
                                  {position.coinSymbol}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col space-y-1">
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {krName}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {frName}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleClosePosition(
                                    position.coinSymbol,
                                    position.krExchange,
                                    position.frExchange
                                  )
                                }
                                disabled={isClosing}
                                className="h-8 px-3"
                              >
                                {isClosing ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    종료 중
                                  </>
                                ) : (
                                  <>
                                    <X className="mr-1 h-3 w-3" />
                                    종료
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {positions.length > 3 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {positions.length}개의 활성 포지션이 표시되었습니다
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }
);
