import { database } from "./context";
import { communityPostLikes } from "./schema";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * 게시글에 좋아요 추가
 */
export async function addPostLike(postId: number, userId: number) {
  const db = database();
  try {
    const [like] = await db
      .insert(communityPostLikes)
      .values({ postId, userId })
      .returning();
    return like;
  } catch (error) {
    // 이미 좋아요를 누른 경우 (unique constraint 위반)
    return null;
  }
}

/**
 * 게시글 좋아요 취소
 */
export async function removePostLike(postId: number, userId: number) {
  const db = database();
  const result = await db
    .delete(communityPostLikes)
    .where(
      and(
        eq(communityPostLikes.postId, postId),
        eq(communityPostLikes.userId, userId)
      )
    )
    .returning();
  return result[0] ?? null;
}

/**
 * 특정 게시글의 좋아요 개수 조회
 */
export async function getPostLikeCount(postId: number): Promise<number> {
  const db = database();
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(communityPostLikes)
    .where(eq(communityPostLikes.postId, postId));
  return result[0]?.count ?? 0;
}

/**
 * 여러 게시글의 좋아요 개수 조회 (배치)
 */
export async function getPostLikeCounts(
  postIds: number[]
): Promise<Record<number, number>> {
  if (postIds.length === 0) return {};

  const db = database();
  const results = await db
    .select({
      postId: communityPostLikes.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityPostLikes)
    .where(inArray(communityPostLikes.postId, postIds))
    .groupBy(communityPostLikes.postId);

  const counts: Record<number, number> = {};
  results.forEach((r) => {
    counts[r.postId] = r.count;
  });

  return counts;
}

/**
 * 사용자가 특정 게시글에 좋아요를 눌렀는지 확인
 */
export async function hasUserLikedPost(
  postId: number,
  userId: number
): Promise<boolean> {
  const db = database();
  const result = await db
    .select()
    .from(communityPostLikes)
    .where(
      and(
        eq(communityPostLikes.postId, postId),
        eq(communityPostLikes.userId, userId)
      )
    );
  return result.length > 0;
}

/**
 * 사용자가 좋아요를 누른 게시글 목록 조회 (배치)
 */
export async function getUserLikedPosts(
  postIds: number[],
  userId: number
): Promise<Set<number>> {
  if (postIds.length === 0) return new Set();

  const db = database();
  const results = await db
    .select({ postId: communityPostLikes.postId })
    .from(communityPostLikes)
    .where(
      and(
        inArray(communityPostLikes.postId, postIds),
        eq(communityPostLikes.userId, userId)
      )
    );

  return new Set(results.map((r) => r.postId));
}
