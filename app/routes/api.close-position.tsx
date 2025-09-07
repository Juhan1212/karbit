import type { ActionFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { closePositionByCoinSymbol } from "~/database/position";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return Response.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (request.method !== "POST") {
      return Response.json(
        { success: false, message: "잘못된 요청 방식입니다." },
        { status: 405 }
      );
    }

    const { coinSymbol } = await request.json();

    if (!coinSymbol || typeof coinSymbol !== "string") {
      return Response.json(
        {
          success: false,
          message: "코인 심볼이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 해당 코인 심볼의 활성 포지션 종료
    await closePositionByCoinSymbol(user.id, coinSymbol);

    return Response.json({
      success: true,
      message: `${coinSymbol} 포지션이 성공적으로 종료되었습니다.`,
    });
  } catch (error) {
    console.error("포지션 종료 오류:", error);

    return Response.json(
      {
        success: false,
        message: "포지션 종료 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
