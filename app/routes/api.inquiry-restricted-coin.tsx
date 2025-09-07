import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getRestrictedCoins } from "~/database/coin";
import { getAuthTokenFromRequest } from "~/utils/cookies";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const token = getAuthTokenFromRequest(request);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 제한된 코인 목록 조회
    const restrictedCoins = await getRestrictedCoins();

    return Response.json({
      restrictedCoins,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Restricted coins inquiry API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
