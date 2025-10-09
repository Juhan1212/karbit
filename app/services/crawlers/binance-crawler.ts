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

interface BinanceAnnouncement {
  id: number;
  code: string;
  title: string;
  type: number;
  releaseDate: number;
}

interface BinanceApiResponse {
  code: string;
  message: string | null;
  messageDetail: string | null;
  data: {
    catalogs: Array<{
      catalogId: number;
      parentCatalogId: number | null;
      icon: string;
      catalogName: string;
      description: string | null;
      catalogType: number;
      total: number;
      articles: BinanceAnnouncement[];
      catalogs: any[];
    }>;
  };
  success: boolean;
}

export class BinanceCrawler implements CrawlerInterface {
  name = "Binance";
  private apiUrl =
    "https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      // 새로운 상장 공지사항 (catalogId: 48)
      const listingResponse = await this.fetchAnnouncements(48);
      // 상장 폐지 공지사항 (catalogId: 161)
      const delistingResponse = await this.fetchAnnouncements(161);

      const newsItems: NewsItem[] = [];

      // 상장 공지사항 처리
      if (listingResponse.success && listingResponse.data) {
        newsItems.push(
          ...this.parseAnnouncements(listingResponse.data, "listing")
        );
      }

      // 상장 폐지 공지사항 처리
      if (delistingResponse.success && delistingResponse.data) {
        newsItems.push(
          ...this.parseAnnouncements(delistingResponse.data, "delisting")
        );
      }

      console.log(`[${this.name}] Crawled ${newsItems.length} items`);
      return createSuccessResult(newsItems);
    } catch (error) {
      return createErrorResult(error, this.name);
    }
  }

  private async fetchAnnouncements(catalogId: number): Promise<{
    success: boolean;
    data?: BinanceAnnouncement[];
    error?: string;
  }> {
    try {
      const url = `${this.apiUrl}?type=1&pageNo=1&pageSize=20&catalogId=${catalogId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          Referer: `https://www.binance.com/en/support/announcement/list/${catalogId}`,
          "Sec-Ch-Ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "bnc-location": "",
          "bnc-time-zone": "Asia/Seoul",
          clienttype: "web",
          lang: "en",
          "x-host": "www.binance.com",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as BinanceApiResponse;

      if (result.code !== "000000" || !result.success) {
        throw new Error(`API error: ${result.message || "Unknown error"}`);
      }

      const catalog = result.data.catalogs.find(
        (c) => c.catalogId === catalogId
      );

      return {
        success: true,
        data: catalog?.articles || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseAnnouncements(
    announcements: BinanceAnnouncement[],
    defaultType: "listing" | "delisting" | "announcement"
  ): NewsItem[] {
    return announcements.map((announcement) => {
      const publishedAt = new Date(announcement.releaseDate);
      const coinSymbol = this.extractCoinSymbol(announcement.title);
      const type = defaultType || this.categorizeNews(announcement.title);
      const originalUrl = `https://www.binance.com/en/support/announcement/${announcement.code}`;

      return {
        title: announcement.title,
        content: announcement.title, // body가 없으므로 제목을 content로 사용
        exchange: this.name,
        type,
        coinSymbol,
        originalUrl,
        publishedAt,
      };
    });
  }

  parseDate(dateString: string): Date {
    // Binance uses Unix timestamp
    const timestamp = parseInt(dateString);
    return new Date(timestamp);
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
