import fetch from "node-fetch";
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

export class UpbitCrawler implements CrawlerInterface {
  name = "Upbit";
  private baseUrl = "https://upbit.com";
  private apiUrl =
    "https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category=all";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      const response = await fetch(this.apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "ko-KR,ko;q=0.8,en-US;q=0.6,en;q=0.4",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const newsItems: NewsItem[] = [];

      // 공지/고정공지 모두 파싱
      const notices = [
        ...(json.data?.fixed_notices || []),
        ...(json.data?.notices || []),
      ];

      for (const notice of notices) {
        try {
          const title = notice.title?.trim();
          if (!title) continue;

          // URL 생성
          const originalUrl = `${this.baseUrl}/service_center/notice?id=${notice.id}`;

          // 날짜
          const publishedAt = new Date(notice.listed_at);

          // 코인 심볼 추출
          const coinSymbol = this.extractCoinSymbol(title);

          // 뉴스 타입 분류
          const type = this.categorizeNews(title);

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
      }

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
    content?: string
  ): "listing" | "delisting" | "announcement" {
    // Upbit 특화 분류
    if (title.includes("신규 거래지원 안내")) {
      return "listing";
    }
    if (title.includes("거래지원 종료 안내")) {
      return "delisting";
    }
    // 그 외는 기본 분류 사용
    return categorizeNews(title, content);
  }
}
