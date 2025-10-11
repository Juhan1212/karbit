import type { ActionFunctionArgs } from "react-router";
import { addPostDislike, removePostDislike } from "../database/post-dislikes";
import { validateSession } from "../database/session";
import { getAuthTokenFromRequest } from "../utils/cookies";

export async function action({ request }: ActionFunctionArgs) {
  // 세션에서 사용자 확인
  const token = getAuthTokenFromRequest(request);
  if (!token) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await validateSession(token);
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const postId = formData.get("postId");
  const actionType = formData.get("action"); // "dislike" or "undislike"

  if (!postId || !actionType) {
    return Response.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const postIdNum = parseInt(postId as string);

  if (isNaN(postIdNum)) {
    return Response.json({ error: "잘못된 게시글 ID입니다." }, { status: 400 });
  }

  try {
    if (actionType === "dislike") {
      await addPostDislike(postIdNum, user.id);
      return Response.json({ success: true, action: "disliked" });
    } else if (actionType === "undislike") {
      await removePostDislike(postIdNum, user.id);
      return Response.json({ success: true, action: "undisliked" });
    } else {
      return Response.json({ error: "잘못된 액션입니다." }, { status: 400 });
    }
  } catch (error) {
    console.error("싫어요 처리 오류:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
