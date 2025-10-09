import { HyperliquidCrawler } from "../app/services/crawlers/hyperliquid-crawler";

describe("HyperliquidCrawler E2E", () => {
  it("should fetch and parse hyperliquid announcements (실제 API 호출)", async () => {
    const crawler = new HyperliquidCrawler();
    const result = await crawler.crawl();

    console.log("Crawl result:", result);
    console.log("First few items:", result.newsItems?.slice(0, 3));

    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsItems)).toBe(true);
    expect(result.newsItems.length).toBeGreaterThan(0);

    for (const item of result.newsItems) {
      expect(item.title).toBeTruthy();
      expect(item.exchange).toBe("Hyperliquid");
      expect(item.originalUrl).toMatch(
        /^https:\/\/app\.hyperliquid\.xyz\/announcements/
      );
      expect(item.publishedAt instanceof Date).toBe(true);
      expect(["listing", "delisting", "announcement"]).toContain(item.type);
      expect(item.content).toBeDefined();
      expect(typeof item.content).toBe("string");
      // 날짜가 2020년 이후인지 체크
      expect(item.publishedAt.getFullYear()).toBeGreaterThan(2020);
    }
    // 중복 제거 확인
    const titles = result.newsItems.map((item) => item.title);
    const uniqueTitles = new Set(titles);
    expect(titles.length).toBe(uniqueTitles.size);
  }, 20000); // 20초 타임아웃

  it("should categorize news correctly", async () => {
    const crawler = new HyperliquidCrawler();
    expect(
      crawler.categorizeNews(
        "New listing: MON-USD hyperps",
        "Long or short the unlaunched MON (Monad) token with up to 3x leverage"
      )
    ).toBe("listing");
    expect(
      crawler.categorizeNews("Delisting: ABC-USD", "Token will be removed")
    ).toBe("delisting");
    expect(
      crawler.categorizeNews("Platform Maintenance", "Scheduled maintenance")
    ).toBe("announcement");
  });

  it("should extract coin symbols correctly", async () => {
    const crawler = new HyperliquidCrawler();
    expect(crawler.extractCoinSymbol("New listing: MON-USD hyperps")).toBe(
      "MON"
    );
    expect(crawler.extractCoinSymbol("Delisting: ABC-USD")).toBe("ABC");
    expect(crawler.extractCoinSymbol("Platform Maintenance")).toBeUndefined();
  });

  it("should parse dates correctly", async () => {
    const crawler = new HyperliquidCrawler();
    const dateStr = "10/8/2025";
    const parsedDate = crawler.parseDate(dateStr);
    expect(parsedDate instanceof Date).toBe(true);
    expect(parsedDate.getFullYear()).toBe(2025);
    expect(parsedDate.getMonth()).toBe(9); // 0-indexed
    expect(parsedDate.getDate()).toBe(8);
  });

  it("should handle error gracefully when API is unavailable", async () => {
    const crawler = new HyperliquidCrawler();
    (crawler as any).noticeUrl = "https://invalid-url.com/test";
    const result = await crawler.crawl();
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.newsItems).toEqual([]);
  }, 10000);
});
