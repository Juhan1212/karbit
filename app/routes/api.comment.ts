import type { ActionFunctionArgs } from "react-router";
import { createComment } from "../database/comments";
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
  const content = formData.get("content");

  if (!postId || !content) {
    return Response.json(
      { error: "필수 정보가 누락되었습니다." },
      { status: 400 }
    );
  }

  const postIdNum = parseInt(postId as string);
  const contentStr = content as string;

  if (isNaN(postIdNum) || !contentStr.trim()) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const comment = await createComment({
      postId: postIdNum,
      userId: user.id,
      content: contentStr,
    });

    return Response.json({ success: true, comment });
  } catch (error) {
    console.error("댓글 생성 오류:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
