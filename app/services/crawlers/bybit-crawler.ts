import fetch from "node-fetch";
import { NewsItem } from "../../database/news";
import {
  CrawlerInterface,
  CrawlerResult,
  extractCoinSymbol,
  categorizeNews,
  createErrorResult,
  createSuccessResult,
} from "../../utils/news-crawler-utils";

interface BybitAnnouncement {
  title: string;
  description: string;
  category: {
    title: string;
    key: string;
  };
  topics: string[];
  date_timestamp: number;
  start_date_timestamp: number;
  end_date_timestamp: number;
  thumbnail_url: string;
  url: string;
  is_old_url: boolean;
  is_top: boolean;
  highlights: string;
  publish_time: number;
  objectID: string;
  _highlightResult: {
    title: {
      value: string;
      matchLevel: string;
      matchedWords: string[];
    };
  };
}

interface BybitApiResponse {
  ret_code: number;
  ret_msg: string;
  result: {
    hits: BybitAnnouncement[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
    exhaustiveNbHits: boolean;
    exhaustiveTypo: boolean;
    exhaustive: {
      nbHits: boolean;
      typo: boolean;
    };
    query: string;
    params: string;
    processingTimeMS: number;
    processingTimingsMS: {
      _request: {
        roundTrip: number;
      };
      total: number;
    };
  };
}

export class BybitCrawler implements CrawlerInterface {
  name = "Bybit";
  private apiUrl =
    "https://announcements.bybit.com/x-api/announcements/api/search/v1/index/announcement-posts_en";

  async crawl(): Promise<CrawlerResult> {
    try {
      console.log(`[${this.name}] Starting crawl...`);

      // 1. 신규상장
      const listingRes = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json;charset=UTF-8",
          Origin: "https://announcements.bybit.com",
          Pragma: "no-cache",
          Referer: "https://announcements.bybit.com/?page=1",
          "Sec-Ch-Ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        body: JSON.stringify({
          query: "",
          hitsPerPage: 20,
          page: 0,
          filters: "category.key: 'new_crypto'",
        }),
      });
      if (!listingRes.ok) {
        throw new Error(`HTTP error! status: ${listingRes.status}`);
      }
      const listingResult = (await listingRes.json()) as BybitApiResponse;
      if (listingResult.ret_code !== 0) {
        throw new Error(`API error: ${listingResult.ret_msg}`);
      }
      const listingItems = this.parseAnnouncements(
        listingResult.result.hits,
        "listing"
      );

      // 2. 상장폐지
      const delistingRes = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json;charset=UTF-8",
          Origin: "https://announcements.bybit.com",
          Pragma: "no-cache",
          Referer: "https://announcements.bybit.com/?page=1",
          "Sec-Ch-Ua":
            '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"macOS"',
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        body: JSON.stringify({
          query: "",
          hitsPerPage: 20,
          page: 0,
          filters: "category.key: 'delistings'",
        }),
      });
      if (!delistingRes.ok) {
        throw new Error(`HTTP error! status: ${delistingRes.status}`);
      }
      const delistingResult = (await delistingRes.json()) as BybitApiResponse;
      if (delistingResult.ret_code !== 0) {
        throw new Error(`API error: ${delistingResult.ret_msg}`);
      }
      const delistingItems = this.parseAnnouncements(
        delistingResult.result.hits,
        "delisting"
      );

      const newsItems = [...listingItems, ...delistingItems];
      console.log(`[${this.name}] Crawled ${newsItems.length} items`);
      return createSuccessResult(newsItems);
    } catch (error) {
      return createErrorResult(error, this.name);
    }
  }

  private parseAnnouncements(
    announcements: BybitAnnouncement[],
    forcedType?: "listing" | "delisting"
  ): NewsItem[] {
    return announcements.map((announcement) => {
      const publishedAt = new Date(announcement.publish_time * 1000);
      const coinSymbol = this.extractCoinSymbol(announcement.title);
      const type =
        forcedType ||
        this.categorizeNews(announcement.title, announcement.description);
      const originalUrl = announcement.url.startsWith("http")
        ? announcement.url
        : `https://announcements.bybit.com${announcement.url}`;
      return {
        title: announcement.title,
        content: announcement.description,
        exchange: this.name,
        type,
        coinSymbol,
        originalUrl,
        publishedAt,
      };
    });
  }

  parseDate(dateString: string): Date {
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
