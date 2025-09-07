import { BybitAdapter } from "../app/exchanges/bybit";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

/**
 * Bybit API E2E 테스트
 * 실제 Bybit API를 사용하여 placeOrder 메소드를 테스트합니다.
 *
 * 주의: 이 테스트는 실제 API를 호출하므로 소량의 금액으로만 테스트하세요.
 * 테스트넷이 아닌 메인넷에서 실행되므로 주의가 필요합니다.
 */

describe("Bybit API E2E Tests", () => {
  let bybitAdapter: BybitAdapter;

  beforeAll(() => {
    const apiKey = process.env.BYBIT_API_KEY;
    const secretKey = process.env.BYBIT_SECRET_KEY;

    if (!apiKey || !secretKey) {
      throw new Error(`
        환경변수에 BYBIT_API_KEY 또는 BYBIT_SECRET_KEY가 설정되지 않았습니다.
        .env 파일에 다음과 같이 설정해주세요:
        BYBIT_API_KEY=your_api_key_here
        BYBIT_SECRET_KEY=your_secret_key_here
      `);
    }

    bybitAdapter = new BybitAdapter(apiKey, secretKey);
  });

  describe("주문 실행 테스트", () => {
    it("should place a market buy order successfully", async () => {
      console.log("🚀 Bybit placeOrder E2E 테스트 시작");
      console.log("⚠️  실제 거래가 실행됩니다!");

      // 테스트 파라미터 설정
      const testParams = {
        symbol: "AAVE",
        type: "market" as const,
        side: "buy" as const,
        amount: "0", // 1 USDT로 테스트 (최소 금액)
      };

      console.log("📋 테스트 파라미터:", testParams);

      // placeOrder 메소드 실행
      console.log("🔄 주문 실행 중...");
      const orderId = await bybitAdapter.placeOrder(testParams);

      console.log("✅ 주문 성공!");
      console.log("📦 주문 ID:", orderId);

      // 주문 ID가 문자열로 반환되는지 확인
      expect(typeof orderId).toBe("string");
      expect(orderId).toBeTruthy();
      expect(orderId.length).toBeGreaterThan(0);
    }, 60000); // 60초 타임아웃
  });
});
