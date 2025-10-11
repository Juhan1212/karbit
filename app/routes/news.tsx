import {
  Building2,
  Clock,
  Filter,
  Globe,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { Card, CardContent, CardHeader } from "../components/card";
import { useState, useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";

interface NewsItem {
  id: string;
  title: string;
  content?: string;
  exchange: string;
  type: "listing" | "delisting" | "announcement";
  coinSymbol: string;
  publishedAt: string;
  originalUrl: string;
  isNew?: boolean;
}

interface Pagination {
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface NewsApiResponse {
  news: NewsItem[];
  stats: {
    total: number;
    listing: number;
    delisting: number;
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    message: "news page loader",
  };
}

export default function NewsPage() {
  const [selectedExchange, setSelectedExchange] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState({ total: 0, listing: 0, delisting: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState<Pagination>({
    limit,
    offset: 0,
    hasMore: false,
  });
  const [totalCount, setTotalCount] = useState(0);

  const fetchNews = async (
    pageNum = page,
    exchange = selectedExchange,
    type = selectedType
  ) => {
    setLoading(true);
    try {
      const offset = (pageNum - 1) * limit;
      const params = new URLSearchParams({
        action: "list",
        limit: String(limit),
        offset: String(offset),
        exchange,
        type,
      });
      const response = await fetch(`/api/news?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNewsData(data.data);
        setPagination(data.pagination);
        setTotalCount(data.totalCount || 0);
        // setStats 등 필요시 추가
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(page, selectedExchange, selectedType);
    const interval = setInterval(
      () => fetchNews(page, selectedExchange, selectedType),
      60000
    );
    return () => clearInterval(interval);
  }, [page, selectedExchange, selectedType]);

  // news.type 뱃지/아이콘/텍스트 분기 함수
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "listing":
        return (
          <Badge variant="default" className="gap-1">
            <TrendingUp className="w-3 h-3" />
            신규상장
          </Badge>
        );
      case "delisting":
        return (
          <Badge variant="destructive" className="gap-1">
            <TrendingDown className="w-3 h-3" />
            상장폐지
          </Badge>
        );
      case "announcement":
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Globe className="w-3 h-3" />
            일반공지
          </Badge>
        );
    }
  };

  const exchanges = [
    "all",
    "Upbit",
    "Bithumb",
    "Binance",
    "Bybit",
    // "OKX",
    "Hyperliquid",
  ];

  // 서버에서 이미 필터링된 데이터만 받아오므로 바로 newsData 사용

  const getExchangeColor = (exchange: string) => {
    const colors = {
      Upbit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      Bithumb: "bg-red-500/10 text-red-400 border-red-500/20",
      Coinbase: "bg-green-500/10 text-green-400 border-green-500/20",
      Binance: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Bybit: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      OKX: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
    return (
      colors[exchange as keyof typeof colors] || "bg-gray-500/10 text-gray-400"
    );
  };

  const formatDateTime = (publishedAt: string) => {
    const newsDate = new Date(publishedAt);
    const now = new Date();
    const diffMs = now.getTime() - newsDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}일 전`;
    } else if (diffHours > 0) {
      return `${diffHours}시간 전`;
    } else {
      return "방금 전";
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">거래소 뉴스</h1>
          <p className="text-muted-foreground">
            주요 거래소의 코인 상장/상장폐지 소식을 실시간으로 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => fetchNews()}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4" />
            <span className="font-medium">필터</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">거래소</label>
              <div className="flex flex-wrap gap-2">
                {exchanges.map((exchange) => (
                  <Button
                    key={exchange}
                    variant={
                      selectedExchange === exchange ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setSelectedExchange(exchange);
                    }}
                    className="h-8"
                  >
                    {exchange === "all" ? "전체" : exchange}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">구분</label>
              <div className="flex gap-2">
                <Button
                  variant={selectedType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPage(1);
                    setSelectedType("all");
                  }}
                  className="h-8"
                >
                  전체
                </Button>
                <Button
                  variant={selectedType === "listing" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPage(1);
                    setSelectedType("listing");
                  }}
                  className="h-8 gap-1"
                >
                  <TrendingUp className="w-3 h-3" />
                  신규상장
                </Button>
                <Button
                  variant={selectedType === "delisting" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setPage(1);
                    setSelectedType("delisting");
                  }}
                  className="h-8 gap-1"
                >
                  <TrendingDown className="w-3 h-3" />
                  상장폐지
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {loading && newsData.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">뉴스를 불러오는 중...</p>
              </div>
            </CardContent>
          </Card>
        ) : newsData.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  선택한 조건에 맞는 뉴스가 없습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          newsData.map((news) => (
            <Card key={news.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={getExchangeColor(news.exchange)}
                    >
                      {news.exchange}
                    </Badge>
                    {getTypeBadge(news.type)}
                    {news.coinSymbol && (
                      <Badge variant="secondary" className="font-mono">
                        {news.coinSymbol}
                      </Badge>
                    )}
                    {news.isNew && (
                      <Badge variant="destructive" className="animate-pulse">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(news.publishedAt)}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">
                    {news.title}
                  </h3>
                  {news.content && (
                    <p className="text-muted-foreground leading-relaxed">
                      {news.content.length > 200
                        ? news.content.substring(0, 200) + "..."
                        : news.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    {news.exchange} 공식 발표
                  </div>
                  {news.originalUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2"
                    >
                      <a
                        href={news.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        원문 보기
                        <Globe className="w-3 h-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {/* 페이지네이션 UI */}
        <div className="flex justify-center gap-1 mt-6 flex-wrap">
          {/* 처음 */}
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(1)}
            className="min-w-[40px]"
          >
            ≪
          </Button>
          {/* 이전 */}
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="min-w-[40px]"
          >
            이전
          </Button>
          {/* 페이지 번호 버튼 */}
          {(() => {
            const pageCount =
              totalCount > 0
                ? Math.ceil(totalCount / limit)
                : page + (pagination.hasMore ? 1 : 0);
            const pageButtons = [];
            const start = Math.max(1, page - 2);
            const end = Math.min(pageCount, page + 2);
            for (let i = start; i <= end; i++) {
              pageButtons.push(
                <Button
                  key={i}
                  size="sm"
                  variant={i === page ? "default" : "outline"}
                  onClick={() => setPage(i)}
                  className="min-w-[40px]"
                  disabled={i === page}
                >
                  {i}
                </Button>
              );
            }
            return pageButtons;
          })()}
          {/* 다음 */}
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination.hasMore}
            onClick={() => setPage(page + 1)}
            className="min-w-[40px]"
          >
            다음
          </Button>
          {/* 마지막 */}
          <Button
            size="sm"
            variant="outline"
            disabled={(() => {
              const pageCount =
                totalCount > 0
                  ? Math.ceil(totalCount / limit)
                  : page + (pagination.hasMore ? 1 : 0);
              return page === pageCount;
            })()}
            onClick={() => {
              const pageCount =
                totalCount > 0
                  ? Math.ceil(totalCount / limit)
                  : page + (pagination.hasMore ? 1 : 0);
              setPage(pageCount);
            }}
            className="min-w-[40px]"
          >
            ≫
          </Button>
        </div>
      </div>
    </div>
  );
}
