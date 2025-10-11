import { eq, sql } from "drizzle-orm";
import { database } from "./context";
import { userSessions, users } from "./schema";
import {
  generateToken,
  verifyToken,
  type JWTPayload,
  type AuthUser,
} from "~/utils/auth";

export interface SessionData {
  id: number;
  userId: number;
  token: string;
  expiresAt: Date;
  user?: {
    id: number;
    email: string;
    name: string | null;
    planId: number | null;
  };
}

// 세션 만료 시간 (7일)
const SESSION_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)

/**
 * 세션 생성
 */
export async function createSession(userId: number): Promise<string> {
  const db = database();

  // 사용자 정보 조회
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const token = generateToken(user.id, user.email);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN);

  // 기존 세션이 있다면 삭제
  await db.delete(userSessions).where(eq(userSessions.userId, userId));

  // 새 세션 생성
  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * 세션 검증
 */
export async function validateSession(token: string): Promise<AuthUser | null> {
  const db = database();

  try {
    // JWT 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded) return null;

    // 데이터베이스에서 세션 확인
    const session = await db.query.userSessions.findFirst({
      where: eq(userSessions.token, token),
      with: {
        user: true,
      },
    });

    if (!session) return null;

    // 세션 만료 확인
    if (session.expiresAt < new Date()) {
      // 만료된 세션 삭제
      await deleteSession(token);
      return null;
    }

    // 사용자 정보 조회 (플랜 정보 포함)
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      with: {
        plan: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      totalSelfEntryCount: user.totalSelfEntryCount ?? 0,
      totalAutoEntryCount: user.totalAutoEntryCount ?? 0,
      totalAlarmCount: user.totalAlarmCount ?? 0,
      plan: user.plan,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

/**
 * 세션 삭제 (로그아웃)
 */
export async function deleteSession(token: string): Promise<void> {
  const db = database();
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

/**
 * 사용자의 모든 세션 삭제
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  const db = database();
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}

/**
 * 만료된 세션들 정리
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = database();
  const now = new Date();
  const result = await db
    .delete(userSessions)
    .where(sql`${userSessions.expiresAt} < ${now}`);
  return result.length;
}

/**
 * 토큰으로 세션 조회
 */
export async function getSessionByToken(
  token: string
): Promise<SessionData | null> {
  const db = database();

  const session = await db.query.userSessions.findFirst({
    where: eq(userSessions.token, token),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
          planId: true,
        },
      },
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

/**
 * 사용자의 모든 세션 조회
 */
export async function getUserSessions(userId: number): Promise<SessionData[]> {
  const db = database();

  const sessions = await db.query.userSessions.findMany({
    where: eq(userSessions.userId, userId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
          planId: true,
        },
      },
    },
    orderBy: (userSessions, { desc }) => [desc(userSessions.expiresAt)],
  });

  return sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
    user: session.user,
  }));
}

/**
 * 세션 갱신 (토큰 재발급)
 */
export async function refreshSession(token: string): Promise<string | null> {
  const db = database();

  try {
    // 기존 세션 확인
    const session = await getSessionByToken(token);
    if (!session || !session.user) return null;

    // 세션이 만료되었으면 null 반환
    if (session.expiresAt < new Date()) {
      await deleteSession(token);
      return null;
    }

    // 새 세션 생성 (기존 세션은 자동으로 삭제됨)
    const newToken = await createSession(session.userId);
    return newToken;
  } catch (error) {
    console.error("Session refresh error:", error);
    return null;
  }
}

/**
 * 활성 세션 수 조회
 */
export async function getActiveSessionCount(): Promise<number> {
  const db = database();
  const now = new Date();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userSessions)
    .where(sql`${userSessions.expiresAt} > ${now}`);

  return Number(count);
}

/**
 * 사용자별 활성 세션 수 조회
 */
export async function getUserActiveSessionCount(
  userId: number
): Promise<number> {
  const db = database();
  const now = new Date();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userSessions)
    .where(
      sql`${userSessions.userId} = ${userId} AND ${userSessions.expiresAt} > ${now}`
    );

  return Number(count);
}
