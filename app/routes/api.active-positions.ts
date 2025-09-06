import type { LoaderFunctionArgs } from "react-router";
import { validateSession } from "~/database/session";
import { getUserActivePositions } from "~/database/position";
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

    const activePositions = await getUserActivePositions(user.id);
    const activePositionCount = activePositions.length;

    return Response.json({
      activePositions,
      activePositionCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Active positions API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
