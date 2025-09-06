/**
 * 거래소 관련 공통 타입 정의
 * 모든 거래소 관련 타입은 이 파일에서 집중 관리합니다.
 */

// 영어 대문자 거래소 타입 (차트, API 등에서 사용)
export const ExchangeType = {
  BINANCE: "BINANCE",
  BYBIT: "BYBIT",
  BINGX: "BINGX",
  BITGET: "BITGET",
  GATEIO: "GATEIO",
  OKX: "OKX",
  UPBIT: "UPBIT",
  BITHUMB: "BITHUMB",
} as const;
export type ExchangeType = (typeof ExchangeType)[keyof typeof ExchangeType];

// 영어 소문자 거래소 타입 (WebSocket 등에서 사용)
export const WebSocketExchangeType = {
  upbit: "upbit",
  binance: "binance",
  bybit: "bybit",
  okx: "okx",
  bithumb: "bithumb",
} as const;
export type WebSocketExchangeType =
  (typeof WebSocketExchangeType)[keyof typeof WebSocketExchangeType];

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
  fromUppercaseToLowercase: (exchange: ExchangeType): WebSocketExchangeType => {
    const mapping: Record<ExchangeType, WebSocketExchangeType> = {
      [ExchangeType.UPBIT]: WebSocketExchangeType.upbit,
      [ExchangeType.BINANCE]: WebSocketExchangeType.binance,
      [ExchangeType.BYBIT]: WebSocketExchangeType.bybit,
      [ExchangeType.OKX]: WebSocketExchangeType.okx,
      [ExchangeType.BITHUMB]: WebSocketExchangeType.bithumb,
      [ExchangeType.BINGX]: WebSocketExchangeType.binance, // fallback
      [ExchangeType.BITGET]: WebSocketExchangeType.binance, // fallback
      [ExchangeType.GATEIO]: WebSocketExchangeType.binance, // fallback
    };
    return mapping[exchange];
  },

  // 영어 대문자 → 한국어 변환
  fromUppercaseToKorean: (exchange: ExchangeType): KoreanExchangeType => {
    const mapping: Record<ExchangeType, KoreanExchangeType> = {
      [ExchangeType.UPBIT]: KoreanExchangeType.업비트,
      [ExchangeType.BINANCE]: KoreanExchangeType.바이낸스,
      [ExchangeType.BYBIT]: KoreanExchangeType.바이빗,
      [ExchangeType.OKX]: KoreanExchangeType.OKX,
      [ExchangeType.BITHUMB]: KoreanExchangeType.빗썸,
      [ExchangeType.BINGX]: KoreanExchangeType.바이낸스, // fallback
      [ExchangeType.BITGET]: KoreanExchangeType.바이낸스, // fallback
      [ExchangeType.GATEIO]: KoreanExchangeType.바이낸스, // fallback
    };
    return mapping[exchange];
  },

  // 한국어 → 영어 대문자 변환
  fromKoreanToUppercase: (exchange: KoreanExchangeType): ExchangeType => {
    const mapping: Record<KoreanExchangeType, ExchangeType> = {
      [KoreanExchangeType.업비트]: ExchangeType.UPBIT,
      [KoreanExchangeType.바이낸스]: ExchangeType.BINANCE,
      [KoreanExchangeType.바이빗]: ExchangeType.BYBIT,
      [KoreanExchangeType.OKX]: ExchangeType.OKX,
      [KoreanExchangeType.빗썸]: ExchangeType.BITHUMB,
    };
    return mapping[exchange];
  },

  // 소문자 → 영어 대문자 변환
  fromLowercaseToUppercase: (exchange: WebSocketExchangeType): ExchangeType => {
    const mapping: Record<WebSocketExchangeType, ExchangeType> = {
      [WebSocketExchangeType.upbit]: ExchangeType.UPBIT,
      [WebSocketExchangeType.binance]: ExchangeType.BINANCE,
      [WebSocketExchangeType.bybit]: ExchangeType.BYBIT,
      [WebSocketExchangeType.okx]: ExchangeType.OKX,
      [WebSocketExchangeType.bithumb]: ExchangeType.BITHUMB,
    };
    return mapping[exchange];
  },
};

// 거래소별 추가 정보
export interface ExchangeInfo {
  id: ExchangeType;
  name: KoreanExchangeType;
  websocketName: WebSocketExchangeType;
  isKorean: boolean;
  isForeign: boolean;
}

export const ExchangeInfoMap: Record<ExchangeType, ExchangeInfo> = {
  [ExchangeType.UPBIT]: {
    id: ExchangeType.UPBIT,
    name: KoreanExchangeType.업비트,
    websocketName: WebSocketExchangeType.upbit,
    isKorean: true,
    isForeign: false,
  },
  [ExchangeType.BITHUMB]: {
    id: ExchangeType.BITHUMB,
    name: KoreanExchangeType.빗썸,
    websocketName: WebSocketExchangeType.bithumb,
    isKorean: true,
    isForeign: false,
  },
  [ExchangeType.BINANCE]: {
    id: ExchangeType.BINANCE,
    name: KoreanExchangeType.바이낸스,
    websocketName: WebSocketExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [ExchangeType.BYBIT]: {
    id: ExchangeType.BYBIT,
    name: KoreanExchangeType.바이빗,
    websocketName: WebSocketExchangeType.bybit,
    isKorean: false,
    isForeign: true,
  },
  [ExchangeType.OKX]: {
    id: ExchangeType.OKX,
    name: KoreanExchangeType.OKX,
    websocketName: WebSocketExchangeType.okx,
    isKorean: false,
    isForeign: true,
  },
  [ExchangeType.BINGX]: {
    id: ExchangeType.BINGX,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: WebSocketExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [ExchangeType.BITGET]: {
    id: ExchangeType.BITGET,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: WebSocketExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
  [ExchangeType.GATEIO]: {
    id: ExchangeType.GATEIO,
    name: KoreanExchangeType.바이낸스, // UI에서는 바이낸스로 표시
    websocketName: WebSocketExchangeType.binance,
    isKorean: false,
    isForeign: true,
  },
};
