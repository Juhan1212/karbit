import { UpbitCrawler } from "./app/services/crawlers/upbit-crawler";
import { BinanceCrawler } from "./app/services/crawlers/binance-crawler";
import { BithumbCrawler } from "./app/services/crawlers/bithumb-crawler";
import { BybitCrawler } from "./app/services/crawlers/bybit-crawler";
import { OKXCrawler } from "./app/services/crawlers/okx-crawler";
import { bulkSaveNewsItems } from "./app/database/news";
import { setCache } from "./app/core/redisCache";
import { CrawlerInterface } from "./app/utils/news-crawler-utils";
import { HyperliquidCrawler } from "./app/services/crawlers/hyperliquid-crawler";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DatabaseContext } from "./app/database/context";
import * as schema from "./app/database/schema";
import dotenv from "dotenv";

dotenv.config();

class NewsCrawlerService {
  private crawlers: CrawlerInterface[] = [
    new UpbitCrawler(),
    new BinanceCrawler(),
    new BithumbCrawler(),
    new BybitCrawler(),
    // new OKXCrawler(),
    new HyperliquidCrawler(),
  ];

  async crawlAllExchanges(): Promise<void> {
    console.log("[News Crawler] Starting news crawling cycle...");

    let totalNewItems = 0;
    const results: Array<{
      exchange: string;
      success: boolean;
      count: number;
      error?: string;
    }> = [];

    // 각 거래소를 병렬로 크롤링
    const crawlPromises = this.crawlers.map(async (crawler) => {
      try {
        console.log(`[News Crawler] Starting ${crawler.name} crawl...`);
        const result = await crawler.crawl();

        if (result.success && result.newsItems.length > 0) {
          // 데이터베이스에 저장
          const savedCount = await bulkSaveNewsItems(result.newsItems);
          totalNewItems += savedCount;

          console.log(
            `[News Crawler] ${crawler.name}: ${savedCount}/${result.totalCount} new items saved`
          );

          return {
            exchange: crawler.name,
            success: true,
            count: savedCount,
          };
        } else {
          console.log(`[News Crawler] ${crawler.name}: No new items found`);
          return {
            exchange: crawler.name,
            success: result.success,
            count: 0,
            error: result.error,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`[News Crawler] ${crawler.name} failed:`, errorMessage);

        return {
          exchange: crawler.name,
          success: false,
          count: 0,
          error: errorMessage,
        };
      }
    });

    const crawlResults = await Promise.allSettled(crawlPromises);

    // 결과 처리
    crawlResults.forEach((promiseResult, index) => {
      if (promiseResult.status === "fulfilled") {
        results.push(promiseResult.value);
      } else {
        const crawler = this.crawlers[index];
        results.push({
          exchange: crawler.name,
          success: false,
          count: 0,
          error: promiseResult.reason?.message || "Unknown error",
        });
      }
    });

    // 결과 요약
    const successfulCrawls = results.filter((r) => r.success).length;
    const failedCrawls = results.filter((r) => !r.success);

    console.log(`[News Crawler] Crawling cycle completed:`);
    console.log(`  - Total new items: ${totalNewItems}`);
    console.log(
      `  - Successful crawls: ${successfulCrawls}/${this.crawlers.length}`
    );

    if (failedCrawls.length > 0) {
      console.log(
        `  - Failed crawls:`,
        failedCrawls.map((f) => `${f.exchange}: ${f.error}`)
      );
    }
  }

  async start(): Promise<void> {
    console.log("[News Crawler] Service started. Running initial crawl...");

    // 초기 크롤링 실행
    await this.crawlAllExchanges();

    // 1분마다 크롤링 실행
    setInterval(
      async () => {
        try {
          await this.crawlAllExchanges();
        } catch (error) {
          console.error("[News Crawler] Scheduled crawl failed:", error);
        }
      },
      10 * 60 * 1000
    ); // 10분

    console.log("[News Crawler] Scheduled crawling started (every 10 minutes)");
  }

  async test(): Promise<void> {
    console.log("[News Crawler] Running test crawl for all exchanges...");

    await Promise.all(
      this.crawlers.map(async (crawler) => {
        try {
          console.log(`[News Crawler] Testing ${crawler.name} crawl...`);
          const result = await crawler.crawl();

          if (result.success) {
            console.log(
              `[News Crawler] ${crawler.name} test crawl successful: ${result.newsItems.length} items fetched`
            );
          } else {
            console.log(
              `[News Crawler] ${crawler.name} test crawl failed: ${result.error}`
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[News Crawler] ${crawler.name} test crawl encountered an error:`,
            errorMessage
          );
        }
      })
    );
  }
}

// 서비스 인스턴스 생성 및 시작
const newsCrawlerService = new NewsCrawlerService();

// 프로세스 종료 시 정리
process.on("SIGINT", () => {
  console.log("[News Crawler] Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[News Crawler] Shutting down gracefully...");
  process.exit(0);
});

// 에러 핸들링
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[News Crawler] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});

process.on("uncaughtException", (error) => {
  console.error("[News Crawler] Uncaught Exception:", error);
  process.exit(1);
});

// DB 인스턴스 생성
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = postgres(process.env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: { application_name: "karbit-app" },
  onnotice: (notice: any) => {
    console.log("PostgreSQL Notice:", notice);
  },
});
const db = drizzle(client, { schema });

// DatabaseContext로 감싸서 서비스 실행
DatabaseContext.run(db, async () => {
  try {
    await newsCrawlerService.start();
  } catch (error) {
    console.error("[News Crawler] Failed to start service:", error);
    process.exit(1);
  }
});
