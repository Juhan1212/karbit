import { database } from "./context";
import { exchangeNews } from "./schema";
import { desc, eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import { createHash } from "crypto";

export interface NewsItem {
  id?: number;
  title: string;
  content?: string;
  exchange: string;
  type: "listing" | "delisting" | "announcement";
  coinSymbol?: string;
  originalUrl: string;
  publishedAt: Date;
  scrapedAt?: Date;
  contentHash?: string;
}

/**
 * 뉴스 항목의 고유 해시 생성
 */
export function generateNewsHash(
  item: Omit<NewsItem, "id" | "scrapedAt" | "contentHash" | "isActive">
): string {
  const hashInput = `${item.title}|${item.exchange}|${item.originalUrl}|${item.publishedAt.toISOString()}`;
  return createHash("sha256").update(hashInput, "utf8").digest("hex");
}

/**
 * 뉴스 항목 저장 (중복 체크 포함)
 */
export async function saveNewsItem(item: NewsItem): Promise<number | null> {
  try {
    const db = database();
    const contentHash = item.contentHash || generateNewsHash(item);

    // 중복 체크
    const existing = await db
      .select({ id: exchangeNews.id })
      .from(exchangeNews)
      .where(eq(exchangeNews.contentHash, contentHash))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[News] Duplicate news item skipped: ${item.title}`);
      return null;
    }

    // 새 뉴스 항목 저장
    const result = await db
      .insert(exchangeNews)
      .values({
        title: item.title,
        content: item.content,
        exchange: item.exchange,
        type: item.type,
        coinSymbol: item.coinSymbol,
        originalUrl: item.originalUrl,
        publishedAt: item.publishedAt,
        contentHash,
      })
      .returning({ id: exchangeNews.id });

    console.log(`[News] New news item saved: ${item.title} (${item.exchange})`);
    return result[0]?.id ?? null;
  } catch (error) {
    console.error(`[News] Error saving news item:`, error);
    return null;
  }
}

/**
 * 뉴스 목록 조회 (페이지네이션 포함)
 */
export async function getNewsList(
  options: {
    exchange?: string;
    type?: string;
    coinSymbol?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    onlyActive?: boolean;
  } = {}
) {
  const db = database();
  const {
    exchange,
    type,
    coinSymbol,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
    onlyActive = true,
  } = options;

  const conditions = [];

  if (exchange && exchange !== "all") {
    conditions.push(eq(exchangeNews.exchange, exchange));
  }

  if (type && type !== "all") {
    conditions.push(eq(exchangeNews.type, type as any));
  }

  if (coinSymbol) {
    conditions.push(eq(exchangeNews.coinSymbol, coinSymbol));
  }

  if (startDate) {
    conditions.push(gte(exchangeNews.publishedAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(exchangeNews.publishedAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select()
    .from(exchangeNews)
    .where(whereClause)
    .orderBy(desc(exchangeNews.publishedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * 뉴스 통계 조회
 */
export async function getNewsStats(
  options: {
    exchange?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const db = database();
  const { exchange, startDate, endDate } = options;

  const conditions = [];

  if (exchange && exchange !== "all") {
    conditions.push(eq(exchangeNews.exchange, exchange));
  }

  if (startDate) {
    conditions.push(gte(exchangeNews.publishedAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(exchangeNews.publishedAt, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const stats = await db
    .select({
      type: exchangeNews.type,
      count: sql<number>`count(*)`,
    })
    .from(exchangeNews)
    .where(whereClause)
    .groupBy(exchangeNews.type);

  const totalCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(exchangeNews)
    .where(whereClause);

  const activeExchanges = await db
    .select({
      exchange: exchangeNews.exchange,
      count: sql<number>`count(*)`,
    })
    .from(exchangeNews)
    .where(whereClause)
    .groupBy(exchangeNews.exchange);

  return {
    byType: stats,
    total: totalCount[0]?.count ?? 0,
    activeExchanges: activeExchanges.length,
    exchangeBreakdown: activeExchanges,
  };
}

/**
 * 최근 뉴스 조회 (캐시용)
 */
export async function getRecentNews(limit = 20) {
  const db = database();
  return await db
    .select()
    .from(exchangeNews)
    .orderBy(desc(exchangeNews.publishedAt))
    .limit(limit);
}

/**
 * 특정 거래소의 마지막 크롤링 시간 조회
 */
export async function getLastCrawlTime(exchange: string): Promise<Date | null> {
  const db = database();
  const result = await db
    .select({ scrapedAt: exchangeNews.scrapedAt })
    .from(exchangeNews)
    .where(eq(exchangeNews.exchange, exchange))
    .orderBy(desc(exchangeNews.scrapedAt))
    .limit(1);

  return result[0]?.scrapedAt ?? null;
}

/**
 * 뉴스 항목들을 일괄 저장
 */
export async function bulkSaveNewsItems(items: NewsItem[]): Promise<number> {
  if (items.length === 0) return 0;

  let savedCount = 0;

  for (const item of items) {
    const result = await saveNewsItem(item);
    if (result !== null) {
      savedCount++;
    }
  }

  return savedCount;
}
