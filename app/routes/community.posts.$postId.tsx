import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { getCommunityPostById } from "../database/post";
import { getCommentsByPostId } from "../database/comments";
import { Card, CardContent, CardHeader, CardTitle } from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Avatar, AvatarFallback } from "../components/avatar";
import { Input } from "../components/input";
import { ImageViewer } from "../components/image-viewer";
import { MessageCircle, ThumbsUp, ThumbsDown, ArrowLeft } from "lucide-react";
import { getRelativeTime } from "../utils/date";
import { getAuthTokenFromRequest } from "../utils/cookies";
import { validateSession } from "../database/session";
import { useState } from "react";
import { useFetcher } from "react-router";

// 플랜에 따른 아바타 생성 함수
function getAvatarByPlan(
  planName: string | null,
  userName: string | null
): string {
  if (!planName) {
    return userName?.charAt(0).toUpperCase() || "U";
  }

  switch (planName) {
    case "Free":
      return "🆓";
    case "Starter":
      return "⭐";
    case "Premium":
      return "👑";
    default:
      return userName?.charAt(0).toUpperCase() || "U";
  }
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const postId = params.postId;

  if (!postId || isNaN(Number(postId))) {
    throw new Response("잘못된 게시글 ID입니다.", { status: 400 });
  }

  // 사용자 인증 확인 (선택적)
  const token = getAuthTokenFromRequest(request);
  let currentUser = null;
  if (token) {
    currentUser = await validateSession(token);
  }

  // 게시글 정보 가져오기
  const post = await getCommunityPostById(Number(postId));

  if (!post) {
    throw new Response("게시글을 찾을 수 없습니다.", { status: 404 });
  }

  // 댓글 목록 가져오기
  const comments = await getCommentsByPostId(Number(postId), currentUser?.id);

  return {
    post: {
      ...post,
      timestamp: post.createdAt
        ? getRelativeTime(post.createdAt)
        : "알 수 없음",
    },
    comments,
    currentUser,
  };
}

export default function CommunityPostDetail() {
  const fetcher = useFetcher();
  const { post, comments, currentUser } = useLoaderData<typeof loader>();
  const [commentContent, setCommentContent] = useState("");

  // 댓글 작성
  const handleCommentSubmit = () => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!commentContent.trim()) return;

    const formData = new FormData();
    formData.append("postId", post.id.toString());
    formData.append("content", commentContent);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/comment",
    });

    setCommentContent("");
  };

  // 좋아요 토글
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

  // 싫어요 토글
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 뒤로가기 버튼 */}
        <Link to="/community">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>

        {/* 게시글 상세 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{post.category}</Badge>
                </div>
                <CardTitle className="text-2xl mb-4">{post.title}</CardTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {post.author?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{post.author || "익명"}</span>
                  </div>
                  <span>•</span>
                  <span>{post.timestamp}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 이미지 */}
            {post.imageUrl && (
              <div className="mb-4 flex justify-center">
                <ImageViewer
                  src={post.imageUrl}
                  alt={post.title}
                  className="max-h-[768px] w-auto object-contain"
                />
              </div>
            )}

            {/* 본문 */}
            <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </div>

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 좋아요/싫어요/댓글 */}
            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <button
                className={`flex items-center gap-1 hover:text-primary transition-colors ${
                  post.isLiked ? "text-red-500" : ""
                }`}
                onClick={() => handleLikeToggle(post.id, post.isLiked)}
              >
                <ThumbsUp
                  className={`w-4 h-4 ${post.isLiked ? "fill-red-500" : ""}`}
                />
                <span>{post.likes || 0}</span>
              </button>
              <button
                className={`flex items-center gap-1 hover:text-primary transition-colors ${
                  post.isDisliked ? "text-blue-500" : ""
                }`}
                onClick={() => handleDislikeToggle(post.id, post.isDisliked)}
              >
                <ThumbsDown
                  className={`w-4 h-4 ${post.isDisliked ? "fill-blue-500" : ""}`}
                />
                <span>{post.dislikes || 0}</span>
              </button>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{comments.length}</span>
              </div>
            </div>

            {/* 댓글 섹션 */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold mb-4">댓글 {comments.length}개</h3>

              {/* 댓글 작성 */}
              {currentUser && (
                <div className="mb-6 flex gap-2">
                  <Input
                    placeholder="댓글을 입력하세요..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleCommentSubmit}>
                    작성
                  </Button>
                </div>
              )}

              {/* 댓글 목록 */}
              <div className="space-y-4">
                {comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 p-4 bg-muted/30 rounded-lg"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getAvatarByPlan(comment.planName, comment.author)}
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
                            handleCommentLikeToggle(comment.id, comment.isLiked)
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
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    첫 번째 댓글을 작성해보세요!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
