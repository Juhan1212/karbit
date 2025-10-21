import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import {
  getUserActivePositions,
  getUserTradingStats,
  getUserTradingHistoryPaginated,
  getUserDailyProfit,
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);

    const activePositions = await getUserActivePositions(user.id);
    const activePositionCount = activePositions.length;
    const tradingStats = await getUserTradingStats(user.id);
    const tradingHistory = await getUserTradingHistoryPaginated(
      user.id,
      page,
      limit
    );
    const dailyProfit = await getUserDailyProfit(user.id);

    return Response.json({
      activePositions,
      activePositionCount,
      tradingStats,
      tradingHistory,
      dailyProfit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Active positions API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
