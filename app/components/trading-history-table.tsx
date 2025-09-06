import React from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { ChevronLeft, ChevronRight, BarChart3, Loader } from "lucide-react";

interface TradingHistoryTableProps {
  tradingHistory: Array<{
    id: number;
    coinSymbol: string;
    status: string | null;
    krExchange: string;
    frExchange: string;
    leverage: number;
    krPrice: string;
    krVolume: string;
    krFee: string;
    krFunds: string;
    frPrice: string;
    frVolume: string;
    frFee: string;
    frFunds: string;
    entryRate: string | null;
    exitRate: string | null;
    usdtPrice: string | null;
    profitRate: string | null;
    profit: string | null;
    entryTime: Date | null;
    exitTime: Date | null;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  isLoading?: boolean;
}

const formatDate = (date: Date | null) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string | null) => {
  if (!status) return <Badge variant="outline">알 수 없음</Badge>;

  switch (status) {
    case "OPEN":
      return (
        <Badge variant="default" className="text-white">
          진행중
        </Badge>
      );
    case "CLOSED":
      return <Badge variant="secondary">완료</Badge>;
    case "CANCELLED":
      return <Badge variant="destructive">취소</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const TradingHistoryTable = React.memo(function TradingHistoryTable({
  tradingHistory,
  pagination,
  isLoading = false,
}: TradingHistoryTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            거래 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Loader className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <div className="text-lg">거래 내역을 불러오는 중...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentPage, totalPages } = pagination;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          거래 내역
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tradingHistory.length === 0 ? (
          <div className="text-center py-8 lg:py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">거래 내역이 없습니다</p>
            <p className="text-sm">
              자동매매를 시작하면 여기에 거래 내역이 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>상태</TableHead>
                    <TableHead>코인</TableHead>
                    <TableHead>한국거래소</TableHead>
                    <TableHead>해외거래소</TableHead>
                    <TableHead className="text-right">레버리지</TableHead>
                    <TableHead className="text-right">
                      한국거래소 진입가
                    </TableHead>
                    <TableHead className="text-right">
                      한국거래소 주문량
                    </TableHead>
                    <TableHead className="text-right">
                      한국거래소 수수료
                    </TableHead>
                    <TableHead className="text-right">
                      한국거래소 주문금액
                    </TableHead>
                    <TableHead className="text-right">
                      해외거래소 진입가
                    </TableHead>
                    <TableHead className="text-right">
                      해외거래소 주문량
                    </TableHead>
                    <TableHead className="text-right">
                      해외거래소 수수료
                    </TableHead>
                    <TableHead className="text-right">
                      해외거래소 주문금액
                    </TableHead>
                    <TableHead className="text-right">환율</TableHead>
                    <TableHead className="text-right">USDT 가격</TableHead>
                    <TableHead className="text-right">수익률</TableHead>
                    <TableHead className="text-right">수익</TableHead>
                    <TableHead>진입시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradingHistory.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      <TableCell className="font-medium">
                        {trade.coinSymbol}
                      </TableCell>
                      <TableCell>{trade.krExchange}</TableCell>
                      <TableCell>{trade.frExchange}</TableCell>
                      <TableCell className="text-right">
                        {trade.leverage ? `${trade.leverage}x` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(trade.krPrice).toLocaleString()}원
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(trade.krVolume).toLocaleString()}{" "}
                        {trade.coinSymbol}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.krFee
                          ? `${parseFloat(trade.krFee).toLocaleString()}원`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.krFunds
                          ? `${parseFloat(trade.krFunds).toLocaleString()}원`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(trade.frPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {parseFloat(trade.frVolume).toLocaleString()}{" "}
                        {trade.coinSymbol}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.frFee
                          ? `$${parseFloat(trade.frFee).toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.frFunds
                          ? `$${parseFloat(trade.frFunds).toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.status === "OPEN"
                          ? trade.entryRate
                            ? `${parseFloat(trade.entryRate).toLocaleString()}원`
                            : "-"
                          : trade.exitRate
                            ? `${parseFloat(trade.exitRate).toLocaleString()}원`
                            : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.usdtPrice
                          ? `${parseFloat(trade.usdtPrice).toLocaleString()}원`
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          trade.profitRate
                            ? parseFloat(trade.profitRate) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {trade.profitRate
                          ? `${parseFloat(trade.profitRate).toFixed(2)}%`
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          trade.profit
                            ? parseFloat(trade.profit) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {trade.profit
                          ? `${parseFloat(trade.profit).toLocaleString()}원`
                          : "-"}
                      </TableCell>
                      <TableCell>{formatDate(trade.entryTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  총 {pagination.totalCount}개 중{" "}
                  {(pagination.currentPage - 1) * pagination.limit + 1}-
                  {Math.min(
                    pagination.currentPage * pagination.limit,
                    pagination.totalCount
                  )}
                  개 표시
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`?page=${pagination.currentPage - 1}`}
                    preventScrollReset={true}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 ${
                      pagination.currentPage <= 1
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Link>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1
                    )
                      .filter((page) => {
                        // 현재 페이지 주변의 페이지들만 표시
                        const current = pagination.currentPage;
                        return (
                          page === 1 ||
                          page === pagination.totalPages ||
                          (page >= current - 1 && page <= current + 1)
                        );
                      })
                      .map((page, index, array) => {
                        const prevPage = array[index - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-2 text-muted-foreground">
                                ...
                              </span>
                            )}
                            <Link
                              to={`?page=${page}`}
                              preventScrollReset={true}
                              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 ${
                                pagination.currentPage === page
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90 text-white"
                                  : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              {page}
                            </Link>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Link
                    to={`?page=${pagination.currentPage + 1}`}
                    preventScrollReset={true}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 ${
                      pagination.currentPage >= pagination.totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }`}
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});
