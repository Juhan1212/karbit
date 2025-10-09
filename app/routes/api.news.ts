import type { LoaderFunctionArgs } from "react-router";
import { getNewsList, getNewsStats, getRecentNews } from "../database/news";
import { getCache } from "../core/redisCache";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "list";

  try {
    switch (action) {
      case "list": {
        const exchange = url.searchParams.get("exchange") || "all";
        const type = url.searchParams.get("type") || "all";
        const coinSymbol = url.searchParams.get("coinSymbol") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");

        // 날짜 필터
        const startDateStr = url.searchParams.get("startDate");
        const endDateStr = url.searchParams.get("endDate");
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;

        const newsList = await getNewsList({
          exchange,
          type,
          coinSymbol,
          startDate,
          endDate,
          limit,
          offset,
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: newsList,
            pagination: {
              limit,
              offset,
              hasMore: newsList.length === limit,
            },
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "stats": {
        const exchange = url.searchParams.get("exchange") || "all";
        const startDateStr = url.searchParams.get("startDate");
        const endDateStr = url.searchParams.get("endDate");
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;

        const stats = await getNewsStats({
          exchange,
          startDate,
          endDate,
        });

        return new Response(
          JSON.stringify({
            success: true,
            data: stats,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      case "recent": {
        const limit = parseInt(url.searchParams.get("limit") || "10");

        // 캐시에서 먼저 확인
        const cached = await getCache("exchange-news:recent");
        if (cached && cached.data && cached.timestamp > Date.now() - 300000) {
          // 5분 캐시
          return new Response(
            JSON.stringify({
              success: true,
              data: cached.data.slice(0, limit),
              cached: true,
              timestamp: cached.timestamp,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // 캐시가 없으면 DB에서 조회
        const recentNews = await getRecentNews(limit);

        return new Response(
          JSON.stringify({
            success: true,
            data: recentNews,
            cached: false,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid action parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("[News API] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
