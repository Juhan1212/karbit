import type { LoaderFunctionArgs } from "react-router";
import {
  getCommunityPosts,
  getCategoryCount,
  getCommunityPostsCount,
  getDailyHotPosts,
  getWeeklyHotPosts,
  getCommunityStats,
} from "../database/post";
import {
  trackVisitor,
  getTodayVisitorCount,
} from "../database/visitor-tracker";
import { useState, useEffect } from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Avatar, AvatarFallback } from "../components/avatar";
import { Input } from "../components/input";
import { Textarea } from "../components/textarea";
import { ImageViewer } from "../components/image-viewer";
import { toast } from "sonner";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Share2,
  TrendingUp,
  Users,
  Plus,
  Search,
  Filter,
  Pin,
  Clock,
  Eye,
} from "lucide-react";
import { AdBanner } from "../components/banner";
import { getRelativeTime } from "../utils/date";
import { getAuthTokenFromRequest } from "../utils/cookies";
import { validateSession } from "../database/session";

// 플랜에 따른 아바타 생성 함수
function getAvatarByPlan(
  planName: string | null,
  userName: string | null
): string {
  // 플랜이 없으면 사용자 이름의 첫 글자 반환
  if (!planName) {
    return userName?.charAt(0).toUpperCase() || "U";
  }

  // 플랜에 따라 이모지 아바타 반환
  switch (planName) {
    case "Free":
      return "🆓"; // Free 플랜
    case "Starter":
      return "⭐"; // Starter 플랜
    case "Premium":
      return "👑"; // Premium 플랜
    default:
      return userName?.charAt(0).toUpperCase() || "U";
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  // 사용자 인증 확인 (선택적)
  const token = getAuthTokenFromRequest(request);
  let currentUser = null;
  if (token) {
    currentUser = await validateSession(token);
  }

  // 방문자 추적 (IP + 사용자 ID 조합으로 고유성 보장)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor
    ? forwardedFor.split(",")[0]
    : request.headers.get("x-real-ip") || "unknown";

  // 개발 환경에서는 IP가 동일할 수 있으므로 사용자 ID나 랜덤 세션을 함께 사용
  const userAgent = request.headers.get("user-agent") || "unknown";
  const visitorId = currentUser
    ? `user-${currentUser.id}`
    : `${ip}-${userAgent.slice(0, 50)}`; // IP + User Agent 조합

  console.log(`[Community Loader] 방문자 ID: ${visitorId}`);
  trackVisitor(visitorId);

  // URL 쿼리 파라미터에서 카테고리와 검색어 가져오기
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "all";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10; // 페이지당 게시글 수

  const posts = await getCommunityPosts(
    currentUser?.id,
    category,
    search,
    page,
    limit
  );
  const categoryCounts = await getCategoryCount();
  const totalPosts = await getCommunityPostsCount(category, search);
  const totalPages = Math.ceil(totalPosts / limit);

  // Hot 게시글 가져오기
  const dailyHotPosts = await getDailyHotPosts(currentUser?.id);
  const weeklyHotPosts = await getWeeklyHotPosts(currentUser?.id);

  // 통계 가져오기
  const stats = await getCommunityStats();
  const todayVisitors = getTodayVisitorCount();

  // timestamp와 avatar 추가
  const postsWithMetadata = posts.map((post) => ({
    ...post,
    timestamp: post.createdAt ? getRelativeTime(post.createdAt) : "알 수 없음",
    avatar: getAvatarByPlan(post.planName, post.author),
  }));

  return {
    posts: postsWithMetadata,
    currentUser,
    categoryCounts,
    dailyHotPosts,
    weeklyHotPosts,
    stats: {
      totalUsers: stats.totalUsers,
      todayVisitors,
      activePosts: stats.totalPosts,
      popularPosts: stats.popularPosts,
    },
    pagination: {
      currentPage: page,
      totalPages,
      totalPosts,
      limit,
    },
  };
}

export default function Community() {
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    posts,
    currentUser,
    categoryCounts,
    dailyHotPosts,
    weeklyHotPosts,
    stats,
    pagination,
  } = useLoaderData() as {
    posts: any[];
    currentUser: any;
    categoryCounts: Record<string, number>;
    dailyHotPosts: any[];
    weeklyHotPosts: any[];
    stats: {
      totalUsers: number;
      todayVisitors: number;
      activePosts: number;
      popularPosts: number;
    };
    pagination: {
      currentPage: number;
      totalPages: number;
      totalPosts: number;
      limit: number;
    };
  };
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("discussion");
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );

  // 스팸 방지를 위한 상태
  const [postTimestamps, setPostTimestamps] = useState<number[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // 댓글 관련 상태
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState<Record<number, string>>(
    {}
  );
  const [postComments, setPostComments] = useState<Record<number, any[]>>({});

  // 댓글 작성 후 목록 새로고침
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.success &&
      expandedPostId !== null
    ) {
      // 댓글이 작성되었으면 해당 게시글의 댓글 목록을 다시 불러옴
      const refreshComments = async () => {
        try {
          const response = await fetch(`/api/comments/${expandedPostId}`);
          const data = await response.json();
          setPostComments((prev) => ({
            ...prev,
            [expandedPostId]: data.comments,
          }));
        } catch (error) {
          console.error("댓글 새로고침 실패:", error);
        }
      };
      refreshComments();
    }
  }, [fetcher.state, fetcher.data, expandedPostId]);

  // 좋아요 토글 함수
  const handleLikeToggle = (postId: number, isCurrentlyLiked: boolean) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("postId", postId.toString());
    formData.append("action", isCurrentlyLiked ? "unlike" : "like");

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/post-like",
    });
  };

  // 싫어요 토글 함수
  const handleDislikeToggle = (
    postId: number,
    isCurrentlyDisliked: boolean
  ) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("postId", postId.toString());
    formData.append("action", isCurrentlyDisliked ? "undislike" : "dislike");

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/post-dislike",
    });
  };

  // 댓글 토글 (확장/축소)
  const handleCommentToggle = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      // 댓글을 아직 불러오지 않았다면 불러오기
      if (!postComments[postId]) {
        try {
          const response = await fetch(`/api/comments/${postId}`);
          const data = await response.json();
          setPostComments((prev) => ({ ...prev, [postId]: data.comments }));
        } catch (error) {
          console.error("댓글 로드 실패:", error);
        }
      }
    }
  };

  // 댓글 작성
  const handleCommentSubmit = (postId: number) => {
    const content = commentContent[postId];
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!content?.trim()) return;

    const formData = new FormData();
    formData.append("postId", postId.toString());
    formData.append("content", content);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/comment",
    });

    // 댓글 입력창 초기화
    setCommentContent((prev) => ({ ...prev, [postId]: "" }));
  };

  // 댓글 좋아요 토글
  const handleCommentLikeToggle = (
    commentId: number,
    isCurrentlyLiked: boolean
  ) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("commentId", commentId.toString());
    formData.append("action", isCurrentlyLiked ? "unlike" : "like");

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/comment-like",
    });
  };

  // 댓글 싫어요 토글
  const handleCommentDislikeToggle = (
    commentId: number,
    isCurrentlyDisliked: boolean
  ) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }

    const formData = new FormData();
    formData.append("commentId", commentId.toString());
    formData.append("action", isCurrentlyDisliked ? "undislike" : "dislike");

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/comment-dislike",
    });
  };

  // 공유 버튼 - URL 복사
  const handleShare = (postId: number) => {
    const url = `${window.location.origin}/community/posts/${postId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert("게시글 링크가 복사되었습니다!");
      })
      .catch(() => {
        alert("링크 복사에 실패했습니다.");
      });
  };
  // 동적 통계 데이터
  const statsData = [
    {
      label: "전체 회원",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
    },
    {
      label: "오늘 방문자",
      value: stats.todayVisitors.toLocaleString(),
      icon: Eye,
    },
    {
      label: "활성 토론",
      value: stats.activePosts.toLocaleString(),
      icon: MessageCircle,
    },
    {
      label: "인기 글",
      value: stats.popularPosts.toLocaleString(),
      icon: TrendingUp,
    },
  ];

  const handleTagToggle = (tag: string) => {
    setNewPostTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("이미지 파일은 5MB 이하만 첨부 가능합니다.");
        return;
      }
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePostSubmit = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    // 스팸 방지: 1분 내 10개 이상 게시글 작성 확인
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const recentPosts = postTimestamps.filter((time) => time > oneMinuteAgo);

    if (recentPosts.length >= 10) {
      toast.error("과도한 도배 게시글을 방지하고자 1분간 채팅을 금합니다");
      setIsRateLimited(true);
      // 1분 후 제한 해제
      setTimeout(() => {
        setIsRateLimited(false);
        setPostTimestamps([]);
      }, 60 * 1000);
      return;
    }

    const formData = new FormData();
    formData.append("title", newPostTitle);
    formData.append("content", newPostContent);
    formData.append("category", newPostCategory);
    newPostTags.forEach((tag) => formData.append("tags", tag));
    if (newPostImage) {
      formData.append("image", newPostImage);
    }
    fetcher.submit(formData, {
      method: "POST",
      action: "/api/community-post",
      encType: "multipart/form-data", // 파일 업로드를 위한 필수 설정
    });

    // 게시글 작성 시간 기록
    setPostTimestamps([...recentPosts, now]);

    setNewPostTitle("");
    setNewPostContent("");
    setNewPostCategory("discussion");
    setNewPostTags([]);
    setNewPostImage(null);
    setImagePreview(null);
  };

  // 카테고리 변경 핸들러
  const handleCategoryChange = (categoryId: string) => {
    const newParams: Record<string, string> = { category: categoryId };
    const currentSearch = searchParams.get("search");
    if (currentSearch) {
      newParams.search = currentSearch;
    }
    // 카테고리 변경 시 페이지는 1로 리셋
    newParams.page = "1";
    setSearchParams(newParams);
  };

  // 검색 핸들러
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const newParams: Record<string, string> = {};
    const currentCategory = searchParams.get("category");
    if (currentCategory) {
      newParams.category = currentCategory;
    }
    if (query.trim()) {
      newParams.search = query;
    }
    // 검색 시 페이지는 1로 리셋
    newParams.page = "1";
    setSearchParams(newParams);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    const newParams: Record<string, string> = { page: newPage.toString() };
    const currentCategory = searchParams.get("category");
    const currentSearch = searchParams.get("search");
    if (currentCategory) {
      newParams.category = currentCategory;
    }
    if (currentSearch) {
      newParams.search = currentSearch;
    }
    setSearchParams(newParams);
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 현재 선택된 카테고리
  const currentCategory = searchParams.get("category") || "all";

  // 카테고리 목록 (실제 카운트 사용)
  const categories = [
    { id: "all", label: "전체", count: categoryCounts.all || 0 },
    {
      id: "discussion",
      label: "자유토론",
      count: categoryCounts.discussion || 0,
    },
    { id: "question", label: "질문답변", count: categoryCounts.question || 0 },
    { id: "showcase", label: "수익인증", count: categoryCounts.showcase || 0 },
    {
      id: "announcement",
      label: "공지사항",
      count: categoryCounts.announcement || 0,
    },
  ];

  // Helper function to get category label
  const getCategoryLabel = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.label : categoryId;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1>커뮤니티</h1>
          <p className="text-muted-foreground">
            트레이더들과 전략을 공유하고 소통하세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl font-semibold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ad Banner */}
      <AdBanner type="horizontal" closable />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="게시글 검색... (엔터로 검색)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch(searchQuery);
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleSearch(searchQuery)}
                >
                  <Search className="w-4 h-4" />
                  검색
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* New Post */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />새 게시글 작성
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 카테고리 선택 */}
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm font-medium">카테고리</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                >
                  <option value="discussion">자유토론</option>
                  <option value="question">질문답변</option>
                  <option value="showcase">수익인증</option>
                  <option value="announcement">공지사항</option>
                </select>
              </div>
              {/* 태그 선택 */}
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm font-medium">태그</label>
                {[
                  "김치프리미엄",
                  "자동매매",
                  "수익인증",
                  "공지",
                  "분석",
                  "질문",
                  "시황",
                  "BTC",
                  "ETH",
                  "SOL",
                  "XRP",
                  "알트코인",
                ].map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={newPostTags.includes(tag) ? "default" : "outline"}
                    className="text-xs px-2 py-1"
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
              {/* 이미지 첨부 */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  이미지 첨부 (5MB 이하)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      document.getElementById("image-upload-input")?.click()
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                      />
                    </svg>
                    이미지 첨부
                  </Button>
                  {imagePreview && (
                    <>
                      <img
                        src={imagePreview}
                        alt="미리보기"
                        className="max-h-20 rounded border ml-2"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewPostImage(null);
                          setImagePreview(null);
                        }}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {/* 제목/내용 */}
              <Input
                placeholder="제목을 입력하세요"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                maxLength={100}
              />
              <Textarea
                placeholder="트레이딩 경험이나 질문을 공유해보세요..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handlePostSubmit}
                  disabled={
                    !newPostTitle.trim() ||
                    !newPostContent.trim() ||
                    !newPostCategory
                  }
                >
                  게시하기
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchParams.get("search")
                      ? `"${searchParams.get("search")}"에 대한 검색 결과가 없습니다.`
                      : "게시글이 없습니다."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className={
                    post.isPinned ? "border-primary/50 bg-primary/5" : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{post.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {post.isPinned && (
                            <Pin className="w-4 h-4 text-primary" />
                          )}
                          <span className="font-medium">{post.author}</span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.timestamp}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-2">{post.title}</h3>
                        {post.imageUrl && (
                          <ImageViewer
                            src={post.imageUrl}
                            alt="첨부 이미지"
                            className="max-h-80 w-auto object-contain border rounded"
                          />
                        )}
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {post.tags.map((tag: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <button
                              className={`flex items-center gap-1 hover:text-primary transition-colors ${
                                post.isLiked ? "text-red-500" : ""
                              }`}
                              onClick={() =>
                                handleLikeToggle(post.id, post.isLiked)
                              }
                            >
                              <ThumbsUp
                                className={`w-3 h-3 ${post.isLiked ? "fill-red-500" : ""}`}
                              />
                              {post.likes}
                            </button>
                            <button
                              className={`flex items-center gap-1 hover:text-primary transition-colors ${
                                post.isDisliked ? "text-blue-500" : ""
                              }`}
                              onClick={() =>
                                handleDislikeToggle(post.id, post.isDisliked)
                              }
                            >
                              <ThumbsDown
                                className={`w-3 h-3 ${post.isDisliked ? "fill-blue-500" : ""}`}
                              />
                              {post.dislikes}
                            </button>
                            <button
                              className="flex items-center gap-1 hover:text-primary"
                              onClick={() => handleCommentToggle(post.id)}
                            >
                              <MessageCircle className="w-3 h-3" />
                              {post.comments}
                            </button>
                            <button
                              className="flex items-center gap-1 hover:text-primary"
                              onClick={() => handleShare(post.id)}
                            >
                              <Share2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 댓글 섹션 */}
                    {expandedPostId === post.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        {/* 댓글 작성 */}
                        {currentUser && (
                          <div className="mb-4 flex gap-2">
                            <Input
                              placeholder="댓글을 입력하세요..."
                              value={commentContent[post.id] || ""}
                              onChange={(e) =>
                                setCommentContent((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleCommentSubmit(post.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCommentSubmit(post.id)}
                            >
                              작성
                            </Button>
                          </div>
                        )}

                        {/* 댓글 목록 */}
                        <div className="space-y-3">
                          {postComments[post.id]?.map((comment: any) => (
                            <div
                              key={comment.id}
                              className="flex gap-3 p-3 bg-muted/30 rounded-lg"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {getAvatarByPlan(
                                    comment.planName,
                                    comment.author
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {comment.author || "익명"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {comment.createdAt
                                      ? getRelativeTime(comment.createdAt)
                                      : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground mb-2">
                                  {comment.content}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <button
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${
                                      comment.isLiked ? "text-red-500" : ""
                                    }`}
                                    onClick={() =>
                                      handleCommentLikeToggle(
                                        comment.id,
                                        comment.isLiked
                                      )
                                    }
                                  >
                                    <ThumbsUp
                                      className={`w-3 h-3 ${comment.isLiked ? "fill-red-500" : ""}`}
                                    />
                                    {comment.likes}
                                  </button>
                                  <button
                                    className={`flex items-center gap-1 hover:text-primary transition-colors ${
                                      comment.isDisliked ? "text-blue-500" : ""
                                    }`}
                                    onClick={() =>
                                      handleCommentDislikeToggle(
                                        comment.id,
                                        comment.isDisliked
                                      )
                                    }
                                  >
                                    <ThumbsDown
                                      className={`w-3 h-3 ${comment.isDisliked ? "fill-blue-500" : ""}`}
                                    />
                                    {comment.dislikes}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {postComments[post.id]?.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              첫 번째 댓글을 작성해보세요!
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPosts > 0 && (
            <div className="flex justify-center gap-1 mt-6 flex-wrap">
              {/* 처음 */}
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === 1}
                onClick={() => handlePageChange(1)}
                className="min-w-[40px]"
              >
                ≪
              </Button>
              {/* 이전 */}
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className="min-w-[40px]"
              >
                이전
              </Button>
              {/* 페이지 번호 버튼 */}
              {(() => {
                const pageButtons = [];
                const start = Math.max(1, pagination.currentPage - 2);
                const end = Math.min(
                  pagination.totalPages,
                  pagination.currentPage + 2
                );
                for (let i = start; i <= end; i++) {
                  pageButtons.push(
                    <Button
                      key={i}
                      size="sm"
                      variant={
                        i === pagination.currentPage ? "default" : "outline"
                      }
                      onClick={() => handlePageChange(i)}
                      className="min-w-[40px]"
                      disabled={i === pagination.currentPage}
                    >
                      {i}
                    </Button>
                  );
                }
                return pageButtons;
              })()}
              {/* 다음 */}
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="min-w-[40px]"
              >
                다음
              </Button>
              {/* 마지막 */}
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handlePageChange(pagination.totalPages)}
                className="min-w-[40px]"
              >
                ≫
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>카테고리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`w-full flex items-center justify-between p-2 text-sm rounded-lg hover:bg-gray-700/50 text-left transition-colors ${
                    currentCategory === category.id
                      ? "bg-gray-700/70 border-2 border-gray-600"
                      : ""
                  }`}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  <span>{category.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Ad Banner - Vertical */}
          <AdBanner type="vertical" closable />

          {/* Daily Hot Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                24시간 Hot 게시글
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {dailyHotPosts.length > 0 ? (
                  dailyHotPosts.map((post, index) => (
                    <a
                      key={post.id}
                      href={`/community/posts/${post.id}`}
                      className="flex items-start justify-between hover:bg-gray-700/50 p-2 rounded-lg transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">
                            #{index + 1}
                          </span>
                          <span className="text-sm group-hover:text-blue-400 transition-colors line-clamp-1">
                            {post.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {post.author}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(post.category)}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant={index === 0 ? "default" : "secondary"}
                        className="text-xs ml-2"
                      >
                        ❤️ {post.likes}
                      </Badge>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    아직 Hot 게시글이 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Hot Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                주간 Hot 게시글
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {weeklyHotPosts.length > 0 ? (
                  weeklyHotPosts.map((post, index) => (
                    <a
                      key={post.id}
                      href={`/community/posts/${post.id}`}
                      className="flex items-start justify-between hover:bg-gray-700/50 p-2 rounded-lg transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400">
                            #{index + 1}
                          </span>
                          <span className="text-sm group-hover:text-blue-400 transition-colors line-clamp-1">
                            {post.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {post.author}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(post.category)}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant={index === 0 ? "default" : "secondary"}
                        className="text-xs ml-2"
                      >
                        ❤️ {post.likes}
                      </Badge>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    아직 Hot 게시글이 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Online Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                온라인 회원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["TK", "CE", "PM", "NT", "AB"].map((user, index) => (
                  <Avatar key={index} className="w-8 h-8">
                    <AvatarFallback className="text-xs">{user}</AvatarFallback>
                  </Avatar>
                ))}
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-xs text-muted-foreground">
                  +7
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
