import { UpbitCrawler } from "../app/services/crawlers/upbit-crawler";

describe("UpbitCrawler E2E", () => {
  it("should fetch and parse upbit announcements (실제 API 호출)", async () => {
    const crawler = new UpbitCrawler();
    const result = await crawler.crawl();
    console.log("Crawl result:", result);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsItems)).toBe(true);
    expect(result.newsItems.length).toBeGreaterThan(0);
    // 주요 필드 체크
    for (const item of result.newsItems) {
      expect(item.title).toBeTruthy();
      expect(item.originalUrl).toMatch(
        /^https:\/\/upbit.com\/service_center\/notice\?id=\d+/
      );
      expect(item.publishedAt instanceof Date).toBe(true);
      expect(["listing", "delisting", "announcement"]).toContain(item.type);
    }
  }, 10000); // 10초 타임아웃
});
