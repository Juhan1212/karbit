/**
 * JavaScript 부동소수점 연산 문제를 해결하기 위한 정밀한 계산 유틸리티
 * 암호화폐 거래에서 필요한 정확한 수치 계산을 위해 사용
 */

/**
 * 부동소수점 숫자를 정수로 변환하여 연산 후 다시 부동소수점으로 변환
 * @param num 변환할 숫자
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
function toFixed(num: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * 정확한 덧셈 연산
 * @param a 첫 번째 수
 * @param b 두 번째 수
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseAdd(a: number, b: number, decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  return (Math.round(a * factor) + Math.round(b * factor)) / factor;
}

/**
 * 정확한 뺄셈 연산
 * @param a 피감수
 * @param b 감수
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseSubtract(
  a: number,
  b: number,
  decimals: number = 8
): number {
  const factor = Math.pow(10, decimals);
  return (Math.round(a * factor) - Math.round(b * factor)) / factor;
}

/**
 * 정확한 곱셈 연산
 * @param a 첫 번째 수
 * @param b 두 번째 수
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseMultiply(
  a: number,
  b: number,
  decimals: number = 8
): number {
  const factor = Math.pow(10, decimals);
  return Math.round(a * b * factor) / factor;
}

/**
 * 정확한 나눗셈 연산
 * @param a 피제수
 * @param b 제수
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseDivide(
  a: number,
  b: number,
  decimals: number = 8
): number {
  if (b === 0) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((a / b) * factor) / factor;
}

/**
 * 여러 숫자의 정확한 합계 계산
 * @param numbers 합계를 구할 숫자 배열
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseSum(numbers: number[], decimals: number = 8): number {
  const factor = Math.pow(10, decimals);
  const sum = numbers.reduce((acc, num) => acc + Math.round(num * factor), 0);
  return sum / factor;
}

/**
 * 가중평균 계산 (암호화폐 평균 진입 가격 계산용)
 * @param values 값들의 배열
 * @param weights 가중치들의 배열
 * @param decimals 소수점 자릿수 (기본값: 8)
 */
export function preciseWeightedAverage(
  values: number[],
  weights: number[],
  decimals: number = 8
): number {
  if (values.length !== weights.length || values.length === 0) {
    return 0;
  }

  const factor = Math.pow(10, decimals);

  // 가중합 계산
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < values.length; i++) {
    const weightedValue = Math.round(values[i] * weights[i] * factor);
    const weight = Math.round(weights[i] * factor);

    weightedSum += weightedValue / factor; // 이미 factor로 정규화된 값
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.round((weightedSum / (totalWeight / factor)) * factor) / factor;
}

/**
 * 수익률 계산 (정확한 백분율 계산)
 * @param entry 진입가
 * @param exit 청산가
 * @param decimals 소수점 자릿수 (기본값: 2)
 */
export function preciseProfitRate(
  entry: number,
  exit: number,
  decimals: number = 2
): number {
  if (entry === 0) return 0;
  const profitRate = ((exit - entry) / entry) * 100;
  return toFixed(profitRate, decimals);
}

/**
 * 데이터베이스 numeric 값을 안전하게 숫자로 변환
 * @param value 변환할 값 (string | number | null | undefined)
 * @param defaultValue 기본값 (기본값: 0)
 */
export function safeNumeric(
  value: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined) return defaultValue;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? defaultValue : num;
}

/**
 * 암호화폐 거래용 정밀도 상수
 */
export const CRYPTO_DECIMALS = {
  PRICE: 8, // 가격 (precision: 18, scale: 8)
  VOLUME: 8, // 수량 (precision: 18, scale: 8)
  FUNDS: 8, // 자금 (precision: 18, scale: 8)
  FEE: 8, // 수수료 (precision: 18, scale: 8)
  RATE: 2, // 비율 (precision: 10, scale: 2)
  PROFIT: 2, // 수익 (precision: 18, scale: 2)
  USDT_PRICE: 2, // USDT 가격 (precision: 10, scale: 2)
} as const;
