import { eq, and, desc, count, sql } from "drizzle-orm";
import { database } from "./context";
import { positions } from "./schema";

/**
 * 사용자의 활성 포지션 수를 조회합니다
 * 코인별로 가장 최근 종료 이후의 OPEN 포지션만 활성으로 계산
 */
export async function getUserActivePositionCount(
  userId: number
): Promise<number> {
  const db = database();

  // 코인별로 가장 최근 종료 시간을 찾고, 그 이후의 OPEN 포지션 수를 계산
  const result = await db.execute(sql`
    WITH latest_closed AS (
      SELECT 
        coin_symbol,
        MAX(entry_time) as latest_exit_time
      FROM positions 
      WHERE user_id = ${userId} AND status = 'CLOSED'
      GROUP BY coin_symbol
    ),
    active_positions AS (
      SELECT 
        p.coin_symbol,
        COUNT(*) as active_count
      FROM positions p
      LEFT JOIN latest_closed lc ON p.coin_symbol = lc.coin_symbol
      WHERE p.user_id = ${userId} 
        AND p.status = 'OPEN'
        AND (
          lc.latest_exit_time IS NULL 
          OR p.entry_time > lc.latest_exit_time
        )
      GROUP BY p.coin_symbol
    )
    SELECT COALESCE(SUM(active_count), 0) as total_active
    FROM active_positions
  `);

  return Number(result[0]?.total_active || 0);
}

/**
 * 사용자의 활성 포지션 목록을 조회합니다
 * 코인별로 가장 최근 종료 이후의 OPEN 포지션만 반환
 */
export async function getUserActivePositions(userId: number) {
  const db = database();

  const result = await db.execute(sql`
    WITH latest_closed AS (
      SELECT 
        coin_symbol,
        MAX(entry_time) as latest_exit_time
      FROM positions 
      WHERE user_id = ${userId} AND status = 'CLOSED'
      GROUP BY coin_symbol
    )
    SELECT p.coin_symbol, 
           p.kr_exchange, 
           p.fr_exchange
    FROM positions p
    LEFT JOIN latest_closed lc ON p.coin_symbol = lc.coin_symbol
    WHERE p.user_id = ${userId} 
      AND p.status = 'OPEN'
      AND (
        lc.latest_exit_time IS NULL 
        OR p.entry_time > lc.latest_exit_time
      )
    GROUP BY p.coin_symbol, p.kr_exchange, p.fr_exchange
  `);

  return result;
}

/**
 * 사용자에게 활성 포지션이 있는지 확인합니다
 */
export async function hasActivePositions(userId: number): Promise<boolean> {
  const count = await getUserActivePositionCount(userId);
  return count > 0;
}

/**
 * 사용자의 거래 내역을 조회합니다 (최신순)
 */
export async function getUserTradingHistory(
  userId: number,
  limit: number = 50
) {
  const db = database();

  return await db
    .select({
      id: positions.id,
      coinSymbol: positions.coinSymbol,
      status: positions.status,
      krExchange: positions.krExchange,
      frExchange: positions.frExchange,
      leverage: positions.leverage,
      krPrice: positions.krPrice,
      krVolume: positions.krVolume,
      krFee: positions.krFee,
      krFunds: positions.krFunds,
      frPrice: positions.frPrice,
      frVolume: positions.frVolume,
      frFee: positions.frFee,
      frFunds: positions.frFunds,
      usdtPrice: positions.usdtPrice,
      entryRate: positions.entryRate,
      exitRate: positions.exitRate,
      profit: positions.profit,
      profitRate: positions.profitRate,
      entryTime: positions.entryTime,
      exitTime: positions.exitTime,
    })
    .from(positions)
    .where(eq(positions.userId, userId))
    .orderBy(desc(positions.entryTime))
    .limit(limit);
}

/**
 * 사용자의 거래 내역을 페이지네이션으로 조회합니다
 */
export async function getUserTradingHistoryPaginated(
  userId: number,
  page: number = 1,
  limit: number = 10
) {
  const db = database();
  const offset = (page - 1) * limit;

  const data = await db
    .select({
      id: positions.id,
      coinSymbol: positions.coinSymbol,
      status: positions.status,
      krExchange: positions.krExchange,
      frExchange: positions.frExchange,
      leverage: positions.leverage,
      krPrice: positions.krPrice,
      krVolume: positions.krVolume,
      krFee: positions.krFee,
      krFunds: positions.krFunds,
      frPrice: positions.frPrice,
      frVolume: positions.frVolume,
      frFee: positions.frFee,
      frFunds: positions.frFunds,
      usdtPrice: positions.usdtPrice,
      entryRate: positions.entryRate,
      exitRate: positions.exitRate,
      profit: positions.profit,
      profitRate: positions.profitRate,
      entryTime: positions.entryTime,
      exitTime: positions.exitTime,
    })
    .from(positions)
    .where(eq(positions.userId, userId))
    .orderBy(desc(positions.entryTime))
    .limit(limit)
    .offset(offset);

  return data;
}

/**
 * 사용자의 총 거래 내역 수를 조회합니다
 */
export async function getUserTradingHistoryCount(userId: number) {
  const db = database();

  const result = await db
    .select({ count: count() })
    .from(positions)
    .where(eq(positions.userId, userId));

  return result[0]?.count || 0;
}

/**
 * 사용자의 거래 통계를 조회합니다
 */
export async function getUserTradingStats(userId: number) {
  const db = database();

  const stats = await db
    .select({
      id: positions.id,
      status: positions.status,
      profit: positions.profit,
    })
    .from(positions)
    .where(eq(positions.userId, userId));

  const totalTrades = stats.length;
  const openTrades = stats.filter((s) => s.status === "OPEN").length;
  const closedTrades = stats.filter((s) => s.status === "CLOSED").length;
  const totalProfit = stats.reduce(
    (sum, s) => sum + parseFloat(s.profit || "0"),
    0
  );

  return {
    totalTrades,
    openTrades,
    closedTrades,
    totalProfit,
  };
}

/**
 * 특정 코인 심볼의 활성 포지션을 강제 종료합니다
 */
export async function closePositionByCoinSymbol(
  userId: number,
  coinSymbol: string
): Promise<void> {
  const db = database();

  // 해당 코인의 활성 포지션을 찾아서 CLOSED 상태로 변경
  const result = await db.execute(sql`
    WITH latest_closed AS (
      SELECT 
        coin_symbol,
        MAX(exit_time) as latest_exit_time
      FROM positions 
      WHERE user_id = ${userId} AND status = 'CLOSED'
      GROUP BY coin_symbol
    )
    UPDATE positions 
    SET 
      status = 'CLOSED',
      exit_time = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId} 
      AND coin_symbol = ${coinSymbol}
      AND status = 'OPEN'
      AND (
        (SELECT latest_exit_time FROM latest_closed WHERE coin_symbol = ${coinSymbol}) IS NULL 
        OR entry_time > (SELECT latest_exit_time FROM latest_closed WHERE coin_symbol = ${coinSymbol})
      )
  `);

  console.log(`포지션 종료 완료: ${coinSymbol}, 사용자: ${userId}`);
}
