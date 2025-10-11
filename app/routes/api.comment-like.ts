import type { ActionFunctionArgs } from "react-router";
import { addCommentLike, removeCommentLike } from "../database/comment-likes";
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
  const commentId = formData.get("commentId");
  const actionType = formData.get("action"); // "like" or "unlike"

  if (!commentId || !actionType) {
    return Response.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const commentIdNum = parseInt(commentId as string);

  if (isNaN(commentIdNum)) {
    return Response.json({ error: "잘못된 댓글 ID입니다." }, { status: 400 });
  }

  try {
    if (actionType === "like") {
      await addCommentLike(commentIdNum, user.id);
      return Response.json({ success: true, action: "liked" });
    } else if (actionType === "unlike") {
      await removeCommentLike(commentIdNum, user.id);
      return Response.json({ success: true, action: "unliked" });
    } else {
      return Response.json({ error: "잘못된 액션입니다." }, { status: 400 });
    }
  } catch (error) {
    console.error("댓글 좋아요 처리 오류:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
