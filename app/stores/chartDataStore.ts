import { create } from "zustand";

interface ChartDataState {
  tetherPrice: number | null;
  exchangeRate: number | null;
  setTetherPrice: (price: number) => void;
  setExchangeRate: (rate: number) => void;
  updateChartData: (data: {
    tetherPrice: number;
    exchangeRate: number;
  }) => void;
}

export const useChartDataStore = create<ChartDataState>((set) => ({
  tetherPrice: null,
  exchangeRate: null,
  setTetherPrice: (price) => set({ tetherPrice: price }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  updateChartData: (data) =>
    set({ tetherPrice: data.tetherPrice, exchangeRate: data.exchangeRate }),
}));
