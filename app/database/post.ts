import { database } from "./context";
import {
  communityPosts,
  users,
  userPlanHistory,
  plans,
  communityPostLikes,
  communityPostDislikes,
  communityComments,
} from "./schema";
import { eq, desc, and, sql, inArray, or, ilike, gte } from "drizzle-orm";

export async function createCommunityPost({
  title,
  content,
  category,
  tags,
  imageUrl,
  userId,
}: {
  title: string;
  content: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  userId: number;
}) {
  const db = database();
  const [post] = await db
    .insert(communityPosts)
    .values({
      title,
      content,
      category,
      tags,
      imageUrl: imageUrl ?? null,
      userId,
    })
    .returning();
  return post;
}

export async function getCommunityPosts(
  userId?: number,
  category?: string,
  searchQuery?: string,
  page: number = 1,
  limit: number = 10
) {
  const db = database();

  // where 조건 배열 생성
  const whereConditions = [];

  // 카테고리 필터
  if (category && category !== "all") {
    whereConditions.push(eq(communityPosts.category, category));
  }

  // 검색 쿼리 (제목 또는 내용에서 검색)
  if (searchQuery && searchQuery.trim()) {
    whereConditions.push(
      or(
        ilike(communityPosts.title, `%${searchQuery}%`),
        ilike(communityPosts.content, `%${searchQuery}%`)
      )
    );
  }

  // offset 계산
  const offset = (page - 1) * limit;

  const postsQuery = db
    .select({
      id: communityPosts.id,
      userId: communityPosts.userId,
      category: communityPosts.category,
      title: communityPosts.title,
      content: communityPosts.content,
      tags: communityPosts.tags,
      imageUrl: communityPosts.imageUrl,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
      author: users.name,
      authorEmail: users.email,
      planName: plans.name,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .leftJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit)
    .offset(offset);

  const posts = await postsQuery;

  // 좋아요 개수를 별도로 조회
  const postIds = posts.map((p) => p.id);

  const likeCounts =
    postIds.length > 0
      ? await db
          .select({
            postId: communityPostLikes.postId,
            count: sql<number>`count(*)::int`,
          })
          .from(communityPostLikes)
          .where(inArray(communityPostLikes.postId, postIds))
          .groupBy(communityPostLikes.postId)
      : [];

  const likeCountMap: Record<number, number> = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.postId] = lc.count;
  });

  // 싫어요 개수를 별도로 조회
  const dislikeCounts =
    postIds.length > 0
      ? await db
          .select({
            postId: communityPostDislikes.postId,
            count: sql<number>`count(*)::int`,
          })
          .from(communityPostDislikes)
          .where(inArray(communityPostDislikes.postId, postIds))
          .groupBy(communityPostDislikes.postId)
      : [];

  const dislikeCountMap: Record<number, number> = {};
  dislikeCounts.forEach((dc) => {
    dislikeCountMap[dc.postId] = dc.count;
  });

  // 사용자의 좋아요 상태 조회 (userId가 제공된 경우)
  let userLikedPosts: Set<number> = new Set();
  if (userId && postIds.length > 0) {
    const userLikes = await db
      .select({ postId: communityPostLikes.postId })
      .from(communityPostLikes)
      .where(
        and(
          inArray(communityPostLikes.postId, postIds),
          eq(communityPostLikes.userId, userId)
        )
      );
    userLikedPosts = new Set(userLikes.map((ul) => ul.postId));
  }

  // 사용자의 싫어요 상태 조회 (userId가 제공된 경우)
  let userDislikedPosts: Set<number> = new Set();
  if (userId && postIds.length > 0) {
    const userDislikes = await db
      .select({ postId: communityPostDislikes.postId })
      .from(communityPostDislikes)
      .where(
        and(
          inArray(communityPostDislikes.postId, postIds),
          eq(communityPostDislikes.userId, userId)
        )
      );
    userDislikedPosts = new Set(userDislikes.map((ud) => ud.postId));
  }

  // 댓글 개수 조회
  const commentCounts = await db
    .select({
      postId: communityComments.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityComments)
    .where(inArray(communityComments.postId, postIds))
    .groupBy(communityComments.postId);

  const commentCountMap: Record<number, number> = {};
  commentCounts.forEach((cc) => {
    commentCountMap[cc.postId] = cc.count;
  });

  // 게시글에 좋아요/싫어요/댓글 정보 추가
  return posts.map((post) => ({
    ...post,
    likes: likeCountMap[post.id] || 0,
    isLiked: userLikedPosts.has(post.id),
    dislikes: dislikeCountMap[post.id] || 0,
    isDisliked: userDislikedPosts.has(post.id),
    comments: commentCountMap[post.id] || 0,
  }));
}

export async function getCommunityPostById(id: number, userId?: number) {
  const db = database();

  const postQuery = await db
    .select({
      id: communityPosts.id,
      userId: communityPosts.userId,
      category: communityPosts.category,
      title: communityPosts.title,
      content: communityPosts.content,
      tags: communityPosts.tags,
      imageUrl: communityPosts.imageUrl,
      createdAt: communityPosts.createdAt,
      updatedAt: communityPosts.updatedAt,
      author: users.name,
      authorEmail: users.email,
      planName: plans.name,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .leftJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(eq(communityPosts.id, id))
    .limit(1);

  const post = postQuery[0];
  if (!post) return null;

  // 좋아요 개수 조회
  const likeCount = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(communityPostLikes)
    .where(eq(communityPostLikes.postId, id));

  // 싫어요 개수 조회
  const dislikeCount = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(communityPostDislikes)
    .where(eq(communityPostDislikes.postId, id));

  // 사용자의 좋아요/싫어요 상태 조회
  let isLiked = false;
  let isDisliked = false;

  if (userId) {
    const userLike = await db
      .select()
      .from(communityPostLikes)
      .where(
        and(
          eq(communityPostLikes.postId, id),
          eq(communityPostLikes.userId, userId)
        )
      )
      .limit(1);
    isLiked = userLike.length > 0;

    const userDislike = await db
      .select()
      .from(communityPostDislikes)
      .where(
        and(
          eq(communityPostDislikes.postId, id),
          eq(communityPostDislikes.userId, userId)
        )
      )
      .limit(1);
    isDisliked = userDislike.length > 0;
  }

  return {
    ...post,
    likes: likeCount[0]?.count || 0,
    isLiked,
    dislikes: dislikeCount[0]?.count || 0,
    isDisliked,
  };
}

export async function updateCommunityPost(
  id: number,
  data: Partial<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    imageUrl?: string;
  }>
) {
  const db = database();
  return db
    .update(communityPosts)
    .set(data)
    .where(eq(communityPosts.id, id))
    .returning();
}

export async function deleteCommunityPost(id: number) {
  const db = database();
  return db.delete(communityPosts).where(eq(communityPosts.id, id));
}

// 카테고리별 게시글 수 가져오기
export async function getCategoryCount() {
  const db = database();

  const result = await db
    .select({
      category: communityPosts.category,
      count: sql<number>`count(*)::int`,
    })
    .from(communityPosts)
    .groupBy(communityPosts.category);

  // 전체 게시글 수
  const totalResult = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(communityPosts);

  const categoryCounts: Record<string, number> = {
    all: totalResult[0]?.count || 0,
  };

  result.forEach((row) => {
    categoryCounts[row.category] = row.count;
  });

  return categoryCounts;
}

// 현재 필터 조건에 맞는 게시글 총 개수 조회
export async function getCommunityPostsCount(
  category?: string,
  searchQuery?: string
) {
  const db = database();

  // where 조건 배열 생성 (getCommunityPosts와 동일한 로직)
  const whereConditions = [];

  if (category && category !== "all") {
    whereConditions.push(eq(communityPosts.category, category));
  }

  if (searchQuery && searchQuery.trim()) {
    whereConditions.push(
      or(
        ilike(communityPosts.title, `%${searchQuery}%`),
        ilike(communityPosts.content, `%${searchQuery}%`)
      )
    );
  }

  const result = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(communityPosts)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

  return result[0]?.count || 0;
}

// 당일(24시간) Hot 게시글 조회 - 좋아요 많은 순 5개
export async function getDailyHotPosts(userId?: number) {
  const db = database();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 24시간 이내 게시글 중 좋아요가 많은 순으로 조회
  const posts = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      category: communityPosts.category,
      userId: communityPosts.userId,
      createdAt: communityPosts.createdAt,
      author: users.name,
      planName: plans.name,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .leftJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(gte(communityPosts.createdAt, oneDayAgo))
    .orderBy(desc(communityPosts.createdAt))
    .limit(100); // 최근 100개 중에서 좋아요 많은 순으로 정렬

  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  // 좋아요 개수 조회
  const likeCounts = await db
    .select({
      postId: communityPostLikes.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityPostLikes)
    .where(inArray(communityPostLikes.postId, postIds))
    .groupBy(communityPostLikes.postId);

  const likeCountMap: Record<number, number> = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.postId] = lc.count;
  });

  // 사용자의 좋아요 상태 조회
  let userLikedPosts: Set<number> = new Set();
  if (userId && postIds.length > 0) {
    const userLikes = await db
      .select({ postId: communityPostLikes.postId })
      .from(communityPostLikes)
      .where(
        and(
          inArray(communityPostLikes.postId, postIds),
          eq(communityPostLikes.userId, userId)
        )
      );
    userLikedPosts = new Set(userLikes.map((ul) => ul.postId));
  }

  // 좋아요 개수 추가 및 정렬
  const postsWithLikes = posts.map((post) => ({
    ...post,
    likes: likeCountMap[post.id] || 0,
    isLiked: userLikedPosts.has(post.id),
  }));

  // 좋아요 많은 순으로 정렬 후 상위 5개 반환
  return postsWithLikes.sort((a, b) => b.likes - a.likes).slice(0, 5);
}

// 주간(7일) Hot 게시글 조회 - 좋아요 많은 순 5개
export async function getWeeklyHotPosts(userId?: number) {
  const db = database();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 7일 이내 게시글 중 좋아요가 많은 순으로 조회
  const posts = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      category: communityPosts.category,
      userId: communityPosts.userId,
      createdAt: communityPosts.createdAt,
      author: users.name,
      planName: plans.name,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.id))
    .leftJoin(
      userPlanHistory,
      and(
        eq(userPlanHistory.userId, users.id),
        eq(userPlanHistory.isActive, true)
      )
    )
    .leftJoin(plans, eq(userPlanHistory.planId, plans.id))
    .where(gte(communityPosts.createdAt, oneWeekAgo))
    .orderBy(desc(communityPosts.createdAt))
    .limit(200); // 최근 200개 중에서 좋아요 많은 순으로 정렬

  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  // 좋아요 개수 조회
  const likeCounts = await db
    .select({
      postId: communityPostLikes.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(communityPostLikes)
    .where(inArray(communityPostLikes.postId, postIds))
    .groupBy(communityPostLikes.postId);

  const likeCountMap: Record<number, number> = {};
  likeCounts.forEach((lc) => {
    likeCountMap[lc.postId] = lc.count;
  });

  // 사용자의 좋아요 상태 조회
  let userLikedPosts: Set<number> = new Set();
  if (userId && postIds.length > 0) {
    const userLikes = await db
      .select({ postId: communityPostLikes.postId })
      .from(communityPostLikes)
      .where(
        and(
          inArray(communityPostLikes.postId, postIds),
          eq(communityPostLikes.userId, userId)
        )
      );
    userLikedPosts = new Set(userLikes.map((ul) => ul.postId));
  }

  // 좋아요 개수 추가 및 정렬
  const postsWithLikes = posts.map((post) => ({
    ...post,
    likes: likeCountMap[post.id] || 0,
    isLiked: userLikedPosts.has(post.id),
  }));

  // 좋아요 많은 순으로 정렬 후 상위 5개 반환
  return postsWithLikes.sort((a, b) => b.likes - a.likes).slice(0, 5);
}

// 커뮤니티 통계 조회
export async function getCommunityStats() {
  const db = database();

  // 1. 전체 회원 수
  const totalUsersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const totalUsers = totalUsersResult[0]?.count || 0;

  // 2. 활성 토론 (전체 게시글 수)
  const totalPostsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(communityPosts);
  const totalPosts = totalPostsResult[0]?.count || 0;

  // 3. 인기글 (좋아요 10개 이상)
  const popularPostsResult = await db
    .select({
      postId: communityPostLikes.postId,
      count: sql<number>`count(*)`,
    })
    .from(communityPostLikes)
    .groupBy(communityPostLikes.postId)
    .having(sql`count(*) >= 10`);
  const popularPosts = popularPostsResult.length;

  return {
    totalUsers,
    totalPosts,
    popularPosts,
  };
}
