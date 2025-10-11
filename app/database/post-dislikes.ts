import { database } from "./context";
import { communityPostDislikes } from "./schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * 게시글에 싫어요 추가
 */
export async function addPostDislike(postId: number, userId: number) {
  try {
    const db = database();
    await db.insert(communityPostDislikes).values({
      postId,
      userId,
    });
    return { success: true };
  } catch (error: any) {
    // 이미 싫어요를 누른 경우
    if (error.code === "23505") {
      return { success: false, message: "이미 싫어요를 누른 게시글입니다." };
    }
    throw error;
  }
}

/**
 * 게시글 싫어요 취소
 */
export async function removePostDislike(postId: number, userId: number) {
  const db = database();
  await db
    .delete(communityPostDislikes)
    .where(
      and(
        eq(communityPostDislikes.postId, postId),
        eq(communityPostDislikes.userId, userId)
      )
    );
  return { success: true };
}

/**
 * 여러 게시글의 싫어요 수 가져오기 (배치 처리)
 */
export async function getPostDislikeCounts(postIds: number[]) {
  if (postIds.length === 0) return {};
  const db = database();
  const counts = await db
    .select({
      postId: communityPostDislikes.postId,
      count: communityPostDislikes.id,
    })
    .from(communityPostDislikes)
    .where(inArray(communityPostDislikes.postId, postIds));

  // postId를 키로 하는 객체로 변환
  const countMap: Record<number, number> = {};
  for (const row of counts) {
    countMap[row.postId] = (countMap[row.postId] || 0) + 1;
  }

  return countMap;
}

/**
 * 사용자가 특정 게시글에 싫어요를 눌렀는지 확인
 */
export async function hasUserDislikedPost(postId: number, userId: number) {
  const db = database();
  const result = await db
    .select()
    .from(communityPostDislikes)
    .where(
      and(
        eq(communityPostDislikes.postId, postId),
        eq(communityPostDislikes.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * 사용자가 싫어요를 누른 게시글 목록 가져오기 (배치 처리)
 */
export async function getUserDislikedPosts(
  postIds: number[],
  userId: number
): Promise<Set<number>> {
  if (postIds.length === 0) return new Set();
  const db = database();
  const results = await db
    .select({
      postId: communityPostDislikes.postId,
    })
    .from(communityPostDislikes)
    .where(
      and(
        inArray(communityPostDislikes.postId, postIds),
        eq(communityPostDislikes.userId, userId)
      )
    );

  return new Set(results.map((r: { postId: number }) => r.postId));
}
