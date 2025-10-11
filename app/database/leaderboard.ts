import { database } from "./context";
import { users, positions, strategies } from "./schema";
import { sql, desc, eq, gte, and } from "drizzle-orm";

/**
 * 리더보드 통계 개요 데이터 조회
 */
export async function getLeaderboardStats() {
  try {
    const db = database();
    const result = await db
      .select({
        totalTraders: sql<number>`count(*)`,
        avgProfitRate: sql<number>`avg(${users.totalProfitRate})`,
        totalVolume: sql<string>`sum(${users.totalOrderAmount})`,
        totalEntries: sql<number>`sum(${users.totalEntryCount})`,
      })
      .from(users);

    const stats = result[0];

    return {
      totalTraders: Number(stats.totalTraders) || 0,
      avgProfitRate: Number(stats.avgProfitRate) || 0,
      totalVolume: stats.totalVolume || "0",
      totalEntries: Number(stats.totalEntries) || 0,
    };
  } catch (error) {
    console.error("[getLeaderboardStats] Error:", error);
    return {
      totalTraders: 0,
      avgProfitRate: 0,
      totalVolume: "0",
      totalEntries: 0,
    };
  }
}

/**
 * 기간별 상위 5명 트레이더의 일별 평균 수익률 추이 데이터 조회
 */
export async function getTopTradersPerformanceTrend(
  period: "7d" | "30d" | "all"
) {
  try {
    const db = database();

    // 기간 계산
    const now = new Date();
    let startDate: Date;

    if (period === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // 'all': 1년 전부터 (또는 데이터가 있는 시작점)
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // 상위 5명의 트레이더 조회 (전체 수익률 기준)
    const topTraders = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        totalProfitRate: users.totalProfitRate,
      })
      .from(users)
      .orderBy(desc(users.totalProfitRate))
      .limit(5);

    if (topTraders.length === 0) {
      return [];
    }

    // 각 트레이더의 일별 평균 수익률 계산
    const trendData: { [date: string]: any } = {};

    for (let i = 0; i < topTraders.length; i++) {
      const trader = topTraders[i];

      // 해당 트레이더의 기간 내 종료된 포지션 조회
      const traderPositions = await db
        .select({
          exitTime: positions.exitTime,
          profitRate: positions.profitRate,
        })
        .from(positions)
        .where(
          and(
            eq(positions.userId, trader.id),
            eq(positions.status, "CLOSED"),
            gte(positions.exitTime, startDate)
          )
        )
        .orderBy(positions.exitTime);

      // 일별로 평균 수익률 계산
      const dailyPositions: { [date: string]: number[] } = {};

      traderPositions.forEach((position) => {
        if (position.exitTime && position.profitRate) {
          const dateKey = new Date(position.exitTime)
            .toLocaleDateString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
            })
            .replace(". ", "/")
            .replace(".", "");

          if (!dailyPositions[dateKey]) {
            dailyPositions[dateKey] = [];
          }

          dailyPositions[dateKey].push(Number(position.profitRate));
        }
      });

      // 각 날짜의 평균 수익률 계산
      Object.keys(dailyPositions).forEach((dateKey) => {
        const profitRates = dailyPositions[dateKey];
        const avgProfitRate =
          profitRates.reduce((sum, rate) => sum + rate, 0) / profitRates.length;

        if (!trendData[dateKey]) {
          trendData[dateKey] = { date: dateKey };
        }

        trendData[dateKey][`trader${i + 1}`] = Number(avgProfitRate.toFixed(2));
      });
    }

    // 날짜순 정렬하여 배열로 반환
    const sortedData = Object.values(trendData).sort((a: any, b: any) => {
      const [aMonth, aDay] = a.date.split("/").map(Number);
      const [bMonth, bDay] = b.date.split("/").map(Number);
      return aMonth === bMonth ? aDay - bDay : aMonth - bMonth;
    });

    return sortedData;
  } catch (error) {
    console.error("[getTopTradersPerformanceTrend] Error:", error);
    return [];
  }
}

/**
 * 상위 트레이더 순위 조회 (TOP 10)
 */
export async function getTopTraders() {
  try {
    const db = database();

    // 모든 유저와 그들의 포지션 통계 조회
    const tradersData = await db
      .select({
        userId: users.id,
        userName: users.name,
        email: users.email,
        totalProfitRate: users.totalProfitRate,
        totalEntryCount: users.totalEntryCount,
        totalOrderAmount: users.totalOrderAmount,
      })
      .from(users)
      .orderBy(desc(users.totalProfitRate))
      .limit(10);

    // 각 트레이더의 상세 통계 계산
    const traders = await Promise.all(
      tradersData.map(async (trader, index) => {
        // 해당 유저의 종료된 포지션 통계
        const positionsStats = await db
          .select({
            totalPositions: sql<number>`count(*)`,
            profitablePositions: sql<number>`count(*) filter (where ${positions.profitRate} > 0)`,
            totalProfit: sql<string>`sum(${positions.profit})`,
          })
          .from(positions)
          .where(
            and(
              eq(positions.userId, trader.userId),
              eq(positions.status, "CLOSED")
            )
          );

        const stats = positionsStats[0];
        const totalPositions = Number(stats.totalPositions) || 0;
        const profitablePositions = Number(stats.profitablePositions) || 0;
        const winRate =
          totalPositions > 0
            ? Number(((profitablePositions / totalPositions) * 100).toFixed(1))
            : 0;
        const totalProfit = Number(stats.totalProfit) || 0;

        // 활성 전략 조회 (strategies 테이블에서)
        const activeStrategyResult = await db
          .select({
            name: strategies.name,
          })
          .from(strategies)
          .where(
            and(
              eq(strategies.userId, trader.userId),
              eq(strategies.isActive, true)
            )
          )
          .limit(1);

        const strategyName = activeStrategyResult[0]?.name || "전략 없음";

        // 티어 계산 (수익률과 거래 횟수 기반)
        let tier: "diamond" | "platinum" | "gold" | "silver" | "bronze";
        const profitRate = Number(trader.totalProfitRate) || 0;
        const entryCount = Number(trader.totalEntryCount) || 0;

        if (profitRate >= 10 && entryCount >= 100) {
          tier = "diamond";
        } else if (profitRate >= 7 && entryCount >= 50) {
          tier = "platinum";
        } else if (profitRate >= 5 && entryCount >= 20) {
          tier = "gold";
        } else if (profitRate >= 3 && entryCount >= 10) {
          tier = "silver";
        } else {
          tier = "bronze";
        }

        // 일평균 수익 계산 (첫 포지션부터 현재까지)
        const firstPositionResult = await db
          .select({
            entryTime: positions.entryTime,
          })
          .from(positions)
          .where(eq(positions.userId, trader.userId))
          .orderBy(positions.entryTime)
          .limit(1);

        let avgDailyProfit = 0;
        if (firstPositionResult[0]?.entryTime) {
          const tradingDays = Math.max(
            1,
            Math.floor(
              (Date.now() -
                new Date(firstPositionResult[0].entryTime).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          avgDailyProfit = totalProfit / tradingDays;
        }

        return {
          rank: index + 1,
          userId: trader.userId.toString(),
          nickname: trader.userName || trader.email.split("@")[0],
          profitRate: Number(trader.totalProfitRate) || 0,
          totalTrades: totalPositions,
          winRate,
          strategy: strategyName,
          tier,
          totalProfit,
          avgDailyProfit,
        };
      })
    );

    return traders;
  } catch (error) {
    console.error("[getTopTraders] Error:", error);
    return [];
  }
}
