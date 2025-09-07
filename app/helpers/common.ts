/**
 * 심볼을 대문자로 변환하는 유틸리티 함수
 */
export const toUppercaseKRWSymbol = (symbol: string): string => {
  if (symbol.startsWith("KRW-")) return symbol;
  return `KRW-${symbol}`;
};
