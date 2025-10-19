import {
  createTelegramAuthToken,
  getUserTelegramStatus,
} from "~/database/telegram";
import {
  generateAuthToken,
  generateTelegramDeepLink,
} from "~/services/telegram";
import { LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";

/**
 * POST /api/telegram/auth
 * 텔레그램 연동용 인증 토큰 생성
 */
export async function action({ request }: LoaderFunctionArgs) {
  try {
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const user = await validateSession(authToken);
    if (!user) {
      return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 새 인증 토큰 생성 (10분 유효)
    const token = generateAuthToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    await createTelegramAuthToken(user.id, token, expiresAt);

    // 텔레그램 딥링크 생성
    const deepLink = generateTelegramDeepLink(token);

    return Response.json({
      success: true,
      token,
      deepLink,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("텔레그램 인증 토큰 생성 실패:", error);
    return Response.json(
      { error: "인증 토큰 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/auth
 * 텔레그램 연동 상태 확인
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const sessionUser = await validateSession(authToken);
    if (!sessionUser) {
      return Response.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 사용자 텔레그램 상태 조회
    const user = await getUserTelegramStatus(sessionUser.id);

    if (!user) {
      return Response.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return Response.json({
      connected: !!user.telegramChatId,
      chatId: user.telegramChatId,
      username: user.telegramUsername,
      connectedAt: user.telegramConnectedAt,
      notificationsEnabled: user.telegramNotificationsEnabled,
    });
  } catch (error) {
    console.error("텔레그램 연동 상태 확인 실패:", error);
    return Response.json(
      { error: "상태 확인에 실패했습니다" },
      { status: 500 }
    );
  }
}
