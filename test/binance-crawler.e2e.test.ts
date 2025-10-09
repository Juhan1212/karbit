import { BinanceCrawler } from "../app/services/crawlers/binance-crawler";

describe("BinanceCrawler E2E", () => {
  it("should fetch and parse binance announcements (실제 API 호출)", async () => {
    const crawler = new BinanceCrawler();
    const result = await crawler.crawl();

    console.log("Crawl result:", result);
    console.log("First few items:", result.newsItems?.slice(0, 3));

    expect(result.success).toBe(true);
    expect(Array.isArray(result.newsItems)).toBe(true);
    expect(result.newsItems.length).toBeGreaterThan(0);

    // 주요 필드 체크
    for (const item of result.newsItems) {
      expect(item.title).toBeTruthy();
      expect(item.exchange).toBe("Binance");
      expect(item.originalUrl).toMatch(
        /^https:\/\/www\.binance\.com\/en\/support\/announcement\//
      );
      expect(item.publishedAt instanceof Date).toBe(true);
      expect(["listing", "delisting", "announcement"]).toContain(item.type);
      expect(item.content).toBeTruthy();

      // 메타데이터 검증
      expect(item.metadata).toBeTruthy();
      const metadata = JSON.parse(item.metadata!);
      expect(typeof metadata.id).toBe("number");
      expect(metadata.code).toBeTruthy();
      expect(typeof metadata.type).toBe("number");
      expect(["listing", "delisting", "announcement"]).toContain(
        metadata.catalogType
      );
    }

    // listing과 delisting 타입이 모두 포함되어 있는지 확인
    const types = result.newsItems.map((item) => item.type);
    const uniqueTypes = new Set(types);

    // 적어도 listing 또는 delisting 중 하나는 있어야 함
    expect(uniqueTypes.has("listing") || uniqueTypes.has("delisting")).toBe(
      true
    );

    // 최신 뉴스인지 확인 (30일 이내)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentNews = result.newsItems.filter(
      (item) => item.publishedAt > thirtyDaysAgo
    );
    expect(recentNews.length).toBeGreaterThan(0);

    // 중복 제거 확인
    const titles = result.newsItems.map((item) => item.title);
    const uniqueTitles = new Set(titles);
    expect(titles.length).toBe(uniqueTitles.size);
  }, 15000); // 15초 타임아웃

  it("should categorize listing announcements correctly", async () => {
    const crawler = new BinanceCrawler();

    // Listing 관련 테스트 케이스들
    expect(
      crawler.categorizeNews("EVAA (EVAA) Will Be Available on Binance Alpha")
    ).toBe("listing");
    expect(
      crawler.categorizeNews("Binance Will Add OpenEden (EDEN) on Earn")
    ).toBe("listing");
    expect(crawler.categorizeNews("New Cryptocurrency Listing")).toBe(
      "listing"
    );
    expect(crawler.categorizeNews("Notice on New Trading Pairs")).toBe(
      "listing"
    );
  });

  it("should categorize delisting announcements correctly", async () => {
    const crawler = new BinanceCrawler();

    // Delisting 관련 테스트 케이스들
    expect(
      crawler.categorizeNews("Notice of Removal of Spot Trading Pairs")
    ).toBe("delisting");
    expect(crawler.categorizeNews("Binance Will Delist BAKE, HIFI, SLF")).toBe(
      "delisting"
    );
    expect(
      crawler.categorizeNews("Binance Futures Will Delist USDⓈ-M LEVERUSDT")
    ).toBe("delisting");
    expect(
      crawler.categorizeNews("Notice of Removal of Margin Trading Pairs")
    ).toBe("delisting");
  });

  it("should extract coin symbols correctly", async () => {
    const crawler = new BinanceCrawler();

    // 테스트 케이스들
    expect(
      crawler.extractCoinSymbol(
        "EVAA (EVAA) Will Be Available on Binance Alpha"
      )
    ).toBe("EVAA");
    expect(crawler.extractCoinSymbol("OpenEden (EDEN) on Earn")).toBe("EDEN");
    expect(crawler.extractCoinSymbol("DoubleZero (2Z) Will Be Available")).toBe(
      "2Z"
    );
    expect(
      crawler.extractCoinSymbol("Binance Will Delist BAKE, HIFI, SLF")
    ).toBe("BAKE");
    expect(
      crawler.extractCoinSymbol("USDⓈ-M LEVERUSDT Perpetual Contract")
    ).toBe("LEVER");
  });

  it("should parse timestamps correctly", async () => {
    const crawler = new BinanceCrawler();

    // Unix timestamp 테스트 (밀리초 단위)
    const timestamp = Date.now();
    const parsedDate = crawler.parseDate(timestamp.toString());

    expect(parsedDate instanceof Date).toBe(true);
    expect(Math.abs(parsedDate.getTime() - timestamp)).toBeLessThan(1000); // 1초 오차 허용
  });

  it("should handle different catalog types", async () => {
    const crawler = new BinanceCrawler();
    const result = await crawler.crawl();

    if (result.success && result.newsItems.length > 0) {
      // listing과 delisting 타입 확인
      const listingItems = result.newsItems.filter(
        (item) => item.type === "listing"
      );
      const delistingItems = result.newsItems.filter(
        (item) => item.type === "delisting"
      );

      // 메타데이터에서 catalogType 확인
      if (listingItems.length > 0) {
        const listingMetadata = JSON.parse(listingItems[0].metadata!);
        expect(listingMetadata.catalogType).toBe("listing");
      }

      if (delistingItems.length > 0) {
        const delistingMetadata = JSON.parse(delistingItems[0].metadata!);
        expect(delistingMetadata.catalogType).toBe("delisting");
      }
    }
  });

  it("should handle error gracefully when API is unavailable", async () => {
    // API URL을 잘못된 것으로 변경하여 에러 처리 테스트
    const crawler = new BinanceCrawler();
    // private 프로퍼티에 접근하기 위해 any로 캐스팅
    (crawler as any).apiUrl = "https://invalid-api-url.com/test";

    const result = await crawler.crawl();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.newsItems).toEqual([]);
  }, 10000);
});
