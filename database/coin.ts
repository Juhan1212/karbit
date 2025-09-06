import { eq, sql, inArray } from "drizzle-orm";
import { database } from "./context";
import { coinsExchanges, exchanges } from "./schema";

export interface AvailableCoin {
  id: string;
  name: string;
  symbol: string;
}

export interface RestrictedCoin {
  exchangeName: string;
  coinSymbol: string;
  displayName: string;
  depositYn: boolean | null;
  withdrawYn: boolean | null;
  netType: string | null;
}

/**
 * 모든 거래소에 공통으로 상장된 코인들을 조회
 */
export async function getCommonCoins(): Promise<AvailableCoin[]> {
  const db = database();

  try {
    // 전체 거래소 수 조회
    const totalExchangesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(exchanges);

    const totalExchanges = totalExchangesResult[0]?.count || 0;

    if (totalExchanges === 0) {
      return [];
    }

    // 모든 거래소에 공통으로 상장된 코인들 조회
    const commonCoinsResult = await db
      .select({
        coinSymbol: coinsExchanges.coinSymbol,
        displayName: coinsExchanges.displayName,
        exchangeCount: sql<number>`count(distinct ${coinsExchanges.exchangeId})`,
      })
      .from(coinsExchanges)
      .groupBy(coinsExchanges.coinSymbol, coinsExchanges.displayName)
      .having(
        sql`count(distinct ${coinsExchanges.exchangeId}) = ${totalExchanges}`
      )
      .orderBy(coinsExchanges.displayName);

    return commonCoinsResult.map((coin) => ({
      id: coin.coinSymbol,
      name: coin.displayName,
      symbol: coin.coinSymbol,
    }));
  } catch (error) {
    console.error("공통 코인 조회 오류:", error);
    return [];
  }
}

/**
 * 특정 거래소들에 공통으로 상장된 코인들을 조회
 */
export async function getCommonCoinsByExchanges(
  exchangeNames: string[]
): Promise<AvailableCoin[]> {
  const db = database();

  try {
    if (exchangeNames.length === 0) {
      return [];
    }

    // 지정된 거래소들의 ID 조회
    const targetExchanges = await db
      .select({ id: exchanges.id })
      .from(exchanges)
      .where(inArray(exchanges.name, exchangeNames));

    const exchangeIds = targetExchanges.map((ex) => ex.id);

    if (exchangeIds.length === 0) {
      return [];
    }

    // 지정된 거래소들에 공통으로 상장된 코인들 조회
    const commonCoinsResult = await db
      .select({
        coinSymbol: coinsExchanges.coinSymbol,
        displayName: sql<string>`MIN(${coinsExchanges.displayName})`,
        exchangeCount: sql<number>`count(distinct ${coinsExchanges.exchangeId})`,
      })
      .from(coinsExchanges)
      .where(inArray(coinsExchanges.exchangeId, exchangeIds))
      .groupBy(coinsExchanges.coinSymbol)
      .having(sql`count(distinct ${coinsExchanges.exchangeId}) >= 2`)
      .orderBy(coinsExchanges.coinSymbol);

    return commonCoinsResult.map((coin) => ({
      id: coin.coinSymbol,
      name: coin.displayName,
      symbol: coin.coinSymbol,
    }));
  } catch (error) {
    console.error("거래소별 공통 코인 조회 오류:", error);
    return [];
  }
}

/**
 * 특정 거래소에 상장된 모든 코인들을 조회
 */
export async function getCoinsByExchange(
  exchangeName: string
): Promise<AvailableCoin[]> {
  const db = database();

  try {
    const coinsResult = await db
      .select({
        coinSymbol: coinsExchanges.coinSymbol,
        displayName: coinsExchanges.displayName,
      })
      .from(coinsExchanges)
      .innerJoin(exchanges, eq(coinsExchanges.exchangeId, exchanges.id))
      .where(eq(exchanges.name, exchangeName))
      .orderBy(coinsExchanges.displayName);

    return coinsResult.map((coin) => ({
      id: coin.coinSymbol,
      name: coin.displayName,
      symbol: coin.coinSymbol,
    }));
  } catch (error) {
    console.error("거래소별 코인 조회 오류:", error);
    return [];
  }
}

/**
 * 입출금 제한이 있는 코인들을 조회
 */
export async function getRestrictedCoins(): Promise<RestrictedCoin[]> {
  const db = database();

  try {
    const restrictedCoinsResult = await db
      .select({
        exchangeName: exchanges.name,
        coinSymbol: coinsExchanges.coinSymbol,
        displayName: coinsExchanges.displayName,
        depositYn: coinsExchanges.depositYn,
        withdrawYn: coinsExchanges.withdrawYn,
        netType: coinsExchanges.netType,
      })
      .from(coinsExchanges)
      .innerJoin(exchanges, eq(coinsExchanges.exchangeId, exchanges.id))
      .where(
        sql`${coinsExchanges.depositYn} != true OR ${coinsExchanges.withdrawYn} != true`
      )
      .orderBy(exchanges.name, coinsExchanges.coinSymbol);

    return restrictedCoinsResult.map((coin) => ({
      exchangeName: coin.exchangeName,
      coinSymbol: coin.coinSymbol,
      displayName: coin.displayName,
      depositYn: coin.depositYn,
      withdrawYn: coin.withdrawYn,
      netType: coin.netType,
    }));
  } catch (error) {
    console.error("입출금 제한 코인 조회 오류:", error);
    return [];
  }
}
