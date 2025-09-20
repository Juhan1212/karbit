// update-KRW-USDT.js
import fetch from "node-fetch";
import { setCache } from "./app/core/redisCache.js";

async function updateLoop() {
  while (true) {
    try {
      const response = await fetch(
        "https://api.upbit.com/v1/ticker?markets=KRW-USDT"
      );
      if (response.ok) {
        const data = await response.json();
        console.log("[update-KRW-USDT] Upbit API cache updated:", data);
        await setCache(
          "upbit:KRW-USDT",
          {
            data,
            timestamp: Date.now(),
          },
          10
        ); // 10초 TTL
      }
    } catch (error) {
      console.error("[update-KRW-USDT] Upbit API cache update error:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

updateLoop();
