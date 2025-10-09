import fetch from "node-fetch";
import { NewsItem } from "../../database/news";
import {
  CrawlerInterface,
  CrawlerResult,
  extractCoinSymbol,
  categorizeNews,
  generateSummary,
  createErrorResult,
  createSuccessResult,
} from "../../utils/news-crawler-utils";

interface OKXAnnouncement {
  announcementId: string;
  title: string;
  summary: string;
  content: string;
  publishTime: string;
  modifyTime: string;
  url: string;
  type: string;
  category: string;
}

interface OKXApiResponse {
  code: string;
  msg: string;
  data: OKXAnnouncement[];
}

export class OKXCrawler implements CrawlerInterface {
  name = "OKX";
  private apiUrl = "https://www.okx.com/api/v5/support/announcements";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      const response = await fetch(`${this.apiUrl}?t=${Date.now()}&limit=20`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as OKXApiResponse;

      if (result.code !== "0") {
        throw new Error(`API error: ${result.msg}`);
      }

      const newsItems = this.parseAnnouncements(result.data);

      console.log(`[${this.name}] Crawled ${newsItems.length} items`);
      return createSuccessResult(newsItems);
    } catch (error) {
      return createErrorResult(error, this.name);
    }
  }

  private parseAnnouncements(announcements: OKXAnnouncement[]): NewsItem[] {
    return announcements.map((announcement) => {
      const publishedAt = new Date(announcement.publishTime);
      const coinSymbol = this.extractCoinSymbol(announcement.title);
      const type = this.categorizeNews(
        announcement.title,
        announcement.content
      );
      const summary =
        announcement.summary || generateSummary(announcement.content, 200);

      // OKX URL 구성
      const originalUrl = announcement.url.startsWith("http")
        ? announcement.url
        : `https://www.okx.com${announcement.url}`;

      return {
        title: announcement.title,
        summary,
        content: announcement.content,
        exchange: this.name,
        type,
        coinSymbol,
        originalUrl,
        publishedAt,
        isActive: true,
        metadata: JSON.stringify({
          type: announcement.type,
          category: announcement.category,
          modifyTime: announcement.modifyTime,
        }),
      };
    });
  }

  parseDate(dateString: string): Date {
    return new Date(dateString);
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
}
