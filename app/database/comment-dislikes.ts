import { database } from "./context";
import { communityCommentDislikes } from "./schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 댓글에 싫어요 추가
 */
export async function addCommentDislike(commentId: number, userId: number) {
  try {
    const db = database();
    await db.insert(communityCommentDislikes).values({
      commentId,
      userId,
    });
    return { success: true };
  } catch (error: any) {
    // 이미 싫어요를 누른 경우
    if (error.code === "23505") {
      return { success: false, message: "이미 싫어요를 누른 댓글입니다." };
    }
    throw error;
  }
}

/**
 * 댓글 싫어요 취소
 */
export async function removeCommentDislike(commentId: number, userId: number) {
  const db = database();
  await db
    .delete(communityCommentDislikes)
    .where(
      and(
        eq(communityCommentDislikes.commentId, commentId),
        eq(communityCommentDislikes.userId, userId)
      )
    );
  return { success: true };
}

/**
 * 여러 댓글의 싫어요 수 가져오기 (배치 처리)
 */
export async function getCommentDislikeCounts(commentIds: number[]) {
  if (commentIds.length === 0) return {};

  const db = database();
  const counts = await db
    .select({
      commentId: communityCommentDislikes.commentId,
      count: communityCommentDislikes.id,
    })
    .from(communityCommentDislikes)
    .where(inArray(communityCommentDislikes.commentId, commentIds));

  // commentId를 키로 하는 객체로 변환
  const countMap: Record<number, number> = {};
  for (const row of counts) {
    countMap[row.commentId] = (countMap[row.commentId] || 0) + 1;
  }

  return countMap;
}

/**
 * 사용자가 특정 댓글에 싫어요를 눌렀는지 확인
 */
export async function hasUserDislikedComment(
  commentId: number,
  userId: number
) {
  const db = database();
  const result = await db
    .select()
    .from(communityCommentDislikes)
    .where(
      and(
        eq(communityCommentDislikes.commentId, commentId),
        eq(communityCommentDislikes.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * 사용자가 싫어요를 누른 댓글 목록 가져오기 (배치 처리)
 */
export async function getUserDislikedComments(
  commentIds: number[],
  userId: number
): Promise<Set<number>> {
  if (commentIds.length === 0) return new Set();

  const db = database();
  const results = await db
    .select({
      commentId: communityCommentDislikes.commentId,
    })
    .from(communityCommentDislikes)
    .where(
      and(
        inArray(communityCommentDislikes.commentId, commentIds),
        eq(communityCommentDislikes.userId, userId)
      )
    );

  return new Set(results.map((r: { commentId: number }) => r.commentId));
}
