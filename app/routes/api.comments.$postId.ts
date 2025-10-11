import type { LoaderFunctionArgs } from "react-router";
import { getCommentsByPostId } from "../database/comments";
import { validateSession } from "../database/session";
import { getAuthTokenFromRequest } from "../utils/cookies";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const postId = params.postId;

  if (!postId || isNaN(Number(postId))) {
    return Response.json({ error: "잘못된 게시글 ID입니다." }, { status: 400 });
  }

  // 사용자 인증 (선택적)
  const token = getAuthTokenFromRequest(request);
  let userId: number | undefined;
  if (token) {
    const user = await validateSession(token);
    userId = user?.id;
  }

  try {
    const comments = await getCommentsByPostId(Number(postId), userId);
    return Response.json({ comments });
  } catch (error) {
    console.error("댓글 조회 오류:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
