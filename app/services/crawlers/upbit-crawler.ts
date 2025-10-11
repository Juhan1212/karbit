import * as cheerio from "cheerio";
import * as fs from "fs";
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

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      await page.setExtraHTTPHeaders({
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      });

      // CSR(Client Side Rendering) 대응: JavaScript 실행을 기다림
      console.log(`[${this.name}] Navigating to ${this.noticeUrl}...`);
      await page.goto(this.noticeUrl, {
        waitUntil: "networkidle0", // 네트워크가 완전히 idle 상태가 될 때까지 대기
        timeout: 60000,
      });
      console.log(`[${this.name}] Page loaded, waiting for content...`);

      // EC2 환경에서 추가 대기 시간 (CSR 완전 렌더링 보장)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Puppeteer로 직접 요소 확인 (Cheerio 전에)
      const itemsFoundByPuppeteer = await page.evaluate(() => {
        const items = document.querySelectorAll("a.css-guxf6x");
        return items.length;
      });
      console.log(
        `[${this.name}] Puppeteer found ${itemsFoundByPuppeteer} items with primary selector`
      );

      if (itemsFoundByPuppeteer === 0) {
        // 다른 셀렉터들도 시도
        const altSelectors = [
          'a[class*="guxf6x"]',
          'a[href*="service_center/notice"]',
          'div[class*="Notice"] a',
          ".notice-list a",
        ];

        for (const sel of altSelectors) {
          const count = await page.evaluate((selector) => {
            return document.querySelectorAll(selector).length;
          }, sel);
          console.log(`[${this.name}] Selector "${sel}" found ${count} items`);
        }

        // HTML을 파일로 저장 (디버깅용)
        const debugHtml = await page.content();
        fs.writeFileSync("upbit-ec2-debug.html", debugHtml);
        console.log(
          `[${this.name}] Saved HTML to upbit-ec2-debug.html for debugging`
        );
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
      console.log(
        `[${this.name}] Found ${linkElements.length} items with primary selector`
      );

      // 셀렉터 우선순위: 1) css-guxf6x, 2) guxf6x 포함, 3) service_center/notice 링크
      let selector = "";
      let selectorElements;

      if (linkElements.length > 0) {
        selector = "a.css-guxf6x";
        selectorElements = linkElements;
      } else {
        const altElements = $("a[class*='guxf6x']");
        console.log(
          `[${this.name}] Found ${altElements.length} items with guxf6x pattern`
        );

        if (altElements.length > 0) {
          selector = "a[class*='guxf6x']";
          selectorElements = altElements;
        } else {
          // 최후의 수단: href로 찾기
          const hrefElements = $("a[href*='service_center/notice']");
          console.log(
            `[${this.name}] Found ${hrefElements.length} items with href pattern`
          );
          selector = "a[href*='service_center/notice']";
          selectorElements = hrefElements;
        }
      }

      if (!selector || selectorElements.length === 0) {
        console.log(`[${this.name}] No items found with any selector`);
        // HTML 구조 디버깅
        const allLinks = $("a");
        console.log(`[${this.name}] Total links in page: ${allLinks.length}`);
        console.log(
          `[${this.name}] First 5 link hrefs:`,
          allLinks
            .slice(0, 5)
            .map((i, el) => $(el).attr("href"))
            .get()
        );
      }

      // 업비트 공지사항 구조 파싱
      $(selector).each((index, element) => {
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
          let title = "";
          const titleSpan = $item.find("span.css-qju2q6");

          if (titleSpan.length > 0) {
            // 일반 공지사항
            title = titleSpan.text().trim();
          } else {
            // 고정 공지사항 - 다른 구조 시도
            const allText = $item.text().trim();
            // 카테고리 텍스트 제거
            title = allText.replace(category, "").trim();
          }

          if (!title) {
            console.log(
              `[${this.name}] Item ${index + 1}: No title found, HTML: ${$item.html()?.substring(0, 200)}`
            );
            return;
          }

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
