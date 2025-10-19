import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { database } from "~/database/context";
import { users } from "~/database/schema";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  try {
    // 사용자 인증 확인
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FormData 또는 JSON 파싱 (React Router fetcher는 FormData 사용)
    const contentType = request.headers.get("content-type");
    let enabled: boolean;

    if (contentType?.includes("application/json")) {
      const body = await request.json();
      enabled = body.enabled;
    } else {
      // FormData 처리
      const formData = await request.formData();
      const enabledValue = formData.get("enabled");
      enabled = enabledValue === "true";
    }

    if (typeof enabled !== "boolean") {
      return Response.json(
        { error: "Invalid request: enabled must be a boolean" },
        { status: 400 }
      );
    }

    // DB에서 텔레그램 알림 설정 업데이트
    const db = database();

    // 스위치를 끄면 chatId도 null로 설정 (연동 해제)
    if (!enabled) {
      await db
        .update(users)
        .set({
          telegramNotificationsEnabled: false,
          telegramChatId: null,
        })
        .where(eq(users.id, user.id));

      return Response.json({
        success: true,
        enabled: false,
        chatIdCleared: true,
        message: "텔레그램 알림이 비활성화되었습니다",
      });
    } else {
      // 스위치를 켜면 알림만 활성화 (chatId는 유지)
      await db
        .update(users)
        .set({ telegramNotificationsEnabled: true })
        .where(eq(users.id, user.id));

      return Response.json({
        success: true,
        enabled: true,
        chatIdCleared: false,
        message: "텔레그램 알림이 활성화되었습니다",
      });
    }
  } catch (error) {
    console.error("텔레그램 알림 설정 오류:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
