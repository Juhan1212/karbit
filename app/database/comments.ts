import { database } from "./context";
import {
  communityComments,
  users,
  communityCommentLikes,
  communityCommentDislikes,
  userPlanHistory,
  plans,
} from "./schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

/**
 * 댓글 생성
 */
export async function createComment({
  postId,
  userId,
  content,
}: {
  postId: number;
  userId: number;
  content: string;
}) {
  const db = database();
  const [comment] = await db
    .insert(communityComments)
    .values({
      postId,
      userId,
      content,
    })
    .returning();
  return comment;
}

/**
 * 게시글의 댓글 목록 가져오기
 */
export async function getCommentsByPostId(postId: number, userId?: number) {
  const db = database();

  const commentsQuery = db
    .select({
      id: communityComments.id,
      postId: communityComments.postId,
      userId: communityComments.userId,
      content: communityComments.content,
      createdAt: communityComments.createdAt,
      updatedAt: communityComments.updatedAt,
      author: users.name,
      authorEmail: users.email,
      planName: plans.name,
    })
    .from(communityComments)
    .leftJoin(users, eq(communityComments.userId, users.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .leftJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(eq(communityComments.postId, postId))
    .orderBy(desc(communityComments.createdAt));

  const comments = await commentsQuery;

  if (comments.length === 0) {
    return [];
  }

  const commentIds = comments.map((c) => c.id);

  // 좋아요 개수 조회
  const likeCounts = await db
    .select({
      commentId: communityCommentLikes.commentId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityCommentLikes)
    .where(inArray(communityCommentLikes.commentId, commentIds))
    .groupBy(communityCommentLikes.commentId);

  const likeCountMap: Record<number, number> = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.commentId] = lc.count;
  });

  // 싫어요 개수 조회
  const dislikeCounts = await db
    .select({
      commentId: communityCommentDislikes.commentId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityCommentDislikes)
    .where(inArray(communityCommentDislikes.commentId, commentIds))
    .groupBy(communityCommentDislikes.commentId);

  const dislikeCountMap: Record<number, number> = {};
  dislikeCounts.forEach((dc) => {
    dislikeCountMap[dc.commentId] = dc.count;
  });

  // 사용자의 좋아요/싫어요 상태 조회
  let userLikedComments: Set<number> = new Set();
  let userDislikedComments: Set<number> = new Set();

  if (userId) {
    const userLikes = await db
      .select({ commentId: communityCommentLikes.commentId })
      .from(communityCommentLikes)
      .where(
        and(
          inArray(communityCommentLikes.commentId, commentIds),
          eq(communityCommentLikes.userId, userId)
        )
      );
    userLikedComments = new Set(userLikes.map((ul) => ul.commentId));

    const userDislikes = await db
      .select({ commentId: communityCommentDislikes.commentId })
      .from(communityCommentDislikes)
      .where(
        and(
          inArray(communityCommentDislikes.commentId, commentIds),
          eq(communityCommentDislikes.userId, userId)
        )
      );
    userDislikedComments = new Set(userDislikes.map((ud) => ud.commentId));
  }

  return comments.map((comment) => ({
    ...comment,
    likes: likeCountMap[comment.id] || 0,
    isLiked: userLikedComments.has(comment.id),
    dislikes: dislikeCountMap[comment.id] || 0,
    isDisliked: userDislikedComments.has(comment.id),
  }));
}

/**
 * 댓글 수정
 */
export async function updateComment(
  commentId: number,
  userId: number,
  content: string
) {
  const db = database();
  const [updated] = await db
    .update(communityComments)
    .set({ content, updatedAt: new Date() })
    .where(
      and(
        eq(communityComments.id, commentId),
        eq(communityComments.userId, userId)
      )
    )
    .returning();
  return updated;
}

/**
 * 댓글 삭제
 */
export async function deleteComment(commentId: number, userId: number) {
  const db = database();
  await db
    .delete(communityComments)
    .where(
      and(
        eq(communityComments.id, commentId),
        eq(communityComments.userId, userId)
      )
    );
}

/**
 * 게시글의 댓글 수 가져오기
 */
export async function getCommentCountsByPostIds(postIds: number[]) {
  if (postIds.length === 0) return {};

  const db = database();
  const counts = await db
    .select({
      postId: communityComments.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityComments)
    .where(inArray(communityComments.postId, postIds))
    .groupBy(communityComments.postId);

  const countMap: Record<number, number> = {};
  counts.forEach((c) => {
    countMap[c.postId] = c.count;
  });

  return countMap;
}
