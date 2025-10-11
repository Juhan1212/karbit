/**
 * 날짜/시간 관련 유틸리티 함수
 */

/**
 * 주어진 날짜를 상대 시간으로 변환합니다.
 * @param date - 변환할 날짜 (Date 객체 또는 문자열)
 * @returns 상대 시간 문자열 (예: "방금 전", "5분 전", "2시간 전")
 *
 * @example
 * getRelativeTime(new Date()) // "방금 전"
 * getRelativeTime(new Date(Date.now() - 3600000)) // "1시간 전"
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "방금 전";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    // 1주일 이상이면 날짜 형식으로 표시
    const year = postDate.getFullYear();
    const month = String(postDate.getMonth() + 1).padStart(2, "0");
    const day = String(postDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷합니다.
 * @param date - 포맷할 날짜
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 YYYY-MM-DD HH:mm:ss 형식으로 포맷합니다.
 * @param date - 포맷할 날짜
 * @returns YYYY-MM-DD HH:mm:ss 형식의 문자열
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
