import { create } from "zustand";

export interface CryptoOption {
  value: string | number;
  label: string;
  icon?: string;
  isPositionTicker?: boolean;
}

interface CryptoOptionsState {
  cryptoOptions: CryptoOption[];
  addCryptoOption: (option: CryptoOption | CryptoOption[]) => void;
  setCryptoOption: (options: CryptoOption[]) => void;
}

export const useCryptoOptionsStore = create<CryptoOptionsState>((set) => ({
  cryptoOptions: [
    {
      value: "BTC",
      label: "BTC/USDT",
      icon: "v1741628302/symbol-bitcoin_nptpiz.png",
    },
    {
      value: "ETH",
      label: "ETH/USDT",
      icon: "v1742519126/eth_pb9fz5.png",
    },
    {
      value: "SOL",
      label: "SOL/USDT",
      icon: "v1742519126/sol_o3fi9o.png",
    },
  ],
  addCryptoOption: (option) =>
    set((state) => {
      const existingValues = new Set(
        state.cryptoOptions.map((opt) => opt.value)
      );
      if (Array.isArray(option)) {
        const newOptions = option.filter(
          (opt) => !existingValues.has(opt.value)
        );
        return {
          cryptoOptions: [...state.cryptoOptions, ...newOptions],
        };
      } else {
        if (existingValues.has(option.value)) {
          return { cryptoOptions: state.cryptoOptions };
        }
        return {
          cryptoOptions: [...state.cryptoOptions, option],
        };
      }
    }),
  setCryptoOption: (options) =>
    set(() => ({
      cryptoOptions: options,
    })),
}));
