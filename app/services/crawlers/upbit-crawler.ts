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
import { launchBrowser } from "../../utils/puppeteer-config";

export class UpbitCrawler implements CrawlerInterface {
  name = "Upbit";
  private baseUrl = "https://upbit.com";
  private noticeUrl = "https://upbit.com/service_center/notice";

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
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      });

      // CSR(Client Side Rendering) 대응: JavaScript 실행을 기다림
      await page.goto(this.noticeUrl, {
        waitUntil: "networkidle0", // 네트워크가 완전히 idle 상태가 될 때까지 대기
        timeout: 60000,
      });

      // 공지사항 링크가 렌더링될 때까지 명시적으로 대기
      try {
        await page.waitForSelector("a.css-guxf6x", { timeout: 10000 });
      } catch (selectorError) {
        console.warn(
          `[${this.name}] Primary selector not found, trying alternative...`
        );
        // 대체 셀렉터 시도
        await page.waitForSelector("a[href*='service_center/notice']", {
          timeout: 10000,
        });
      }

      const html = await page.content();
      await browser.close();
      browser = null;

      // Cheerio 파싱
      const $ = cheerio.load(html, {
        xml: {
          xmlMode: false,
        },
      });
      const newsItems: NewsItem[] = [];

      // 셀렉터 찾기
      const linkElements = $("a.css-guxf6x");
      const selector =
        linkElements.length > 0 ? "a.css-guxf6x" : "a[class*='guxf6x']";

      // 업비트 공지사항 구조 파싱
      $(selector).each((_, element) => {
        try {
          const $item = $(element);

          // href 링크
          const href = $item.attr("href") || "";
          if (!href) return;

          // 전체 URL 생성
          const originalUrl = href.startsWith("http")
            ? href
            : `${this.baseUrl}${href}`;

          // 카테고리 추출: css-v2zw8h > css-1s5b0h5
          const category = $item.find(".css-v2zw8h .css-1s5b0h5").text().trim();

          // 제목 추출: span 내부의 전체 텍스트를 가져옴
          const titleSpan = $item.find("span.css-qju2q6");
          const title = titleSpan.text().trim();

          if (!title) return;

          // 날짜는 현재 시간 사용
          const publishedAt = new Date();

          // 코인 심볼 추출
          const coinSymbol = this.extractCoinSymbol(title);

          // 뉴스 타입 분류
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
    // Upbit 특화 분류
    if (title.includes("신규 거래지원 안내")) {
      return "listing";
    }
    if (
      title.includes("거래지원 종료") ||
      title.includes("거래 종료") ||
      title.includes("상장폐지")
    ) {
      return "delisting";
    }

    // 그 외는 기본 분류 사용
    return categorizeNews(title, content);
  }
}
