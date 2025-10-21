import { BithumbAdapter } from "../app/exchanges/bithumb";
import dotenv from "dotenv";
dotenv.config();

const API_KEY =
  process.env.BITHUMB_API_KEY ||
  "8da80544a1fffe9d55a2f7f8692323ab31d76c7f9321f9";
const API_SECRET =
  process.env.BITHUMB_API_SECRET ||
  "ZTM1ZmQzZDcyODAwOWZkZTAyNGRhZmZmZmI5ZDI2ZDJmMWZhNjQyMjJhYWIzOWRiNjE3ZTk4MjRmYjBiNA==";
const TEST_SYMBOL = "F"; // 실제 주문 테스트 시 변경 필요
const TEST_ORDER_ID =
  process.env.BITHUMB_TEST_ORDER_ID || "C0993000000068991425"; // 실제 주문 UUID 필요

describe("BithumbAdapter getOrder E2E", () => {
  let adapter: BithumbAdapter;

  beforeAll(() => {
    if (!API_KEY || !API_SECRET) {
      throw new Error("BITHUMB_API_KEY, BITHUMB_API_SECRET 환경변수 필요");
    }
    adapter = new BithumbAdapter(API_KEY, API_SECRET);
  });

  it("should fetch order info for a valid orderId", async () => {
    if (!TEST_ORDER_ID) {
      console.warn("실제 주문 UUID(BITHUMB_TEST_ORDER_ID)가 필요합니다.");
      return;
    }
    const order = await adapter.getOrder(TEST_ORDER_ID, TEST_SYMBOL);
    console.log(order);
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("symbol");
    expect(order).toHaveProperty("amount");
    expect(order).toHaveProperty("price");
    expect(order).toHaveProperty("filled");
    expect(order).toHaveProperty("fee");
    expect(order).toHaveProperty("timestamp");
    expect(order.symbol).toBe(TEST_SYMBOL);
    expect(order.id).toBe(TEST_ORDER_ID);
  });

  it("should throw error for invalid orderId", async () => {
    await expect(
      adapter.getOrder("invalid-order-id", TEST_SYMBOL)
    ).rejects.toThrow();
  });
});
