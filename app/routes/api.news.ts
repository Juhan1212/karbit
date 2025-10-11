import type { LoaderFunctionArgs } from "react-router";
import { getNewsList, getNewsStats, getRecentNews } from "../database/news";
import { sql } from "drizzle-orm";
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

        // 전체 개수도 함께 반환
        const [newsList, totalCountArr] = await Promise.all([
          getNewsList({
            exchange,
            type,
            coinSymbol,
            startDate,
            endDate,
            limit,
            offset,
          }),
          // 전체 개수 쿼리
          (async () => {
            const db = (await import("../database/context")).database();
            const { exchangeNews } = await import("../database/schema");
            const { and, eq, gte, lte } = await import("drizzle-orm");
            const conditions = [];
            if (exchange && exchange !== "all")
              conditions.push(eq(exchangeNews.exchange, exchange));
            if (type && type !== "all")
              conditions.push(eq(exchangeNews.type, type));
            if (coinSymbol)
              conditions.push(eq(exchangeNews.coinSymbol, coinSymbol));
            if (startDate)
              conditions.push(gte(exchangeNews.publishedAt, startDate));
            if (endDate)
              conditions.push(lte(exchangeNews.publishedAt, endDate));
            const whereClause =
              conditions.length > 0 ? and(...conditions) : undefined;
            const result = await db
              .select({ count: sql`count(*)` })
              .from(exchangeNews)
              .where(whereClause);
            return result;
          })(),
        ]);

        const totalCount = totalCountArr?.[0]?.count
          ? Number(totalCountArr[0].count)
          : 0;

        return new Response(
          JSON.stringify({
            success: true,
            data: newsList,
            pagination: {
              limit,
              offset,
              hasMore: newsList.length === limit,
            },
            totalCount,
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
