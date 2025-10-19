/**
 * Google OAuth 관련 라우트 설정
 * server.js에서 분리하여 관심사 분리 및 유지보수성 향상
 */

/**
 * Google OAuth 라우트를 Express 앱에 등록
 * @param {import('express').Application} app - Express 앱 인스턴스
 * @param {any} passportInstance - Passport 인스턴스
 * @param {any} viteServer - Vite dev server (개발 환경에서만 사용)
 */
export function setupOAuthRoutes(app, passportInstance, viteServer = null) {
  // 개발 모드 확인 (viteServer 존재 여부로 판단)
  const DEVELOPMENT = !!viteServer;

  console.log("OAuth Routes - Development Mode:", DEVELOPMENT);

  // ==================== API: 세션에 저장된 Google 회원가입 정보 조회 ====================
  app.get("/api/auth/google/signup-data", (req, res) => {
    const googleSignupData = /** @type {any} */ (req).session.googleSignupData;

    if (!googleSignupData) {
      return res
        .status(404)
        .json({ success: false, message: "Google 회원가입 정보가 없습니다" });
    }

    res.json({ success: true, data: googleSignupData });
  });

  // ==================== Google OAuth 인증 시작 ====================
  app.get("/api/auth/google", (req, res, next) => {
    // 회원가입 모드인지 확인 (쿼리 파라미터로 전달)
    const isSignupMode = req.query.mode === "signup";

    if (isSignupMode) {
      // 회원가입 모드 플래그를 세션에 저장
      /** @type {any} */ (req).session.isGoogleSignupMode = true;
    } else {
      // 로그인 모드 (기본값)
      /** @type {any} */ (req).session.isGoogleSignupMode = false;
    }

    // 세션 저장 후 Passport 인증 시작
    /** @type {any} */ (req).session.save(() => {
      passportInstance.authenticate("google", {
        scope: ["profile", "email"],
      })(req, res, next);
    });
  });

  // ==================== Google OAuth 콜백 ====================
  app.get(
    "/api/auth/google/callback",
    passportInstance.authenticate("google", {
      failureRedirect: "/auth?error=구글 로그인에 실패했습니다",
      session: false,
    }),
    async (req, res) => {
      try {
        // 사용자 정보 가져오기
        const user = /** @type {any} */ (req).user;

        if (!user) {
          return res.redirect("/auth?error=사용자 정보를 가져올 수 없습니다");
        }

        // 세션에서 회원가입 모드 확인
        const isSignupMode = /** @type {any} */ (req).session
          .isGoogleSignupMode;

        // ==================== 회원가입 모드 ====================
        if (isSignupMode) {
          // 세션 플래그 제거
          delete (/** @type {any} */ (req).session.isGoogleSignupMode);

          // 이미 가입된 사용자인 경우 - 바로 로그인
          if (user.id) {
            const sessionToken = await createSessionToken(user.id, viteServer);
            setAuthCookie(res, sessionToken, DEVELOPMENT);
            return res.redirect("/dashboard");
          }

          // 신규 사용자 - DB에 등록
          const newUser = await createNewGoogleUser(user, viteServer);
          const sessionToken = await createSessionToken(newUser.id, viteServer);
          setAuthCookie(res, sessionToken, DEVELOPMENT);
          return res.redirect("/dashboard");
        }

        // ==================== 로그인 모드 ====================
        // 신규 사용자인 경우 - 회원가입 탭으로 리다이렉트
        if (!user.id) {
          return res.redirect("/auth?tab=signup&login=fail");
        }

        // 기존 사용자인 경우 - 로그인 처리
        const sessionToken = await createSessionToken(user.id, viteServer);
        setAuthCookie(res, sessionToken, DEVELOPMENT);
        res.redirect("/dashboard");
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        res.redirect("/auth?error=로그인 처리 중 오류가 발생했습니다");
      }
    }
  );
}

// ==================== 헬퍼 함수들 ====================

/**
 * 신규 Google 사용자를 DB에 생성 (트랜잭션 사용)
 * @param {any} user - Passport에서 전달받은 사용자 정보
 * @param {any} viteServer - Vite dev server
 * @returns {Promise<any>} 생성된 사용자 객체
 */
async function createNewGoogleUser(user, viteServer) {
  // 필요한 모듈 동적 로드
  let db, users, plans, userPlanHistory, eq;

  if (viteServer) {
    // 개발 환경: Vite를 통해 TypeScript 파일 로드
    const dbModule = await viteServer.ssrLoadModule("./app/database/db.ts");
    const schemaModule = await viteServer.ssrLoadModule(
      "./app/database/schema.ts"
    );
    const drizzleModule = await viteServer.ssrLoadModule("drizzle-orm");

    db = dbModule.db;
    users = schemaModule.users;
    plans = schemaModule.plans;
    userPlanHistory = schemaModule.userPlanHistory;
    eq = drizzleModule.eq;
  } else {
    // 프로덕션 환경: 소스 파일에서 직접 로드
    // @ts-ignore
    const dbModule = await import("./app/database/db.js");
    // @ts-ignore
    const schemaModule = await import("./app/database/schema.js");
    // @ts-ignore
    const drizzleModule = await import("drizzle-orm");

    db = dbModule.db;
    users = schemaModule.users;
    plans = schemaModule.plans;
    userPlanHistory = schemaModule.userPlanHistory;
    eq = drizzleModule.eq;
  }

  // Free 플랜 ID 조회
  const freePlan = await db
    .select()
    .from(plans)
    .where(eq(plans.name, "Free"))
    .limit(1);

  if (!freePlan || freePlan.length === 0) {
    throw new Error("기본 플랜을 찾을 수 없습니다");
  }

  // 트랜잭션으로 사용자 + 플랜 히스토리 생성
  const newUser = await db.transaction(async (/** @type {any} */ tx) => {
    // 1. 사용자 생성
    const [createdUser] = await tx
      .insert(users)
      .values({
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        googleAvatar: user.googleAvatar,
        planId: freePlan[0].id,
        passwordHash: "", // Google 로그인은 비밀번호 없음
      })
      .returning();

    // 2. 기본 플랜 히스토리 생성
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

/**
 * JWT 세션 토큰 생성
 * @param {number} userId - 사용자 ID
 * @param {any} viteServer - Vite dev server
 * @returns {Promise<string>} 세션 토큰
 */
async function createSessionToken(userId, viteServer) {
  let createSession;

  if (viteServer) {
    const sessionModule = await viteServer.ssrLoadModule(
      "./app/database/session.ts"
    );
    createSession = sessionModule.createSession;
  } else {
    // 프로덕션 환경: 소스 파일에서 직접 로드
    // @ts-ignore
    const sessionModule = await import("./app/database/session.js");
    createSession = sessionModule.createSession;
  }

  return await createSession(userId);
}

/**
 * 인증 쿠키 설정
 * @param {import('express').Response} res - Express response 객체
 * @param {string} token - JWT 토큰
 * @param {boolean} isDevelopment - 개발 모드 여부
 */
function setAuthCookie(res, token, isDevelopment = false) {
  res.cookie("auth-token", token, {
    httpOnly: true,
    secure: !isDevelopment,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2시간
    path: "/",
  });
}
