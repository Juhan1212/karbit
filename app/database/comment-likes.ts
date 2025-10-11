import { database } from "./context";
import { communityCommentLikes } from "./schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 댓글에 좋아요 추가
 */
export async function addCommentLike(commentId: number, userId: number) {
  try {
    const db = database();
    await db.insert(communityCommentLikes).values({
      commentId,
      userId,
    });
    return { success: true };
  } catch (error: any) {
    // 이미 좋아요를 누른 경우
    if (error.code === "23505") {
      return { success: false, message: "이미 좋아요를 누른 댓글입니다." };
    }
    throw error;
  }
}

/**
 * 댓글 좋아요 취소
 */
export async function removeCommentLike(commentId: number, userId: number) {
  const db = database();
  await db
    .delete(communityCommentLikes)
    .where(
      and(
        eq(communityCommentLikes.commentId, commentId),
        eq(communityCommentLikes.userId, userId)
      )
    );
  return { success: true };
}

/**
 * 여러 댓글의 좋아요 수 가져오기 (배치 처리)
 */
export async function getCommentLikeCounts(commentIds: number[]) {
  if (commentIds.length === 0) return {};

  const db = database();
  const counts = await db
    .select({
      commentId: communityCommentLikes.commentId,
      count: communityCommentLikes.id,
    })
    .from(communityCommentLikes)
    .where(inArray(communityCommentLikes.commentId, commentIds));

  // commentId를 키로 하는 객체로 변환
  const countMap: Record<number, number> = {};
  for (const row of counts) {
    countMap[row.commentId] = (countMap[row.commentId] || 0) + 1;
  }

  return countMap;
}

/**
 * 사용자가 특정 댓글에 좋아요를 눌렀는지 확인
 */
export async function hasUserLikedComment(commentId: number, userId: number) {
  const db = database();
  const result = await db
    .select()
    .from(communityCommentLikes)
    .where(
      and(
        eq(communityCommentLikes.commentId, commentId),
        eq(communityCommentLikes.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * 사용자가 좋아요를 누른 댓글 목록 가져오기 (배치 처리)
 */
export async function getUserLikedComments(
  commentIds: number[],
  userId: number
): Promise<Set<number>> {
  if (commentIds.length === 0) return new Set();

  const db = database();
  const results = await db
    .select({
      commentId: communityCommentLikes.commentId,
    })
    .from(communityCommentLikes)
    .where(
      and(
        inArray(communityCommentLikes.commentId, commentIds),
        eq(communityCommentLikes.userId, userId)
      )
    );

  return new Set(results.map((r: { commentId: number }) => r.commentId));
}
