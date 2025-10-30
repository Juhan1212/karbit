import { create } from "zustand";

export interface DashboardMetrics {
  currentExchangeRate: number | null;
  legalExchangeRate: {
    currency: string;
    rate: number | null;
    changeText: string;
    timestamp: number;
  } | null;
  activePositionCount: number;
  kimchiPremiumData: {
    percentage: number;
    isHigher: boolean;
    description: string;
  };
}

interface DashboardStore {
  // 상태
  currentExchangeRate: number | null;
  legalExchangeRate: {
    currency: string;
    rate: number | null;
    changeText: string;
    timestamp: number;
  } | null;
  activePositionCount: number;
  kimchiPremiumData: {
    percentage: number;
    isHigher: boolean;
    description: string;
  };

  // 액션
  setCurrentExchangeRate: (rate: number | null) => void;
  setLegalExchangeRate: (
    rate: {
      currency: string;
      rate: number | null;
      changeText: string;
      timestamp: number;
    } | null
  ) => void;
  setActivePositionCount: (count: number) => void;
  setKimchiPremiumData: (data: {
    percentage: number;
    isHigher: boolean;
    description: string;
  }) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // 초기 상태
  currentExchangeRate: null,
  legalExchangeRate: null,
  activePositionCount: 0,
  kimchiPremiumData: {
    percentage: 0,
    isHigher: true,
    description: "법정화폐 환율대비",
  },

  // 액션들
  setCurrentExchangeRate: (rate) => set({ currentExchangeRate: rate }),
  setLegalExchangeRate: (rate) => set({ legalExchangeRate: rate }),
  setActivePositionCount: (count) => set({ activePositionCount: count }),
  setKimchiPremiumData: (data) => set({ kimchiPremiumData: data }),
}));
