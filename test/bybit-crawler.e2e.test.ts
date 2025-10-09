import { BybitCrawler } from "../app/services/crawlers/bybit-crawler";

describe("BybitCrawler E2E", () => {
  it("should fetch and parse bybit announcements (실제 API 호출)", async () => {
    const crawler = new BybitCrawler();
    const result = await crawler.crawl();

    console.log("Crawl result:", result);
    console.log("First few items:", result.newsItems?.slice(0, 3));

    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsItems)).toBe(true);
    expect(result.newsItems.length).toBeGreaterThan(0);

    // 주요 필드 체크
    for (const item of result.newsItems) {
      expect(item.title).toBeTruthy();
      expect(item.exchange).toBe("Bybit");
      expect(item.originalUrl).toMatch(/^https:\/\/announcements\.bybit\.com/);
      expect(item.publishedAt instanceof Date).toBe(true);
      expect(["listing", "delisting", "announcement"]).toContain(item.type);
      expect(item.content).toBeTruthy();

      // 메타데이터 검증
      expect(item.metadata).toBeTruthy();
      const metadata = JSON.parse(item.metadata!);
      expect(metadata.category).toBeTruthy();
      expect(Array.isArray(metadata.topics)).toBe(true);
      expect(typeof metadata.startDate).toBe("number");
      expect(typeof metadata.endDate).toBe("number");
      expect(typeof metadata.isTop).toBe("boolean");
      expect(metadata.objectID).toBeTruthy();
    }

    // 최신 뉴스인지 확인 (7일 이내)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentNews = result.newsItems.filter(
      (item) => item.publishedAt > sevenDaysAgo
    );
    expect(recentNews.length).toBeGreaterThan(0);

    // 중복 제거 확인
    const titles = result.newsItems.map((item) => item.title);
    const uniqueTitles = new Set(titles);
    expect(titles.length).toBe(uniqueTitles.size);
  }, 15000); // 15초 타임아웃

  it("should handle error gracefully when API is unavailable", async () => {
    // API URL을 잘못된 것으로 변경하여 에러 처리 테스트
    const crawler = new BybitCrawler();
    // private 프로퍼티에 접근하기 위해 any로 캐스팅
    (crawler as any).apiUrl = "https://invalid-api-url.com/test";

    const result = await crawler.crawl();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.newsItems).toEqual([]);
  }, 10000);

  it("should categorize news correctly", async () => {
    const crawler = new BybitCrawler();

    // 테스트 케이스들
    expect(crawler.categorizeNews("New Listing: BTCUSDT", "")).toBe("listing");
    expect(crawler.categorizeNews("Delisting of ETHUSDT", "")).toBe(
      "delisting"
    );
    expect(crawler.categorizeNews("Platform Maintenance", "")).toBe(
      "announcement"
    );
    expect(crawler.categorizeNews("BTC Perpetual Contract", "")).toBe(
      "listing"
    );
  });

  it("should extract coin symbols correctly", async () => {
    const crawler = new BybitCrawler();

    // 테스트 케이스들
    expect(
      crawler.extractCoinSymbol("New Listing: BTCUSDT Perpetual Contract")
    ).toBe("BTC");
    expect(crawler.extractCoinSymbol("ETH/USDT Trading Pair")).toBe("ETH");
    expect(crawler.extractCoinSymbol("Delisting of DOGEUSDT")).toBe("DOGE");
    expect(
      crawler.extractCoinSymbol("Platform Maintenance Update")
    ).toBeUndefined();
  });

  it("should parse timestamps correctly", async () => {
    const crawler = new BybitCrawler();

    // Unix timestamp 테스트
    const timestamp = Math.floor(Date.now() / 1000); // 현재 시간의 Unix timestamp
    const parsedDate = crawler.parseDate(timestamp.toString());

    expect(parsedDate instanceof Date).toBe(true);
    expect(Math.abs(parsedDate.getTime() - Date.now())).toBeLessThan(5000); // 5초 오차 허용
  });
});
