/**
 * HTTP 요청에서 쿠키 값을 추출하는 유틸리티 함수들
 */

/**
 * 쿠키 헤더를 파싱하여 객체로 변환
 * @param cookieHeader - "Cookie" 헤더 문자열
 * @returns 쿠키 이름-값 쌍의 객체
 */
export function parseCookies(
  cookieHeader: string | null
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split("; ").map((cookie) => cookie.split("="))
  );
}

/**
 * HTTP 요청에서 인증 토큰을 추출
 * @param request - HTTP 요청 객체
 * @returns 인증 토큰 문자열 또는 null
 */
export function getAuthTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  return cookies["auth-token"] || null;
}

/**
 * HTTP 요청에서 특정 쿠키 값을 추출
 * @param request - HTTP 요청 객체
 * @param cookieName - 추출할 쿠키 이름
 * @returns 쿠키 값 또는 null
 */
export function getCookieFromRequest(
  request: Request,
  cookieName: string
): string | null {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  return cookies[cookieName] || null;
}
