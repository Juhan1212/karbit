import { database } from "./context";
import { telegramAuthTokens, users } from "./schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * 인증 토큰 생성
 */
export async function createTelegramAuthToken(
  userId: number,
  token: string,
  expiresAt: Date
) {
  const db = database();
  // 기존 사용되지 않은 토큰 삭제
  await db
    .delete(telegramAuthTokens)
    .where(
      and(
        eq(telegramAuthTokens.userId, userId),
        eq(telegramAuthTokens.used, false)
      )
    );

  // 새 인증 토큰 생성
  await db.insert(telegramAuthTokens).values({
    userId,
    token,
    expiresAt,
    used: false,
  });

  return { token, expiresAt };
}

/**
 * 유효한 인증 토큰 조회
 */
export async function findValidAuthToken(token: string) {
  const db = database();
  const [tokenRecord] = await db
    .select()
    .from(telegramAuthTokens)
    .where(
      and(
        eq(telegramAuthTokens.token, token),
        eq(telegramAuthTokens.used, false),
        gt(telegramAuthTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return tokenRecord || null;
}

/**
 * 인증 토큰을 사용 처리
 */
export async function markTokenAsUsed(tokenId: number) {
  const db = database();
  await db
    .update(telegramAuthTokens)
    .set({ used: true })
    .where(eq(telegramAuthTokens.id, tokenId));
}

/**
 * 사용자의 텔레그램 연동 상태 조회
 */
export async function getUserTelegramStatus(userId: number) {
  const db = database();
  const [user] = await db
    .select({
      telegramChatId: users.telegramChatId,
      telegramUsername: users.telegramUsername,
      telegramConnectedAt: users.telegramConnectedAt,
      telegramNotificationsEnabled: users.telegramNotificationsEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

/**
 * chat_id로 사용자 정보 조회
 */
export async function getUserByChatId(chatId: string) {
  const db = database();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      telegramNotificationsEnabled: users.telegramNotificationsEnabled,
      totalEntryCount: users.totalEntryCount,
      totalProfitRate: users.totalProfitRate,
    })
    .from(users)
    .where(eq(users.telegramChatId, chatId))
    .limit(1);

  return user || null;
}

/**
 * 사용자의 텔레그램 정보 업데이트 (연동)
 */
export async function connectUserTelegram(
  userId: number,
  chatId: string,
  username?: string
) {
  const db = database();
  await db
    .update(users)
    .set({
      telegramChatId: chatId,
      telegramUsername: username,
      telegramConnectedAt: new Date(),
      telegramNotificationsEnabled: true,
    })
    .where(eq(users.id, userId));
}

/**
 * 사용자의 텔레그램 연동 해제
 */
export async function disconnectUserTelegram(userId: number) {
  const db = database();
  await db
    .update(users)
    .set({
      telegramChatId: null,
      telegramUsername: null,
      telegramConnectedAt: null,
      telegramNotificationsEnabled: false,
    })
    .where(eq(users.id, userId));
}

/**
 * 텔레그램 알림 활성화/비활성화
 */
export async function toggleTelegramNotifications(
  userId: number,
  enabled: boolean
) {
  const db = database();
  await db
    .update(users)
    .set({
      telegramNotificationsEnabled: enabled,
    })
    .where(eq(users.id, userId));
}

/**
 * 알림을 받을 모든 사용자 조회
 */
export async function getAllUsersWithTelegramEnabled() {
  const db = database();
  const usersWithTelegram = await db
    .select({
      id: users.id,
      telegramChatId: users.telegramChatId,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.telegramNotificationsEnabled, true)
        // telegramChatId가 null이 아닌 경우만
      )
    );

  // null이 아닌 chatId만 필터링
  return usersWithTelegram.filter((u) => u.telegramChatId !== null);
}

/**
 * 특정 사용자의 chat_id 조회
 */
export async function getUserChatId(userId: number): Promise<string | null> {
  const db = database();
  const [user] = await db
    .select({
      telegramChatId: users.telegramChatId,
      telegramNotificationsEnabled: users.telegramNotificationsEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.telegramNotificationsEnabled) {
    return null;
  }

  return user.telegramChatId;
}
