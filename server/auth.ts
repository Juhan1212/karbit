import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, sql } from "drizzle-orm";
import { database } from "~/database/context";
import { users, userSessions } from "~/database/schema";

// JWT 비밀키 (환경변수에서 가져오기)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_EXPIRES_IN = "7d"; // 7일
const SESSION_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  planId: number | null;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// 비밀번호 검증
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT 토큰 생성
export function generateToken(userId: number, email: string): string {
  const payload = {
    userId,
    email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT 토큰 검증
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// 세션 생성
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

// 세션 검증
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
    if (session.expiresAt < new Date()) {
      // 만료된 세션 삭제
      await db.delete(userSessions).where(eq(userSessions.token, token));
      return null;
    }

    // 사용자 정보 조회
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

// 세션 삭제 (로그아웃)
export async function deleteSession(token: string): Promise<void> {
  const db = database();
  await db.delete(userSessions).where(eq(userSessions.token, token));
}

// 사용자의 모든 세션 삭제
export async function deleteAllUserSessions(userId: number): Promise<void> {
  const db = database();
  await db.delete(userSessions).where(eq(userSessions.userId, userId));
}

// 만료된 세션들 정리
export async function cleanupExpiredSessions(): Promise<void> {
  const db = database();
  const now = new Date();
  await db.delete(userSessions).where(sql`${userSessions.expiresAt} < ${now}`);
}

// 이메일 유효성 검사
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 유효성 검사
export function isValidPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("비밀번호는 최소 8자 이상이어야 합니다.");
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push("비밀번호에 영문자가 포함되어야 합니다.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("비밀번호에 숫자가 포함되어야 합니다.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// 이름 유효성 검사
export function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}
