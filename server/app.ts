import { createRequestHandler } from "@react-router/express";
import { drizzle } from "drizzle-orm/postgres-js";
import express from "express";
import postgres from "postgres";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Profile as GoogleProfile } from "passport-google-oauth20";
import "react-router";

import { DatabaseContext } from "../app/database/context";
import * as schema from "../app/database/schema";
import { db as mainDb } from "../app/database/db";
import { users } from "../app/database/schema";
import { eq } from "drizzle-orm";
import { createSession } from "../app/database/session";

declare module "react-router" {
  interface AppLoadContext {
    VALUE_FROM_EXPRESS: string;
  }
}

export const app = express();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = postgres(process.env.DATABASE_URL, {
  // Connection pool 설정
  max: 20, // 최대 연결 수
  idle_timeout: 20, // 유휴 연결 타임아웃 (초)
  connect_timeout: 10, // 연결 타임아웃 (초)

  // 재시도 설정
  connection: {
    application_name: "karbit-app",
  },

  // 에러 핸들링
  onnotice: (notice) => {
    console.log("PostgreSQL Notice:", notice);
  },
});
const db = drizzle(client, { schema });
app.use((_, __, next) => DatabaseContext.run(db, next));

// ==================== Passport Google OAuth 설정 ====================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:3000/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile: GoogleProfile, done) => {
        try {
          // 프로필 정보 추출
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const googleId = profile.id;
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(
              new Error("이메일 정보를 가져올 수 없습니다."),
              undefined
            );
          }

          // 기존 사용자 확인
          const existingUsers = await mainDb
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          let user;

          if (existingUsers.length > 0) {
            // 기존 사용자 - Google ID 업데이트 (로그인)
            user = existingUsers[0];

            if (!user.googleId) {
              await mainDb
                .update(users)
                .set({
                  googleId,
                  googleAvatar: avatar,
                  name: name || user.name,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id));
            }
          } else {
            // 신규 사용자 - 정보만 반환
            return done(null, {
              isNewUser: true,
              email,
              name,
              googleId,
              googleAvatar: avatar,
            } as any);
          }

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Passport 초기화
  app.use(passport.initialize());

  console.log("✅ Passport Google OAuth initialized in app.ts");
}

// ==================== Google OAuth 라우트 ====================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // API: 세션에 저장된 Google 회원가입 정보 조회
  app.get("/api/auth/google/signup-data", (req, res) => {
    const googleSignupData = (req as any).session.googleSignupData;

    if (!googleSignupData) {
      return res
        .status(404)
        .json({ success: false, message: "Google 회원가입 정보가 없습니다" });
    }

    res.json({ success: true, data: googleSignupData });
  });

  // Google OAuth 인증 시작
  app.get("/api/auth/google", (req, res, next) => {
    const isSignupMode = req.query.mode === "signup";

    if (isSignupMode) {
      (req as any).session.isGoogleSignupMode = true;
    } else {
      (req as any).session.isGoogleSignupMode = false;
    }

    (req as any).session.save(() => {
      passport.authenticate("google", {
        scope: ["profile", "email"],
      })(req, res, next);
    });
  });

  // Google OAuth 콜백
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth?error=구글 로그인에 실패했습니다",
      session: false,
    }),
    async (req, res) => {
      try {
        const user = (req as any).user;

        if (!user) {
          return res.redirect("/auth?error=사용자 정보를 가져올 수 없습니다");
        }

        const isSignupMode = (req as any).session.isGoogleSignupMode;

        // 회원가입 모드
        if (isSignupMode) {
          delete (req as any).session.isGoogleSignupMode;

          // 이미 가입된 사용자인 경우
          if (user.id) {
            const sessionToken = await createSession(user.id);
            setAuthCookie(res, sessionToken);
            return res.redirect("/dashboard");
          }

          // 신규 사용자 - DB에 등록
          const newUser = await createNewGoogleUser(user);
          const sessionToken = await createSession(newUser.id);
          setAuthCookie(res, sessionToken);
          return res.redirect("/dashboard");
        }

        // 로그인 모드
        if (!user.id) {
          return res.redirect("/auth?tab=signup&login=fail");
        }

        const sessionToken = await createSession(user.id);
        setAuthCookie(res, sessionToken);
        res.redirect("/dashboard");
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        res.redirect("/auth?error=로그인 처리 중 오류가 발생했습니다");
      }
    }
  );
}

// ==================== 헬퍼 함수들 ====================
async function createNewGoogleUser(user: any) {
  const { plans, userPlanHistory } = schema;

  // Free 플랜 ID 조회
  const freePlan = await mainDb
    .select()
    .from(plans)
    .where(eq(plans.name, "Free"))
    .limit(1);

  if (!freePlan || freePlan.length === 0) {
    throw new Error("기본 플랜을 찾을 수 없습니다");
  }

  // 트랜잭션으로 사용자 + 플랜 히스토리 생성
  const newUser = await mainDb.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
        planId: freePlan[0].id,
        passwordHash: "",
      })
      .returning();

    await tx.insert(userPlanHistory).values({
      userId: createdUser.id,
      planId: freePlan[0].id,
      reason: "initial_signup",
      isActive: true,
      startDate: new Date(),
    });

    return createdUser;
  });

  return newUser;
}

function setAuthCookie(res: express.Response, token: string) {
  const isDevelopment = process.env.NODE_ENV === "development";

  res.cookie("auth-token", token, {
    httpOnly: true,
    secure: !isDevelopment,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2시간
    path: "/",
  });
}

// .well-known 경로들 처리 (Chrome DevTools, 보안 관련 등)
app.use((req, res, next) => {
  if (req.path.startsWith("/.well-known/")) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return {
        VALUE_FROM_EXPRESS: "Hello from Express",
      };
    },
  })
);
