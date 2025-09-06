import { create } from "zustand";
import type { SeriesMarker, Time } from "lightweight-charts";
import { getBrowserTimezoneOffset } from "../helpers/time";

interface MarkerStore {
  markers: SeriesMarker<Time>[];
  setMarkers: (newMarkers: SeriesMarker<Time>[]) => void;
  clearMarkers: () => void;
  createMarkersFromTrades: (
    trades: {
      time: Date;
      closeTime: Date;
      side: "buy" | "sell";
      leverage: number | null;
      entryPrice: string;
      exitPrice: string;
      pnl: string;
      result: string;
    }[]
  ) => SeriesMarker<Time>[];
}

export const useMarkerStore = create<MarkerStore>((set) => ({
  markers: [],
  setMarkers: (newMarkers) => set({ markers: newMarkers }),
  clearMarkers: () => set({ markers: [] }),
  createMarkersFromTrades: (trades) => {
    const timeValue = (time: number | Date) =>
      typeof time === "number" ? time : new Date(time).getTime() / 1000;

    const adjustedTime = (time: number | Date) =>
      (timeValue(time) + getBrowserTimezoneOffset() * 60 * 60) as Time;

    const markers = trades.map(
      (trade) =>
        ({
          time: adjustedTime(trade.time),
          closeTime: adjustedTime(trade.closeTime),
          position: trade.side === "buy" ? "belowBar" : "aboveBar",
          color: trade.side === "buy" ? "#22AB94" : "#F7525F",
          shape: trade.side === "buy" ? "arrowUp" : "arrowDown",
          text: trade.side === "buy" ? "LONG" : "SHORT",
        }) as SeriesMarker<Time>
    );

    set({ markers });
    return markers;
  },
}));
