import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { eq } from "drizzle-orm";
import { database } from "~/database/context";
import { users, plans } from "~/database/schema";
import {
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  isValidName,
} from "~/utils/auth";
import {
  createSession,
  validateSession,
  deleteSession,
} from "~/database/session";
import { createUser, getUserByEmail } from "~/database/user";
import { getAuthTokenFromRequest } from "~/utils/cookies";

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const actionType = url.searchParams.get("action");

  switch (actionType) {
    case "signup":
      return handleSignup(request);
    case "login":
      return handleLogin(request);
    case "logout":
      return handleLogout(request);
    case "refresh":
      return handleRefresh(request);
    default:
      return Response.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "me") {
    return handleGetUser(request);
  }

  return Response.json(
    { success: false, message: "Not found" },
    { status: 404 }
  );
}

async function handleSignup(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 입력값 검증
    if (!name || !email || !password) {
      return Response.json(
        {
          success: false,
          message: "닉네임, 이메일, 비밀번호를 모두 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (!isValidName(name)) {
      return Response.json(
        {
          success: false,
          message: "닉네임은 2자 이상 50자 이하로 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 닉네임 중복 검사
    const db = database();
    const existingUser = await db.query.users.findFirst({
      where: eq(users.name, name),
    });

    if (existingUser) {
      return Response.json(
        {
          success: false,
          message: "이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        {
          success: false,
          message: "올바른 이메일 형식을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.isValid) {
      return Response.json(
        {
          success: false,
          message: passwordValidation.errors[0],
        },
        { status: 400 }
      );
    }

    // 사용자 생성
    const newUser = await createUser({
      name,
      email,
      password,
    });

    // 세션 생성
    const token = await createSession(newUser.id);

    // 쿠키 설정을 위한 헤더 생성
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `auth-token=${token}; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`
    );

    if (process.env.NODE_ENV === "production") {
      headers.append(
        "Set-Cookie",
        `auth-token=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      );
    }

    return Response.json(
      {
        success: true,
        message: "회원가입이 완료되었습니다.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          planId: newUser.planId,
          plan: newUser.plan,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("Signup error:", error);

    // 사용자 정의 에러 메시지 처리
    if (error instanceof Error) {
      return Response.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}

async function handleLogin(request: Request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 입력값 검증
    if (!email || !password) {
      return Response.json(
        {
          success: false,
          message: "이메일과 비밀번호를 입력해주세요.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json(
        {
          success: false,
          message: "올바른 이메일 형식을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 사용자 조회
    const user = await getUserByEmail(email);

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "이메일 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    // 사용자 정보에서 passwordHash 가져오기
    const db = database();
    const userWithPassword = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!userWithPassword) {
      return Response.json(
        {
          success: false,
          message: "이메일 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    // 비밀번호 확인
    const isPasswordValid = await verifyPassword(
      password,
      userWithPassword.passwordHash
    );
    if (!isPasswordValid) {
      return Response.json(
        {
          success: false,
          message: "이메일 또는 비밀번호가 올바르지 않습니다.",
        },
        { status: 400 }
      );
    }

    // 세션 생성
    const token = await createSession(user.id);

    // 쿠키 설정을 위한 헤더 생성
    const headers = new Headers();
    const cookieValue = `auth-token=${token}; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`;
    headers.append("Set-Cookie", cookieValue);

    return Response.json(
      {
        success: true,
        message: "로그인에 성공했습니다.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          planId: user.planId,
          plan: user.plan,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}

async function handleLogout(request: Request) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (token) {
      await deleteSession(token);
    }

    // 쿠키 삭제를 위한 헤더
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "auth-token=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/"
    );

    return Response.json(
      {
        success: true,
        message: "로그아웃되었습니다.",
      },
      { headers }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

async function handleGetUser(request: Request) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (!token) {
      return Response.json(
        {
          success: false,
          message: "인증이 필요합니다.",
        },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "유효하지 않은 세션입니다.",
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

async function handleRefresh(request: Request) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (!token) {
      return Response.json(
        {
          success: false,
          message: "인증이 필요합니다.",
        },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      return Response.json(
        {
          success: false,
          message: "유효하지 않은 세션입니다.",
        },
        { status: 401 }
      );
    }

    // 새 토큰 생성
    const newToken = await createSession(user.id);

    // 쿠키 업데이트를 위한 헤더
    const headers = new Headers();
    const cookieValue = `auth-token=${newToken}; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Path=/`;
    headers.append("Set-Cookie", cookieValue);

    return Response.json(
      {
        success: true,
        message: "세션이 갱신되었습니다.",
        user,
      },
      { headers }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return Response.json(
      {
        success: false,
        message: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
