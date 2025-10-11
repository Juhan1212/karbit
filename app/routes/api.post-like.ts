import type { ActionFunctionArgs } from "react-router";
import { addPostLike, removePostLike } from "../database/post-likes";
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
  const action = formData.get("action"); // "like" or "unlike"

  if (!postId || !action) {
    return Response.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const postIdNum = parseInt(postId as string);

  try {
    if (action === "like") {
      // 좋아요 추가
      const result = await addPostLike(postIdNum, user.id);
      if (!result) {
        return Response.json(
          { error: "이미 좋아요를 눌렀습니다." },
          { status: 400 }
        );
      }
      return Response.json({ success: true, action: "liked" });
    } else if (action === "unlike") {
      // 좋아요 취소
      const result = await removePostLike(postIdNum, user.id);
      if (!result) {
        return Response.json(
          { error: "좋아요를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      return Response.json({ success: true, action: "unliked" });
    }

    return Response.json({ error: "잘못된 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("좋아요 처리 오류:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
