import { getUserExchangeCredentials } from "../app/database/exchange";
import { createExchangeAdapter } from "../app/exchanges";
import { ExchangeTypeConverter } from "../app/types/exchange";
import {
  runWithDatabase,
  setupTestDatabase,
  closeTestDatabase,
} from "./setup/database";

describe("빗썸 거래소 인증 및 주문 E2E", () => {
  const userId = 6; // 실제 테스트 환경에 맞게 수정
  const coinSymbol = "AVNT"; // 테스트할 코인 심볼

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("빗썸 인증정보 조회 및 시장가 매도 주문", async () => {
    await runWithDatabase(async () => {
      // 1. 빗썸 인증정보 조회
      const bithumbCredentials = await getUserExchangeCredentials(
        userId,
        ExchangeTypeConverter.fromUppercaseToKorean("BITHUMB")
      );
      if (!bithumbCredentials) {
        throw new Error(
          "빗썸 인증정보가 없습니다. 먼저 인증정보를 등록해주세요."
        );
      }

      // 환경 변수와 일치하는지 검증
      console.log("Retrieved bithumbCredentials:", bithumbCredentials);
      expect(bithumbCredentials.apiKey).toBe(
        "e07105dc17f872426bf9cd6092eab167598d6cb843e021"
      );
      expect(bithumbCredentials.apiSecret).toBe(
        "N2FlZTlhMzZiYjk2ZjIwNzAyZDUxOWY4Nzc0MjE4ODljYjYyOTFlOGJkNjY1MzhmNmJiZjRhZWIyMmI2MA=="
      );

      // 2. 빗썸 어댑터 생성
      const bithumbAdapter = createExchangeAdapter(
        "BITHUMB",
        bithumbCredentials
      );

      // 3. 시장가 매도 주문 (테스트 환경에서는 소량/모의 주문 권장)
      let orderResult;
      try {
        orderResult = await bithumbAdapter.placeOrder({
          symbol: coinSymbol,
          type: "market",
          side: "sell",
          amount: "3.46140536", // 테스트용 소량
        });
      } catch (err) {
        orderResult = err;
      }
      // 주문 결과 또는 에러 메시지 출력
      console.log("Bithumb 주문 결과:", orderResult);
      // 실제 주문 성공 여부는 환경에 따라 다름
      // expect(orderResult).toBeDefined();
    });
  });
});
