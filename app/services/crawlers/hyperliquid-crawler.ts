import * as cheerio from "cheerio";
import { NewsItem } from "../../database/news";
import {
  CrawlerInterface,
  CrawlerResult,
  extractCoinSymbol,
  categorizeNews,
  createErrorResult,
  createSuccessResult,
} from "../../utils/news-crawler-utils";
import { launchBrowser } from "../../utils/puppeteer-config";

export class HyperliquidCrawler implements CrawlerInterface {
  name = "Hyperliquid";
  private baseUrl = "https://app.hyperliquid.xyz";
  private noticeUrl = "https://app.hyperliquid.xyz/announcements";

  async crawl(): Promise<CrawlerResult> {
    let browser;
    try {
      console.log(`[${this.name}] Starting crawl...`);

      // puppeteer로 SSR HTML을 받아옴
      browser = await launchBrowser();
      const page = await browser.newPage();

      // 페이지 detach 방지 설정
      page.on("error", (error) => {
        console.error(`[${this.name}] Page error:`, error);
      });

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      // 더 안정적인 네비게이션 전략
      await page.goto(this.noticeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 40000,
      });

      // 페이지 로드 대기
      await page.waitForSelector("div.sc-fEXmlR.ejmSgi", {
        timeout: 10000,
      });

      const html = await page.content();
      await browser.close();
      browser = null;

      const $ = cheerio.load(html);
      const newsItems: NewsItem[] = [];

      // 실제 공지 리스트만 순회 (중첩 구조 반영)
      $(
        "div.sc-fEXmlR.ejmSgi > div:nth-child(2) > div > div:nth-child(1) > div"
      ).each((_, block) => {
        try {
          const $block = $(block);
          // 첫 번째 bFBYgR: 코인명, 두 번째 bFBYgR: 카테고리(Listings/Delistings)
          const $bfb = $block.find("div.sc-bjfHbI.bFBYgR");
          const title = $bfb.first().text().trim();
          if (!title) return;
          const categoryText = $bfb.eq(1).text().trim();

          // description과 날짜는 각각 첫 번째, 두 번째 .sc-bjfHbI.jxtURp
          const descDivs = $block.find("div.sc-bjfHbI.jxtURp");
          const description = descDivs.eq(0).text().trim();
          const dateText = descDivs.eq(1).text().trim();
          const publishedAt =
            dateText && /\d{1,2}\/\d{1,2}\/\d{4}/.test(dateText)
              ? new Date(dateText)
              : new Date();

          const originalUrl = this.noticeUrl;
          const coinSymbol = this.extractCoinSymbol(title);
          let type: "listing" | "delisting" | "announcement" =
            this.categorizeNews(title, description);
          if (categoryText === "Listings") type = "listing";
          else if (categoryText === "Delistings") type = "delisting";

          const newsItem: NewsItem = {
            title,
            content: description,
            exchange: this.name,
            type,
            coinSymbol,
            originalUrl,
            publishedAt,
          };
          newsItems.push(newsItem);
        } catch (error) {
          console.error(`[${this.name}] Error parsing item:`, error);
        }
      });

      console.log(`[${this.name}] Crawled ${newsItems.length} items`);
      return createSuccessResult(newsItems);
    } catch (error) {
      // 브라우저 정리
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error(`[${this.name}] Error closing browser:`, closeError);
        }
      }
      return createErrorResult(error, this.name);
    }
  }

  extractCoinSymbol(title: string): string | undefined {
    return extractCoinSymbol(title);
  }

  categorizeNews(
    title: string,
    content?: string
  ): "listing" | "delisting" | "announcement" {
    return categorizeNews(title, content);
  }

  parseDate(dateString: string): Date {
    // Hyperliquid는 날짜가 ISO 포맷 문자열로 제공됨 (예: 2025-10-09)
    return new Date(dateString);
  }
}
