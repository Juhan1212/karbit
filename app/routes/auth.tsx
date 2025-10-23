import React, { useState, useEffect } from "react";
import { useNavigate, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useAuthActions } from "~/stores";
import { Button } from "../components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Input } from "../components/input";
import { Label } from "../components/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/tabs";
import { Checkbox } from "../components/checkbox";
import { Badge } from "../components/badge";
import { Separator } from "../components/separator";
import {
  BarChart3,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Shield,
  CheckCircle,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthTokenFromRequest } from "~/utils/cookies";

// Loader 함수: 라우트 진입 전에 인증 상태 확인
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (token) {
      // 서버에서만 동적으로 import
      const { validateSession } = await import("~/database/session");
      const user = await validateSession(token);

      if (user) {
        // 이미 인증된 사용자는 대시보드로 리다이렉트
        throw redirect("/dashboard");
      }
    }
  } catch (error) {
    // redirect는 throw해야 하므로 여기서 다시 throw
    if (error instanceof Response) {
      throw error;
    }
    // 다른 에러는 무시하고 auth 페이지로 진행
    console.error("Auth loader error:", error);
  }

  return null;
}

// 클라이언트 전용 래퍼 컴포넌트
function AuthClient() {
  const { login, signup } = useAuthActions();
  return <AuthContent login={login} signup={signup} />;
}

// 실제 Auth 컴포넌트 로직
function AuthContent({
  login,
  signup,
}: {
  login: ReturnType<typeof useAuthActions>["login"];
  signup: ReturnType<typeof useAuthActions>["signup"];
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 세션에서 구글 정보 가져오기
  const [googleSignupData, setGoogleSignupData] = useState<{
    email: string;
    name: string;
    googleId: string;
    googleAvatar: string;
    isGoogleSignup: boolean;
  } | null>(null);

  useEffect(() => {
    // URL에서 파라미터 확인
    const params = new URLSearchParams(window.location.search);

    // 탭 파라미터가 있으면 해당 탭으로 전환
    const tab = params.get("tab");
    if (tab === "signup" || tab === "login") {
      setActiveTab(tab);
    }

    // 로그인 실패 파라미터 확인
    const loginStatus = params.get("login");
    if (loginStatus === "fail") {
      toast.error("가입되지 않은 사용자입니다.");
    }
  }, []);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<{
    terms?: boolean;
    privacy?: boolean;
  }>({});

  // 비밀번호 일치 여부 확인
  const passwordsMatch = signupData.password === signupData.confirmPassword;
  const showPasswordMatch = signupData.confirmPassword.length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!loginData.email || !loginData.password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(loginData.email, loginData.password);

      if (result.success) {
        toast.success("로그인에 성공했습니다!");
        navigate("/dashboard");
      } else {
        toast.error(
          result.message || "이메일 또는 비밀번호가 올바르지 않습니다."
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signupData.agreeTerms) {
      setValidationError({ terms: true });
      toast.error("이용약관에 동의해주세요.");
      setIsLoading(false);
      return;
    }

    if (!signupData.agreePrivacy) {
      setValidationError({ privacy: true });
      toast.error("개인정보처리방침에 동의해주세요.");
      setIsLoading(false);
      return;
    }

    // 일반 회원가입
    if (!signupData.username || !signupData.email || !signupData.password) {
      toast.error("필수 정보를 모두 입력해주세요.");
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      toast.error("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    setValidationError({});
    try {
      const result = await signup(
        signupData.username,
        signupData.email,
        signupData.password
      );

      if (result.success) {
        toast.success("회원가입이 완료되었습니다!");
        navigate("/dashboard");
      } else {
        toast.error(result.message || "회원가입 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="absolute top-4 left-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Button>

          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/karbit-logo.png"
              alt="Karbit Logo"
              className="w-40 h-40 object-contain"
            />
          </div>

          <p className="text-muted-foreground">
            김치 프리미엄 자동매매로 안정적인 수익을 시작하세요
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="gap-1 mb-2">
                <Shield className="w-3 h-3" />
                안전한 거래 보장
              </Badge>
              <CardTitle>
                계정 {activeTab === "login" ? "로그인" : "생성"}
              </CardTitle>
              <CardDescription>
                {activeTab === "login"
                  ? "기존 계정으로 로그인하여 대시보드에 접속하세요"
                  : "몇 초만에 계정을 만들고 바로 시작하세요"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="이메일을 입력하세요"
                        value={loginData.email}
                        onChange={(e) =>
                          setLoginData({ ...loginData, email: e.target.value })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {/* <Checkbox
                        id="remember"
                        checked={loginData.remember}
                        onCheckedChange={(checked) =>
                          setLoginData({
                            ...loginData,
                            remember: checked as boolean,
                          })
                        }
                      />
                      <Label htmlFor="remember" className="text-sm">
                        로그인 상태 유지
                      </Label> */}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="p-0 text-sm"
                      onClick={() => navigate("/forgot-password")}
                    >
                      비밀번호 찾기
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Form */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">닉네임 *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="닉네임을 입력하세요"
                        value={signupData.username}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            username: e.target.value,
                          })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">이메일 *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="이메일을 입력하세요"
                        value={signupData.email}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            email: e.target.value,
                          })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">비밀번호 *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="8자 이상 영문, 숫자 조합"
                        value={signupData.password}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            password: e.target.value,
                          })
                        }
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">
                      비밀번호 확인 *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력하세요"
                        value={signupData.confirmPassword}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 비밀번호 일치 확인 메시지 */}
                  {showPasswordMatch && (
                    <div className="text-sm">
                      {passwordsMatch ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          비밀번호가 일치합니다.
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <Lock className="w-4 h-4" />
                          비밀번호가 불일치합니다.
                        </span>
                      )}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agree-terms"
                        checked={signupData.agreeTerms}
                        onCheckedChange={(checked) =>
                          setSignupData({
                            ...signupData,
                            agreeTerms: checked as boolean,
                          })
                        }
                        required
                        style={
                          validationError.terms
                            ? { outline: "2px solid red" }
                            : {}
                        }
                      />
                      <Label
                        htmlFor="agree-terms"
                        className="text-sm leading-tight flex items-center gap-1"
                      >
                        <span className="text-destructive">*</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-sm underline"
                          onClick={() => navigate("/terms-service")}
                          type="button"
                        >
                          이용약관
                        </Button>
                        에 동의합니다
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agree-privacy"
                        checked={signupData.agreePrivacy}
                        onCheckedChange={(checked) =>
                          setSignupData({
                            ...signupData,
                            agreePrivacy: checked as boolean,
                          })
                        }
                        required
                        style={
                          validationError.privacy
                            ? { outline: "2px solid red" }
                            : {}
                        }
                      />
                      <Label
                        htmlFor="agree-privacy"
                        className="text-sm leading-tight flex items-center gap-1"
                      >
                        <span className="text-destructive">*</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-sm underline"
                          onClick={() => navigate("/privacy-policy")}
                          type="button"
                        >
                          개인정보처리방침
                        </Button>
                        에 동의합니다
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agree-marketing"
                        checked={signupData.agreeMarketing}
                        onCheckedChange={(checked) =>
                          setSignupData({
                            ...signupData,
                            agreeMarketing: checked as boolean,
                          })
                        }
                      />
                      <Label
                        htmlFor="agree-marketing"
                        className="text-sm leading-tight"
                      >
                        마케팅 정보 수신에 동의합니다 (선택)
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white"
                    disabled={
                      isLoading ||
                      !passwordsMatch ||
                      !signupData.agreeTerms ||
                      !signupData.agreePrivacy ||
                      !signupData.username ||
                      !signupData.email ||
                      !signupData.password ||
                      !signupData.confirmPassword
                    }
                  >
                    {isLoading ? "계정 생성 중..." : "계정 만들기"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Social Login Divider */}
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
                또는
              </span>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  if (activeTab === "signup") {
                    if (!signupData.agreeTerms) {
                      setValidationError({ terms: true });
                      toast.error("이용약관에 동의해주세요.");
                      setIsLoading(false);
                      return;
                    }

                    if (!signupData.agreePrivacy) {
                      setValidationError({ privacy: true });
                      toast.error("개인정보처리방침에 동의해주세요.");
                      setIsLoading(false);
                      return;
                    }
                  }

                  // 현재 탭에 따라 다른 URL로 이동
                  const url =
                    activeTab === "signup"
                      ? "/api/auth/google?mode=signup"
                      : "/api/auth/google";
                  window.location.href = url;
                }}
                type="button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google {activeTab === "login" ? "로그인" : "회원가입"}
              </Button>
              {/* <Button variant="outline" className="w-full gap-2" disabled>
                <div className="w-5 h-5 bg-yellow-400 rounded"></div>
                카카오로 계속하기
              </Button> */}
            </div>

            {/* Trust Indicators */}
            <div className="mt-6 p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  안전하고 신뢰할 수 있는 서비스
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>SSL 암호화로 개인정보 보호</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span>은행 수준의 보안 시스템</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span>500+ 사용자가 신뢰하는 서비스</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            가입 시 Karbit의{" "}
            <Button
              variant="link"
              size="sm"
              className="p-0 text-xs underline"
              onClick={() => navigate("/terms-service")}
            >
              이용약관
            </Button>{" "}
            및{" "}
            <Button
              variant="link"
              size="sm"
              className="p-0 text-xs underline"
              onClick={() => navigate("/privacy-policy")}
            >
              개인정보처리방침
            </Button>
            에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// SSR 호환을 위한 기본 export
export default function Auth() {
  // 클라이언트에서만 렌더링
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // SSR 중에는 로딩 화면 표시
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <AuthClient />;
}
