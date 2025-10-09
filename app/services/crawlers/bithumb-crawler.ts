import * as puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { NewsItem } from "../../database/news";
import {
  CrawlerInterface,
  CrawlerResult,
  extractCoinSymbol,
  categorizeNews,
  parseKoreanDate,
  createErrorResult,
  createSuccessResult,
} from "../../utils/news-crawler-utils";

export class BithumbCrawler implements CrawlerInterface {
  name = "Bithumb";
  private baseUrl = "https://www.bithumb.com";
  private noticeUrl = "https://feed.bithumb.com/notice";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      // puppeteer로 SSR HTML을 받아옴
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      });
      await page.goto(this.noticeUrl, {
        waitUntil: "networkidle2",
        timeout: 20000,
      });
      const html = await page.content();
      await browser.close();
      const $ = cheerio.load(html);
      const newsItems: NewsItem[] = [];

      // 빗썸 공식 공지사항 SSR 구조 파싱
      $("ul.NoticeContentList_notice-list__i337r > li").each((_, element) => {
        try {
          const $item = $(element);
          const $link = $item
            .find("a.NoticeContentList_notice-list__link__LAkAV")
            .first();
          if (!$link.length) return;

          // 카테고리
          const category = $item
            .find(".NoticeContentList_notice-list__category__cBqMf")
            .text()
            .trim();
          if (!category) return;

          // 제목
          const title = $link
            .find(".NoticeContentList_notice-list__link-title__nlmSC")
            .text()
            .trim();
          if (!title) return;

          // 날짜
          const dateText = $link
            .find(".NoticeContentList_notice-list__link-date__gDc6U")
            .text()
            .trim();
          const publishedAt = this.parseDate(dateText);

          // 상세 URL
          let relativeUrl = $link.attr("href") || "";
          if (!relativeUrl.startsWith("http")) {
            relativeUrl = this.noticeUrl + relativeUrl;
          }
          // /notice가 중복되지 않도록 처리
          relativeUrl = relativeUrl.replace("/notice/notice", "/notice");
          const originalUrl = relativeUrl;

          // 코인 심볼 추출
          const coinSymbol = this.extractCoinSymbol(title);

          // 뉴스 타입 분류 (category도 인자로 전달)
          const type = this.categorizeNews(title, undefined, category);

          const newsItem: NewsItem = {
            title,
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

  parseDate(dateString: string): Date {
    return parseKoreanDate(dateString);
  }

  extractCoinSymbol(title: string): string | undefined {
    return extractCoinSymbol(title);
  }

  categorizeNews(
    title: string,
    content?: string,
    category?: string
  ): "listing" | "delisting" | "announcement" {
    // category 기반 우선 분류
    if (category && category.includes("마켓추가")) {
      return "listing";
    }
    if (category && category.includes("거래지원종료")) {
      return "delisting";
    }
    // 그 외는 기본 분류 사용
    return categorizeNews(title, content);
  }
}
