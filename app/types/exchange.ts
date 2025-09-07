/**
 * 거래소 관련 공통 타입 정의
 * 모든 거래소 관련 타입은 이 파일에서 집중 관리합니다.
 */

// 영어 대문자 거래소 타입 (차트, API 등에서 사용)
export const UppercaseExchangeType = {
  BINANCE: "BINANCE",
  BYBIT: "BYBIT",
  BINGX: "BINGX",
  BITGET: "BITGET",
  GATEIO: "GATEIO",
  OKX: "OKX",
  UPBIT: "UPBIT",
  BITHUMB: "BITHUMB",
} as const;
export type UppercaseExchangeType =
  (typeof UppercaseExchangeType)[keyof typeof UppercaseExchangeType];

// 영어 소문자 거래소 타입 (WebSocket 등에서 사용)
export const LowercaseExchangeType = {
  upbit: "upbit",
  binance: "binance",
  bybit: "bybit",
  okx: "okx",
  bithumb: "bithumb",
} as const;
export type LowercaseExchangeType =
  (typeof LowercaseExchangeType)[keyof typeof LowercaseExchangeType];

// 한국어 거래소 타입 (UI 표시용)
export const KoreanExchangeType = {
  업비트: "업비트",
  빗썸: "빗썸",
  바이낸스: "바이낸스",
  바이빗: "바이빗",
  OKX: "OKX",
} as const;
export type KoreanExchangeType =
  (typeof KoreanExchangeType)[keyof typeof KoreanExchangeType];

// 거래소 타입 간 변환 유틸리티
export const ExchangeTypeConverter = {
  // 영어 대문자 → 소문자 변환
  fromUppercaseToLowercase: (
    exchange: UppercaseExchangeType
  ): LowercaseExchangeType => {
    const mapping: Record<UppercaseExchangeType, LowercaseExchangeType> = {
      [UppercaseExchangeType.UPBIT]: LowercaseExchangeType.upbit,
      [UppercaseExchangeType.BINANCE]: LowercaseExchangeType.binance,
      [UppercaseExchangeType.BYBIT]: LowercaseExchangeType.bybit,
      [UppercaseExchangeType.OKX]: LowercaseExchangeType.okx,
      [UppercaseExchangeType.BITHUMB]: LowercaseExchangeType.bithumb,
      [UppercaseExchangeType.BINGX]: LowercaseExchangeType.binance, // fallback
      [UppercaseExchangeType.BITGET]: LowercaseExchangeType.binance, // fallback
      [UppercaseExchangeType.GATEIO]: LowercaseExchangeType.binance, // fallback
    };
    return mapping[exchange];
  },

  // 영어 대문자 → 한국어 변환
  fromUppercaseToKorean: (
    exchange: UppercaseExchangeType
  ): KoreanExchangeType => {
    const mapping: Record<UppercaseExchangeType, KoreanExchangeType> = {
      [UppercaseExchangeType.UPBIT]: KoreanExchangeType.업비트,
      [UppercaseExchangeType.BINANCE]: KoreanExchangeType.바이낸스,
      [UppercaseExchangeType.BYBIT]: KoreanExchangeType.바이빗,
      [UppercaseExchangeType.OKX]: KoreanExchangeType.OKX,
      [UppercaseExchangeType.BITHUMB]: KoreanExchangeType.빗썸,
      [UppercaseExchangeType.BINGX]: KoreanExchangeType.바이낸스, // fallback
      [UppercaseExchangeType.BITGET]: KoreanExchangeType.바이낸스, // fallback
      [UppercaseExchangeType.GATEIO]: KoreanExchangeType.바이낸스, // fallback
    };
    return mapping[exchange];
  },

  // 한국어 → 영어 대문자 변환
  fromKoreanToUppercase: (
    exchange: KoreanExchangeType
  ): UppercaseExchangeType => {
    const mapping: Record<KoreanExchangeType, UppercaseExchangeType> = {
      [KoreanExchangeType.업비트]: UppercaseExchangeType.UPBIT,
      [KoreanExchangeType.바이낸스]: UppercaseExchangeType.BINANCE,
      [KoreanExchangeType.바이빗]: UppercaseExchangeType.BYBIT,
      [KoreanExchangeType.OKX]: UppercaseExchangeType.OKX,
      [KoreanExchangeType.빗썸]: UppercaseExchangeType.BITHUMB,
    };
    return mapping[exchange];
  },

  // 소문자 → 영어 대문자 변환
  fromLowercaseToUppercase: (
    exchange: LowercaseExchangeType
  ): UppercaseExchangeType => {
    const mapping: Record<LowercaseExchangeType, UppercaseExchangeType> = {
      [LowercaseExchangeType.upbit]: UppercaseExchangeType.UPBIT,
      [LowercaseExchangeType.binance]: UppercaseExchangeType.BINANCE,
      [LowercaseExchangeType.bybit]: UppercaseExchangeType.BYBIT,
      [LowercaseExchangeType.okx]: UppercaseExchangeType.OKX,
      [LowercaseExchangeType.bithumb]: UppercaseExchangeType.BITHUMB,
    };
    return mapping[exchange];
  },
};

// 거래소별 추가 정보
export interface ExchangeInfo {
  id: UppercaseExchangeType;
  name: KoreanExchangeType;
  websocketName: LowercaseExchangeType;
  isKorean: boolean;
  isForeign: boolean;
}

export const ExchangeInfoMap: Record<UppercaseExchangeType, ExchangeInfo> = {
  [UppercaseExchangeType.UPBIT]: {
    id: UppercaseExchangeType.UPBIT,
    name: KoreanExchangeType.업비트,
    websocketName: LowercaseExchangeType.upbit,
    isKorean: true,
    isForeign: false,
  },
  [UppercaseExchangeType.BITHUMB]: {
    id: UppercaseExchangeType.BITHUMB,
    name: KoreanExchangeType.빗썸,
    websocketName: LowercaseExchangeType.bithumb,
    isKorean: true,
    isForeign: false,
  },
  [UppercaseExchangeType.BINANCE]: {
    id: UppercaseExchangeType.BINANCE,
    name: KoreanExchangeType.바이낸스,
    websocketName: LowercaseExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [UppercaseExchangeType.BYBIT]: {
    id: UppercaseExchangeType.BYBIT,
    name: KoreanExchangeType.바이빗,
    websocketName: LowercaseExchangeType.bybit,
    isKorean: false,
    isForeign: true,
  },
  [UppercaseExchangeType.OKX]: {
    id: UppercaseExchangeType.OKX,
    name: KoreanExchangeType.OKX,
    websocketName: LowercaseExchangeType.okx,
    isKorean: false,
    isForeign: true,
  },
  [UppercaseExchangeType.BINGX]: {
    id: UppercaseExchangeType.BINGX,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: LowercaseExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [UppercaseExchangeType.BITGET]: {
    id: UppercaseExchangeType.BITGET,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: LowercaseExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [UppercaseExchangeType.GATEIO]: {
    id: UppercaseExchangeType.GATEIO,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: LowercaseExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
};

// 하위 호환성을 위한 별칭 (점진적 마이그레이션용)
/** @deprecated Use UppercaseExchangeType instead */
export const ExchangeType = UppercaseExchangeType;
/** @deprecated Use UppercaseExchangeType instead */
export type ExchangeType = UppercaseExchangeType;

/** @deprecated Use LowercaseExchangeType instead */
export const WebSocketExchangeType = LowercaseExchangeType;
/** @deprecated Use LowercaseExchangeType instead */
export type WebSocketExchangeType = LowercaseExchangeType;
