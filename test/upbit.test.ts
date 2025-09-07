import { UpbitAdapter } from "../app/exchanges/upbit";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

/**
 * Upbit API E2E 테스트
 * 실제 Upbit API를 사용하여 getTicker 메소드를 테스트합니다.
 *
 * 주의: 이 테스트는 실제 API를 호출하므로 네트워크 연결이 필요합니다.
 * getTicker는 공개 API이므로 API 키가 필요하지 않습니다.
 */

describe("Upbit API E2E Tests", () => {
  describe("getTicker 메서드 테스트", () => {
    it("should get USDT ticker successfully", async () => {
      console.log("💰 Upbit USDT 티커 조회 테스트 시작");

      try {
        const result = await UpbitAdapter.getTicker("USDT");

        console.log("✅ USDT 티커 조회 성공!");
        console.log("📊 티커 정보:", JSON.stringify(result, null, 2));

        // 결과 검증
        expect(result).toBeDefined();
        expect(result.symbol).toBe("USDT");
        expect(typeof result.price).toBe("number");
        expect(result.price).toBeGreaterThan(0);
        expect(typeof result.timestamp).toBe("number");
        expect(result.timestamp).toBeGreaterThan(0);
      } catch (error) {
        console.error("❌ USDT 티커 조회 실패:", error);
        throw error;
      }
    }, 10000); // 10초 타임아웃

    it("should get BTC ticker successfully", async () => {
      console.log("₿ Upbit BTC 티커 조회 테스트 시작");

      try {
        const result = await UpbitAdapter.getTicker("BTC");

        console.log("✅ BTC 티커 조회 성공!");
        console.log("📊 티커 정보:", JSON.stringify(result, null, 2));

        // 결과 검증
        expect(result).toBeDefined();
        expect(result.symbol).toBe("BTC");
        expect(typeof result.price).toBe("number");
        expect(result.price).toBeGreaterThan(0);
        expect(typeof result.timestamp).toBe("number");
        expect(result.timestamp).toBeGreaterThan(0);
      } catch (error) {
        console.error("❌ BTC 티커 조회 실패:", error);
        throw error;
      }
    }, 10000); // 10초 타임아웃

    it("should get ETH ticker successfully", async () => {
      console.log("⟠ Upbit ETH 티커 조회 테스트 시작");

      try {
        const result = await UpbitAdapter.getTicker("ETH");

        console.log("✅ ETH 티커 조회 성공!");
        console.log("📊 티커 정보:", JSON.stringify(result, null, 2));

        // 결과 검증
        expect(result).toBeDefined();
        expect(result.symbol).toBe("ETH");
        expect(typeof result.price).toBe("number");
        expect(result.price).toBeGreaterThan(0);
        expect(typeof result.timestamp).toBe("number");
        expect(result.timestamp).toBeGreaterThan(0);
      } catch (error) {
        console.error("❌ ETH 티커 조회 실패:", error);
        throw error;
      }
    }, 10000); // 10초 타임아웃
  });

  describe("네트워크 에러 처리 테스트", () => {
    it("should handle invalid symbol gracefully", async () => {
      console.log("🚫 잘못된 심볼로 티커 조회 테스트");

      try {
        await UpbitAdapter.getTicker("INVALID_SYMBOL_THAT_DOES_NOT_EXIST");
        // 여기에 도달하면 안 됨
        fail("잘못된 심볼에 대해 예외가 발생해야 합니다");
      } catch (error) {
        console.log(
          "✅ 예상된 에러 발생:",
          error instanceof Error ? error.message : error
        );
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("연속 호출 테스트", () => {
    it("should handle multiple consecutive calls", async () => {
      console.log("🔄 연속 호출 테스트 시작");

      const promises = [
        UpbitAdapter.getTicker("USDT"),
        UpbitAdapter.getTicker("BTC"),
        UpbitAdapter.getTicker("ETH"),
      ];

      try {
        const results = await Promise.all(promises);

        console.log("✅ 연속 호출 성공!");
        console.log("📊 결과 개수:", results.length);

        expect(results).toHaveLength(3);
        expect(results[0].symbol).toBe("USDT");
        expect(results[1].symbol).toBe("BTC");
        expect(results[2].symbol).toBe("ETH");

        results.forEach((result, index) => {
          expect(result.price).toBeGreaterThan(0);
          expect(result.timestamp).toBeGreaterThan(0);
          console.log(`${index + 1}. ${result.symbol}: ${result.price}원`);
        });
      } catch (error) {
        console.error("❌ 연속 호출 실패:", error);
        throw error;
      }
    }, 15000); // 15초 타임아웃
  });

  describe("EPIPE 에러 재현 테스트", () => {
    it("should handle potential EPIPE errors with retry logic", async () => {
      console.log("🔧 EPIPE 에러 핸들링 테스트");

      // 여러 번 연속으로 호출하여 네트워크 에러 가능성 테스트
      const maxRetries = 3;
      let success = false;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📡 시도 ${attempt}/${maxRetries}...`);
          const result = await UpbitAdapter.getTicker("USDT");

          console.log(`✅ ${attempt}번째 시도 성공!`, result.price);
          success = true;
          break;
        } catch (error) {
          console.warn(
            `⚠️ ${attempt}번째 시도 실패:`,
            error instanceof Error ? error.message : error
          );
          lastError = error;

          if (attempt < maxRetries) {
            // 재시도 전 잠시 대기
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!success) {
        console.error("❌ 모든 재시도 실패:", lastError);
        throw lastError;
      }

      expect(success).toBe(true);
    }, 20000); // 20초 타임아웃
  });
});
