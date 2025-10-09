import { BithumbCrawler } from "../app/services/crawlers/bithumb-crawler";

describe("BithumbCrawler E2E", () => {
  it("should fetch and parse bithumb announcements (실제 SSR HTML 파싱)", async () => {
    const crawler = new BithumbCrawler();
    const result = await crawler.crawl();
    console.log("Crawl result:", result);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsItems)).toBe(true);
    expect(result.newsItems.length).toBeGreaterThan(0);
    // 주요 필드 체크
    for (const item of result.newsItems) {
      expect(item.title).toBeTruthy();
      expect(item.originalUrl).toMatch(
        /^https:\/\/www.bithumb.com\/notice|^https:\/\/feed.bithumb.com\/notice/
      );
      expect(item.publishedAt instanceof Date).toBe(true);
      expect(["listing", "delisting", "announcement"]).toContain(item.type);
    }
  }, 10000); // 10초 타임아웃
});
