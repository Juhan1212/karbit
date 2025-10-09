import { NewsItem } from "../database/news";

export interface CrawlerResult {
  success: boolean;
  newsItems: NewsItem[];
  error?: string;
  totalCount: number;
}

export interface CrawlerInterface {
  name: string;
  crawl(): Promise<CrawlerResult>;
  parseDate(dateString: string): Date;
  extractCoinSymbol(title: string): string | undefined;
  categorizeNews(
    title: string,
    content?: string
  ): "listing" | "delisting" | "announcement";
}

/**
 * HTML에서 텍스트 추출 (간단한 태그 제거)
 */
export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ") // HTML 태그 제거
    .replace(/\s+/g, " ") // 연속된 공백을 하나로
    .trim();
}

/**
 * 뉴스 제목에서 코인 심볼 추출
 */
export function extractCoinSymbol(title: string): string | undefined {
  // 일반적인 코인 심볼 패턴 매칭
  const patterns = [
    /([A-Z]{2,10})\s*코인/,
    /([A-Z]{2,10})\s*상장/,
    /([A-Z]{2,10})\s*거래/,
    /\(([A-Z]{2,10})\)/,
    /([A-Z]{2,10})\s*\(/,
    /KRW-([A-Z]{2,10})/,
    /USDT-([A-Z]{2,10})/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const symbol = match[1].toUpperCase();
      // 일반적이지 않은 단어들 제외
      if (
        !["KRW", "USDT", "USD", "BTC", "ETH", "NEW", "COIN", "TRADE"].includes(
          symbol
        )
      ) {
        return symbol;
      }
    }
  }

  return undefined;
}

/**
 * 뉴스 분류 (상장/폐지/일반 공지)
 */
export function categorizeNews(
  title: string,
  content?: string
): "listing" | "delisting" | "announcement" {
  const text = `${title} ${content || ""}`.toLowerCase();

  // 상장 관련 키워드
  const listingKeywords = [
    "신규상장",
    "신규 상장",
    "상장",
    "listing",
    "신규 거래",
    "거래 시작",
    "거래 개시",
    "마켓 추가",
    "신규 마켓",
    "new trading",
    "trading start",
  ];

  // 폐지 관련 키워드
  const delistingKeywords = [
    "상장폐지",
    "상장 폐지",
    "거래 중단",
    "거래 종료",
    "delisting",
    "거래 지원 종료",
    "서비스 종료",
    "trading stop",
    "end of trading",
    "거래 정지",
  ];

  // 폐지 키워드가 있으면 폐지로 분류
  for (const keyword of delistingKeywords) {
    if (text.includes(keyword)) {
      return "delisting";
    }
  }

  // 상장 키워드가 있으면 상장으로 분류
  for (const keyword of listingKeywords) {
    if (text.includes(keyword)) {
      return "listing";
    }
  }

  return "announcement";
}

/**
 * 한국어 날짜 파싱
 */
export function parseKoreanDate(dateString: string): Date {
  try {
    // "2024.12.14 15:30" 형태 처리
    const koreanDateMatch = dateString.match(
      /(\d{4})\.(\d{1,2})\.(\d{1,2})\s*(\d{1,2}):(\d{1,2})/
    );
    if (koreanDateMatch) {
      const [, year, month, day, hour, minute] = koreanDateMatch;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
    }

    // "2024.12.14" 형태 처리 (시간 없음)
    const koreanDateOnlyMatch = dateString.match(
      /(\d{4})\.(\d{1,2})\.(\d{1,2})$/
    );
    if (koreanDateOnlyMatch) {
      const [, year, month, day] = koreanDateOnlyMatch;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        0, // 시간: 00
        0 // 분: 00
      );
    }

    // "2024-12-14T15:30:00" 형태 처리
    if (dateString.includes("T") || dateString.includes("-")) {
      return new Date(dateString);
    }

    // 상대적 시간 ("1시간 전", "3일 전" 등) 처리
    const relativeMatch = dateString.match(/(\d+)(시간|일|분)\s*전/);
    if (relativeMatch) {
      const [, amount, unit] = relativeMatch;
      const now = new Date();
      const value = parseInt(amount);

      switch (unit) {
        case "분":
          return new Date(now.getTime() - value * 60 * 1000);
        case "시간":
          return new Date(now.getTime() - value * 60 * 60 * 1000);
        case "일":
          return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      }
    }

    // 기본적으로 현재 시간 반환
    return new Date();
  } catch (error) {
    console.error("[News] Date parsing error:", error);
    return new Date();
  }
}

/**
 * 요약 텍스트 생성
 */
export function generateSummary(content: string, maxLength = 200): string {
  const text = extractTextFromHtml(content);
  if (text.length <= maxLength) {
    return text;
  }

  // 문장 단위로 자르기
  const sentences = text.split(/[.!?。]/);
  let summary = "";

  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) {
      break;
    }
    summary += sentence + ". ";
  }

  return summary.trim() || text.substring(0, maxLength) + "...";
}

/**
 * URL 정규화
 */
export function normalizeUrl(url: string, baseUrl?: string): string {
  try {
    if (url.startsWith("http")) {
      return url;
    }

    if (baseUrl && url.startsWith("/")) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }

    return url;
  } catch (error) {
    console.error("[News] URL normalization error:", error);
    return url;
  }
}

/**
 * 크롤링 에러 처리
 */
export function createErrorResult(
  error: any,
  crawlerName: string
): CrawlerResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${crawlerName}] Crawling failed:`, errorMessage);

  return {
    success: false,
    newsItems: [],
    error: errorMessage,
    totalCount: 0,
  };
}

/**
 * 성공 결과 생성
 */
export function createSuccessResult(newsItems: NewsItem[]): CrawlerResult {
  return {
    success: true,
    newsItems,
    totalCount: newsItems.length,
  };
}
