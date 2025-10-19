import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Profile as GoogleProfile } from "passport-google-oauth20";
import { db } from "../database/db";
import { users } from "../database/schema";
import { eq } from "drizzle-orm";

// 환경 변수 확인
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    "⚠️  Google OAuth credentials not found. Google login will be disabled."
  );
}

// Google OAuth Strategy 설정
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
          const existingUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          let user;

          if (existingUsers.length > 0) {
            // 기존 사용자 - Google ID 업데이트 (로그인)
            user = existingUsers[0];

            if (!user.googleId) {
              await db
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
            // 신규 사용자 - passport에서 사용자 정보만 반환
            // server.js에서 DB 조회 후 세션에 저장하도록 변경
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
}

// 세션 직렬화 (필요시 사용)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// 세션 역직렬화 (필요시 사용)
passport.deserializeUser(async (id: number, done) => {
  try {
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userResults.length === 0) {
      return done(new Error("사용자를 찾을 수 없습니다."), null);
    }

    done(null, userResults[0]);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
