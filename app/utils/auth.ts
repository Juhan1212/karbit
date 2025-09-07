import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// JWT 비밀키 (환경변수에서 가져오기)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_EXPIRES_IN = "7d"; // 7일

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  planId: number | null;
  plan?: {
    id: number;
    name: string;
    description: string | null;
    price: string | null;
  } | null;
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
