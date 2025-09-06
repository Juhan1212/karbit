import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import {
  getUserTradingHistoryPaginated,
  getUserTradingHistoryCount,
  getUserTradingStats,
} from "~/database/position";
import { getAuthTokenFromRequest } from "~/utils/cookies";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // URL에서 페이지 파라미터 추출
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = 10; // 페이지당 항목 수

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

    return Response.json({
      tradingHistory,
      tradingStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trading data API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
