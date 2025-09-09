import { eq, and, desc, count, sql } from "drizzle-orm";
import { database } from "./context";
import { positions } from "./schema";
import {
  preciseAdd,
  preciseMultiply,
  preciseWeightedAverage,
  safeNumeric,
  CRYPTO_DECIMALS,
} from "~/utils/decimal";

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
           p.fr_exchange,
           sum(p.kr_volume) as total_kr_volume,
           sum(p.fr_volume) as total_fr_volume,
           sum(p.kr_funds) as total_kr_funds,
           sum(p.fr_funds) as total_fr_funds,
           COUNT(*) as position_count,
           MAX(p.entry_time) as latest_entry_time
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
 * 특정 코인의 활성 포지션 상세 정보를 조회합니다
 */
/**
 * 특정 코인의 활성 포지션 상세 정보를 조회합니다
 */
export async function getCoinActivePositionDetails(
  userId: number,
  coinSymbol: string
) {
  const db = database();

  const result = await db.execute(sql`
    WITH latest_closed AS (
      SELECT 
        coin_symbol,
        MAX(entry_time) as latest_exit_time
      FROM positions 
      WHERE user_id = ${userId} AND status = 'CLOSED' AND coin_symbol = ${coinSymbol}
      GROUP BY coin_symbol
    )
    SELECT p.id,
           p.strategy_id,
           p.coin_symbol, 
           p.kr_exchange, 
           p.fr_exchange,
           p.kr_price,
           p.kr_volume,
           p.kr_funds,
           p.kr_fee,
           p.fr_price,
           p.fr_volume,
           p.fr_funds,
           p.fr_fee,
           p.leverage,
           p.entry_rate,
           p.entry_time,
           p.kr_order_id,
           p.fr_order_id
    FROM positions p
    LEFT JOIN latest_closed lc ON p.coin_symbol = lc.coin_symbol
    WHERE p.user_id = ${userId} 
      AND p.coin_symbol = ${coinSymbol}
      AND p.status = 'OPEN'
      AND (
        lc.latest_exit_time IS NULL 
        OR p.entry_time > lc.latest_exit_time
      )
    ORDER BY p.entry_time DESC
  `);

  // 결과를 타입 안전하게 변환
  return result.map((row: any) => ({
    id: row.id,
    strategyId: row.strategy_id,
    coinSymbol: row.coin_symbol,
    krExchange: row.kr_exchange,
    frExchange: row.fr_exchange,
    krPrice: row.kr_price,
    krVolume: row.kr_volume,
    krFunds: row.kr_funds,
    krFee: row.kr_fee,
    frPrice: row.fr_price,
    frVolume: row.fr_volume,
    frFunds: row.fr_funds,
    frFee: row.fr_fee,
    leverage: row.leverage,
    entryRate: row.entry_rate,
    entryTime: row.entry_time,
    krOrderId: row.kr_order_id,
    frOrderId: row.fr_order_id,
  }));
}

/**
 * 정산용 포지션 집계 데이터를 조회합니다 (파이썬 코드 기반)
 * 마지막 CLOSED 포지션 이후의 모든 OPEN 포지션을 집계하여
 * 평균 진입 환율과 총 투자 금액을 계산합니다
 */
export async function getUserPositionsForSettlement(
  userId: number,
  coinSymbol: string
): Promise<{
  avgEntryRate: number;
  totalKrVolume: number;
  totalKrFunds: number;
  totalFrFunds: number;
  totalKrFee: number;
  totalFrFee: number;
  positionsCount: number;
} | null> {
  const db = database();

  try {
    // 마지막 CLOSED 포지션의 entry_time 찾기
    const closedResult = await db.execute(sql`
      SELECT entry_time 
      FROM positions
      WHERE user_id = ${userId} 
        AND coin_symbol = ${coinSymbol} 
        AND status = 'CLOSED'
      ORDER BY entry_time DESC 
      LIMIT 1
    `);

    let openPositions;

    if (closedResult.length > 0) {
      const closedEntryTime = closedResult[0].entry_time;
      // 해당 entry_time 이후의 OPEN 포지션 조회
      openPositions = await db.execute(sql`
        SELECT entry_rate, 
               kr_volume, 
               kr_funds, 
               fr_funds, 
               kr_fee, 
               fr_fee
        FROM positions
        WHERE user_id = ${userId} 
          AND coin_symbol = ${coinSymbol} 
          AND entry_time > ${closedEntryTime} 
          AND status = 'OPEN'
        ORDER BY entry_time ASC
      `);
    } else {
      // CLOSED 포지션이 없으면 모든 OPEN 포지션 조회
      openPositions = await db.execute(sql`
        SELECT entry_rate, 
               kr_volume, 
               kr_funds, 
               fr_funds, 
               kr_fee, 
               fr_fee
        FROM positions
        WHERE user_id = ${userId} 
          AND coin_symbol = ${coinSymbol} 
          AND status = 'OPEN'
        ORDER BY entry_time ASC
      `);
    }

    if (openPositions.length === 0) {
      return null;
    }

    // 정밀한 계산을 위한 배열들
    const entryRates: number[] = [];
    const krVolumes: number[] = [];
    let totalKrFunds = 0;
    let totalFrFunds = 0;
    let totalKrFee = 0;
    let totalFrFee = 0;

    for (const position of openPositions) {
      const entryRate = safeNumeric(position.entry_rate as string | number, 0);
      const krVolume = safeNumeric(position.kr_volume as string | number, 0);
      const krFunds = safeNumeric(position.kr_funds as string | number, 0);
      const frFunds = safeNumeric(position.fr_funds as string | number, 0);
      const krFee = safeNumeric(position.kr_fee as string | number, 0);
      const frFee = safeNumeric(position.fr_fee as string | number, 0);

      entryRates.push(entryRate);
      krVolumes.push(krVolume);

      totalKrFunds = preciseAdd(totalKrFunds, krFunds, CRYPTO_DECIMALS.FUNDS);
      totalFrFunds = preciseAdd(totalFrFunds, frFunds, CRYPTO_DECIMALS.FUNDS);
      totalKrFee = preciseAdd(totalKrFee, krFee, CRYPTO_DECIMALS.FEE);
      totalFrFee = preciseAdd(totalFrFee, frFee, CRYPTO_DECIMALS.FEE);
    }

    // 가중평균으로 평균 진입률 계산
    const avgEntryRate = preciseWeightedAverage(
      entryRates,
      krVolumes,
      CRYPTO_DECIMALS.RATE
    );

    // 총 KR 거래량 계산
    const totalKrVolume = krVolumes.reduce(
      (sum, volume) => preciseAdd(sum, volume, CRYPTO_DECIMALS.VOLUME),
      0
    );

    return {
      avgEntryRate,
      totalKrVolume,
      totalKrFunds,
      totalFrFunds,
      totalKrFee,
      totalFrFee,
      positionsCount: openPositions.length,
    };
  } catch (error) {
    console.error("정산용 포지션 집계 중 오류:", error);
    return null;
  }
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

/**
 * 포지션 종료 레코드를 새로 삽입합니다
 */
export async function insertClosedPosition(positionData: {
  userId: number;
  strategyId: number;
  coinSymbol: string;
  leverage: number;
  krExchange: string;
  krOrderId: string;
  krPrice: number;
  krVolume: number;
  krFunds: number;
  krFee: number; // 추가된 필수 필드
  frExchange: string;
  frOrderId: string;
  frPrice: number;
  frVolume: number;
  frFunds: number;
  frFee: number; // 추가된 필수 필드
  entryRate: number; // 추가된 필수 필드
  exitRate?: number;
  usdtPrice?: number;
  profit?: number;
  profitRate?: number;
  entryTime: Date;
  exitTime: Date;
}) {
  const db = database();

  await db.insert(positions).values({
    userId: positionData.userId,
    strategyId: positionData.strategyId,
    coinSymbol: positionData.coinSymbol,
    leverage: positionData.leverage,
    status: "CLOSED",
    krExchange: positionData.krExchange,
    krOrderId: positionData.krOrderId,
    krPrice: positionData.krPrice.toString(),
    krVolume: positionData.krVolume.toString(),
    krFunds: positionData.krFunds.toString(),
    krFee: positionData.krFee.toString(), // 추가된 필드
    frExchange: positionData.frExchange,
    frOrderId: positionData.frOrderId,
    frPrice: positionData.frPrice.toString(),
    frVolume: positionData.frVolume.toString(),
    frFunds: positionData.frFunds.toString(),
    frFee: positionData.frFee.toString(), // 추가된 필드
    entryRate: positionData.entryRate.toString(), // 추가된 필드
    exitRate: positionData.exitRate?.toString() || null,
    usdtPrice: positionData.usdtPrice?.toString() || null,
    profit: positionData.profit?.toString() || null,
    profitRate: positionData.profitRate?.toString() || null,
    entryTime: positionData.entryTime,
    exitTime: positionData.exitTime,
  });

  console.log(
    `종료 포지션 레코드 삽입 완료: ${positionData.coinSymbol}, 사용자: ${positionData.userId}`
  );
}
