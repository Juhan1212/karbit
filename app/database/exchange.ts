import { eq, and } from "drizzle-orm";
import { database } from "~/database/context";
import { userExchanges, exchanges } from "~/database/schema";
import { encrypt, decrypt } from "~/utils/encryption";
import { createExchangeAdapter } from "~/exchanges";
import { KoreanExchangeType } from "~/types/exchange";

export interface ExchangeConnection {
  exchangeName: string;
  apiKey?: string;
  apiSecret?: string;
  isConnected: boolean;
}

export interface ExchangeBalance {
  exchangeName: string;
  type: "domestic" | "overseas";
  currency: "KRW" | "USDT";
  availableBalance: number;
  icon: string;
  error?: string; // 에러 메시지 (선택적)
}

// 사용자의 거래소 연결 상태 조회
export async function getUserExchangeConnections(
  userId: number
): Promise<ExchangeConnection[]> {
  try {
    const db = database();
    // 모든 거래소 목록 조회
    const allExchanges = await db.query.exchanges.findMany();
    // 사용자가 연결한 거래소 목록 조회
    const userConnections = await db.query.userExchanges.findMany({
      where: and(
        eq(userExchanges.userId, userId),
        eq(userExchanges.isActive, true)
      ),
      with: {
        exchange: true,
      },
    });

    // 결과 매핑
    return allExchanges.map((exchange) => {
      const userConnection = userConnections.find(
        (uc) => uc.exchangeId === exchange.id
      );
      return {
        exchangeName: exchange.name,
        apiKey: userConnection?.apiKey
          ? decrypt(userConnection.apiKey)
          : undefined,
        apiSecret: userConnection?.apiSecret
          ? decrypt(userConnection.apiSecret)
          : undefined,
        isConnected: !!userConnection,
      };
    });
  } catch (error) {
    console.error("getUserExchangeConnections error:", error);
    return [];
  }
}
// ...existing code...
// 거래소 연결 정보 저장 (upsert)
export async function saveExchangeConnection(
  userId: number,
  exchangeName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; message: string }> {
  try {
    const db = database();
    // 거래소 정보 조회
    const exchange = await db.query.exchanges.findFirst({
      where: eq(exchanges.name, exchangeName),
    });
    if (!exchange) {
      return { success: false, message: "지원하지 않는 거래소입니다." };
    }

    // 기존 연결 정보 확인
    const existing = await db.query.userExchanges.findFirst({
      where: and(
        eq(userExchanges.userId, userId),
        eq(userExchanges.exchangeId, exchange.id)
      ),
    });

    const encryptedApiKey = encrypt(apiKey);
    const encryptedApiSecret = encrypt(apiSecret);

    if (existing) {
      // 기존 연결 정보가 있으면 갱신
      await db
        .update(userExchanges)
        .set({
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret,
          isActive: true,
          verified: true,
        })
        .where(
          and(
            eq(userExchanges.userId, userId),
            eq(userExchanges.exchangeId, exchange.id)
          )
        );
      return { success: true, message: "거래소 연결 정보가 갱신되었습니다." };
    } else {
      // 없으면 새로 생성
      await db.insert(userExchanges).values({
        userId,
        exchangeId: exchange.id,
        apiKey: encryptedApiKey,
        apiSecret: encryptedApiSecret,
        isActive: true,
        verified: true,
      });
      return { success: true, message: "거래소 연결이 등록되었습니다." };
    }
  } catch (error) {
    console.error("saveExchangeConnection error:", error);
    return {
      success: false,
      message: "거래소 연결 저장 중 오류가 발생했습니다.",
    };
  }
}

// 거래소 연결 해제
export async function disconnectExchange(
  userId: number,
  exchangeName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const db = database();

    // 거래소 정보 조회
    const exchange = await db.query.exchanges.findFirst({
      where: eq(exchanges.name, exchangeName),
    });

    if (!exchange) {
      return { success: false, message: "지원하지 않는 거래소입니다." };
    }

    // 연결 비활성화
    await db
      .update(userExchanges)
      .set({
        isActive: false,
      })
      .where(
        and(
          eq(userExchanges.userId, userId),
          eq(userExchanges.exchangeId, exchange.id)
        )
      );

    return { success: true, message: "거래소 연결이 해제되었습니다." };
  } catch (error) {
    console.error("Disconnect exchange error:", error);
    return { success: false, message: "연결 해제 중 오류가 발생했습니다." };
  }
}

// 암호화된 API 키 복호화 (연결 테스트용)
export async function getDecryptedApiKeys(
  userId: number,
  exchangeName: string
): Promise<{
  apiKey?: string;
  secretKey?: string;
}> {
  try {
    const db = database();

    const connection = await db.query.userExchanges.findFirst({
      where: and(
        eq(userExchanges.userId, userId),
        eq(userExchanges.isActive, true)
      ),
      with: {
        exchange: true,
      },
    });

    if (!connection || connection.exchange.name !== exchangeName) {
      return {};
    }

    const apiKey = connection.apiKey ? decrypt(connection.apiKey) : undefined;
    const secretKey = connection.apiSecret
      ? decrypt(connection.apiSecret)
      : undefined;

    return { apiKey, secretKey };
  } catch (error) {
    console.error("Get decrypted keys error:", error);
    return {};
  }
}

// 사용자의 거래소별 잔액 조회 (Adapter/Facade 패턴)
// ...existing code...

export async function getUserExchangeBalances(
  userId: number
): Promise<ExchangeBalance[]> {
  const db = database();
  // 사용자가 연결한 거래소 목록 조회
  const userConnections = await db.query.userExchanges.findMany({
    where: and(
      eq(userExchanges.userId, userId),
      eq(userExchanges.isActive, true)
    ),
    with: {
      exchange: true,
    },
  });

  // 각 거래소 잔액 병렬 조회 (Adapter/Facade 패턴)
  const balancePromises = userConnections.map(async (connection) => {
    try {
      const credentials = {
        apiKey: connection.apiKey ? decrypt(connection.apiKey) : "",
        apiSecret: connection.apiSecret ? decrypt(connection.apiSecret) : "",
        passphrase:
          connection.exchange.name === KoreanExchangeType.OKX
            ? (connection as any).passphrase || ""
            : undefined,
      };
      const adapter = createExchangeAdapter(
        connection.exchange.name as any,
        credentials
      );
      const balanceResult = await adapter.getBalance();
      const isDomestic =
        connection.exchange.name === KoreanExchangeType.업비트 ||
        connection.exchange.name === KoreanExchangeType.빗썸;

      // for mock test
      if (connection.exchange.name === KoreanExchangeType.바이빗) {
        return {
          exchangeName: connection.exchange.name,
          type: isDomestic ? "domestic" : "overseas",
          currency: isDomestic ? "KRW" : "USDT",
          availableBalance: 1000,
          icon: isDomestic ? "🇰🇷" : "🌏",
        };
      }

      // for mock test
      if (connection.exchange.name === KoreanExchangeType.빗썸) {
        return {
          exchangeName: connection.exchange.name,
          type: isDomestic ? "domestic" : "overseas",
          currency: isDomestic ? "KRW" : "USDT",
          availableBalance: 1000000,
          icon: isDomestic ? "🇰🇷" : "🌏",
        };
      }

      return {
        exchangeName: connection.exchange.name,
        type: isDomestic ? "domestic" : "overseas",
        currency: isDomestic ? "KRW" : "USDT",
        availableBalance: balanceResult.balance,
        icon: isDomestic ? "🇰🇷" : "🌏",
        error: balanceResult.error, // 에러 메시지 포함
      };
    } catch (error) {
      console.error(`${connection.exchange.name} 잔액 조회 오류:`, error);
      const isDomestic =
        connection.exchange.name === KoreanExchangeType.업비트 ||
        connection.exchange.name === KoreanExchangeType.빗썸;
      return {
        exchangeName: connection.exchange.name,
        type: isDomestic ? "domestic" : "overseas",
        currency: isDomestic ? "KRW" : "USDT",
        availableBalance: 0,
        icon: isDomestic ? "🇰🇷" : "🌏",
        error: "잔액 조회 중 오류가 발생했습니다", // catch 블록 에러 메시지
      };
    }
  });
  const balances = (await Promise.all(balancePromises)).filter(
    Boolean
  ) as ExchangeBalance[];

  // isDomestic 기준으로 정렬 (국내 거래소 먼저, 해외 거래소 나중에)
  return balances.sort((a, b) => {
    if (a.type === "domestic" && b.type === "overseas") return -1;
    if (a.type === "overseas" && b.type === "domestic") return 1;
    return 0;
  });
}

// 사용자의 특정 거래소 인증 정보 조회
export async function getUserExchangeCredentials(
  userId: number,
  exchangeName: KoreanExchangeType
): Promise<{ apiKey: string; apiSecret: string } | null> {
  try {
    const db = database();

    // 거래소 이름으로 거래소 ID 조회
    const exchange = await db.query.exchanges.findFirst({
      where: eq(exchanges.name, exchangeName),
    });

    if (!exchange) {
      console.error(`거래소 '${exchangeName}'을 찾을 수 없습니다.`);
      return null;
    }

    // 사용자의 해당 거래소 인증 정보 조회
    const userExchange = await db.query.userExchanges.findFirst({
      where: and(
        eq(userExchanges.userId, userId),
        eq(userExchanges.exchangeId, exchange.id),
        eq(userExchanges.isActive, true)
      ),
    });

    if (!userExchange || !userExchange.apiKey || !userExchange.apiSecret) {
      console.error(
        `사용자 ${userId}의 거래소 '${exchangeName}' 인증 정보를 찾을 수 없습니다.`
      );
      return null;
    }

    // 암호화된 키들을 복호화
    const apiKey = decrypt(userExchange.apiKey);
    const apiSecret = decrypt(userExchange.apiSecret);

    return { apiKey, apiSecret };
  } catch (error) {
    console.error("거래소 인증 정보 조회 오류:", error);
    return null;
  }
}
// ...existing code...
