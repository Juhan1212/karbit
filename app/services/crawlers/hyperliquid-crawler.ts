import * as puppeteer from "puppeteer";
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

export class HyperliquidCrawler implements CrawlerInterface {
  name = "Hyperliquid";
  private baseUrl = "https://app.hyperliquid.xyz";
  private noticeUrl = "https://app.hyperliquid.xyz/announcements";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      // puppeteer로 SSR HTML을 받아옴
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
        ],
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH ||
          puppeteer.executablePath() ||
          "/usr/bin/google-chrome-stable",
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });
      await page.goto(this.noticeUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
      const html = await page.content();
      await browser.close();
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
