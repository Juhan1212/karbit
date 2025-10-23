import session from "express-session";
import { userSessions } from "../database/schema";
import { eq } from "drizzle-orm";
import { db as mainDb } from "../database/db";

/**
 * Drizzle 기반 express-session Custom Store
 * userSessions 테이블에 세션 데이터 저장
 * sessionData 컬럼(text, JSON) 필요
 */
export class DrizzleSessionStore extends session.Store {
  async get(sid: string, callback: (err: any, session?: any) => void) {
    try {
      const sessionRow = await mainDb.query.userSessions.findFirst({
        where: eq(userSessions.token, sid),
      });
      if (!sessionRow || !sessionRow.sessionData) return callback(null, null);
      callback(null, JSON.parse(sessionRow.sessionData));
    } catch (err) {
      callback(err);
    }
  }

  async set(sid: string, sessionData: any, callback: (err?: any) => void) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 2 * 60 * 60 * 1000);
      // upsert: 기존 세션 있으면 삭제 후 생성
      await mainDb.delete(userSessions).where(eq(userSessions.token, sid));
      await mainDb.insert(userSessions).values({
        token: sid,
        userId: sessionData.userId || 0,
        expiresAt,
        sessionData: JSON.stringify(sessionData),
      });
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid: string, callback: (err?: any) => void) {
    try {
      await mainDb.delete(userSessions).where(eq(userSessions.token, sid));
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}
