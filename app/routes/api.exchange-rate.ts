import type { LoaderFunctionArgs } from "react-router";
import * as cheerio from "cheerio";
// @ts-ignore
import { getCache, setCache } from "../core/redisCache";

// 환율 크롤링 함수
const crawlExchangeRate = async () => {
  try {
    const url =
      "https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW";

    // 웹페이지 요청
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Cheerio로 HTML 파싱
    const $ = cheerio.load(html);

    // 환율 정보 추출
    const rateText = $(".no_today").text().trim();

    // 환율 변동 아이콘 확인 - no_exday 안의 ico 요소만 찾기
    const changeIcon = $(".no_exday .ico");
    let changeSign = "";
    if (changeIcon.length > 0) {
      const iconClass = changeIcon.attr("class") || "";
      if (iconClass.includes("up")) {
        changeSign = "▲";
      } else if (iconClass.includes("down")) {
        changeSign = "▼";
      }
    }

    // 변동값과 퍼센트 개별 추출
    const changeValueElement = $(".no_exday em.no_up").first();
    const changePercentElement = $(".no_exday em.no_up").last();

    let changeValue = "";
    let changePercent = "";

    if (changeValueElement.length > 0) {
      changeValue = changeValueElement.text().trim();
    }

    if (changePercentElement.length > 0) {
      changePercent = changePercentElement.text().trim();
    }

    // cleanChangeText 조합
    let cleanChangeText = "";
    if (changeValue && changePercent) {
      cleanChangeText = `${changeValue} ${changePercent}`;
    }

    // 숫자만 추출 (쉼표 제거)
    const rate = parseFloat(rateText.replace(/,/g, ""));

    return {
      currency: "USD",
      rate: rate,
      changeText: changeSign + cleanChangeText,
      timestamp: Date.now(),
      formattedRate: rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 }),
    };
  } catch (error) {
    console.error("Exchange rate crawling error:", error);
    throw error;
  }
};

// GET 요청 핸들러
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const cacheKey = "exchange-rate:USD-KRW";

    // 캐시된 데이터 확인 (10초 유효)
    const cached = await getCache<{ data: any; timestamp: number }>(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return Response.json({
        ...cached.data,
        cached: true,
        cacheAge: Date.now() - cached.timestamp,
      });
    }

    // 캐시 만료 시 크롤링
    const data = await crawlExchangeRate();

    // Redis 캐시에 저장
    await setCache(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return Response.json({
      ...data,
      cached: false,
    });
  } catch (error) {
    console.error("Exchange rate API error:", error);
    return Response.json(
      {
        error: "Failed to fetch exchange rate",
        currency: "USD",
        rate: null,
        changeText: "N/A",
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
