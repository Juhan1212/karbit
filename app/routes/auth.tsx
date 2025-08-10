import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useUser, useAuthActions } from "~/stores";
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

export default function Auth() {
  const navigate = useNavigate();
  const user = useUser();
  const { login, signup } = useAuthActions();
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  // 이미 인증된 사용자는 대시보드로 리다이렉트
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user]); // navigate 종속성 제거로 무한 루프 방지

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
      const success = await login(loginData.email, loginData.password);

      if (success) {
        toast.success("로그인에 성공했습니다!");
        navigate("/dashboard");
      } else {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다.");
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

    // Basic validation
    if (!signupData.name || !signupData.email || !signupData.password) {
      toast.error("필수 정보를 모두 입력해주세요.");
      setIsLoading(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    if (!signupData.agreeTerms) {
      toast.error("이용약관에 동의해주세요.");
      setIsLoading(false);
      return;
    }

    if (!signupData.agreePrivacy) {
      toast.error("개인정보처리방침에 동의해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const success = await signup(
        signupData.name,
        signupData.email,
        signupData.password
      );

      if (success) {
        toast.success("회원가입이 완료되었습니다!");
        navigate("/dashboard");
      } else {
        toast.error("회원가입 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
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
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-primary-foreground text-white" />
            </div>
            <h1 className="text-2xl">Karbit</h1>
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
                    <Label htmlFor="signup-name">이름 *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="실명을 입력하세요"
                        value={signupData.name}
                        onChange={(e) =>
                          setSignupData({ ...signupData, name: e.target.value })
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
                    <Label htmlFor="signup-phone">휴대폰 번호</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="010-0000-0000"
                        value={signupData.phone}
                        onChange={(e) =>
                          setSignupData({
                            ...signupData,
                            phone: e.target.value,
                          })
                        }
                        className="pl-10"
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
                    disabled={isLoading}
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
              <Button variant="outline" className="w-full gap-2" disabled>
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                Google로 계속하기
              </Button>
              <Button variant="outline" className="w-full gap-2" disabled>
                <div className="w-5 h-5 bg-yellow-400 rounded"></div>
                카카오로 계속하기
              </Button>
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
                  <span>10,000+ 사용자가 신뢰하는 서비스</span>
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
