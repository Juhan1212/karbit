import React, { useState } from "react";
import type { Route } from "./+types/forgot-password";
import { useNavigate } from "react-router";
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
import { Badge } from "../components/badge";
import { Progress } from "../components/progress";
import {
  BarChart3,
  ArrowLeft,
  Mail,
  Shield,
  Key,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

export async function loader({ context }: Route.LoaderArgs) {
  return {
    message: "Forgot password page loaded successfully",
  };
}

type Step = "email" | "verification" | "reset";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const getStepProgress = () => {
    switch (currentStep) {
      case "email":
        return 33;
      case "verification":
        return 66;
      case "reset":
        return 100;
      default:
        return 0;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email) {
      toast.error("이메일을 입력해주세요.");
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("올바른 이메일 형식을 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      // API 호출
      const formData = new FormData();
      formData.append("email", email);

      const response = await fetch("/api/password-reset?action=send-code", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep("verification");
        setCountdown(300); // 5 minutes countdown
        toast.success("인증코드가 이메일로 발송되었습니다.");

        // Start countdown
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.message || "이메일 발송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Email send error:", error);
      toast.error("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!verificationCode) {
      toast.error("인증코드를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error("6자리 인증코드를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      // API 호출
      const formData = new FormData();
      formData.append("email", email);
      formData.append("verificationCode", verificationCode);

      const response = await fetch("/api/password-reset?action=verify-code", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep("reset");
        toast.success("인증이 완료되었습니다.");
      } else {
        toast.error(data.message || "인증코드가 올바르지 않습니다.");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      toast.error("새 비밀번호를 입력해주세요.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    try {
      // API 호출
      const formData = new FormData();
      formData.append("email", email);
      formData.append("verificationCode", verificationCode);
      formData.append("newPassword", newPassword);

      const response = await fetch(
        "/api/password-reset?action=reset-password",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("비밀번호가 성공적으로 변경되었습니다.");
        navigate("/auth");
      } else {
        toast.error(data.message || "비밀번호 변경에 실패했습니다.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);

    try {
      // API 호출
      const formData = new FormData();
      formData.append("email", email);

      const response = await fetch("/api/password-reset?action=send-code", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(300);
        toast.success("인증코드가 재발송되었습니다.");

        // Restart countdown
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(data.message || "인증코드 재발송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      toast.error("서버 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="absolute top-4 left-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인으로
          </Button>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-primary-foreground text-white" />
            </div>
            <h1 className="text-2xl">Karbit</h1>
          </div>

          <p className="text-muted-foreground">
            비밀번호를 재설정하여 계정을 복구하세요
          </p>
        </div>

        {/* Progress Card */}
        <Card className="shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">진행률</span>
                <span className="font-medium">
                  {Math.round(getStepProgress())}%
                </span>
              </div>
              <Progress value={getStepProgress()} className="h-2" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div
                  className={`text-center ${currentStep === "email" ? "text-primary font-medium" : currentStep === "verification" || currentStep === "reset" ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                >
                  이메일 확인
                </div>
                <div
                  className={`text-center ${currentStep === "verification" ? "text-primary font-medium" : currentStep === "reset" ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                >
                  인증코드 확인
                </div>
                <div
                  className={`text-center ${currentStep === "reset" ? "text-primary font-medium" : "text-muted-foreground/50"}`}
                >
                  새 비밀번호
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="gap-1 mb-2">
                <Shield className="w-3 h-3" />
                보안 인증 단계
              </Badge>
              <CardTitle>
                {currentStep === "email" && "이메일 주소 확인"}
                {currentStep === "verification" && "인증코드 입력"}
                {currentStep === "reset" && "새 비밀번호 설정"}
              </CardTitle>
              <CardDescription>
                {currentStep === "email" &&
                  "가입시 사용한 이메일 주소를 입력하세요"}
                {currentStep === "verification" &&
                  "이메일로 발송된 6자리 인증코드를 입력하세요"}
                {currentStep === "reset" &&
                  "새로운 비밀번호를 설정하여 계정을 복구하세요"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* Step 1: Email Input */}
            {currentStep === "email" && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 주소</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="가입시 사용한 이메일을 입력하세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        이메일로 인증코드 발송
                      </p>
                      <p className="text-xs text-muted-foreground">
                        입력하신 이메일 주소로 6자리 인증코드를 발송해드립니다.
                        스팸함도 확인해보세요.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "인증코드 발송 중..." : "인증코드 발송"}
                </Button>
              </form>
            )}

            {/* Step 2: Verification Code */}
            {currentStep === "verification" && (
              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">인증코드</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="6자리 인증코드"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                        )
                      }
                      className="pl-10 text-center text-lg tracking-wider"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-accent/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm">{email}로 발송됨</span>
                    </div>
                    {countdown > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(countdown)}
                      </Badge>
                    )}
                  </div>

                  {countdown === 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? "발송 중..." : "인증코드 재발송"}
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? "인증 중..." : "인증하기"}
                </Button>
              </form>
            )}

            {/* Step 3: Password Reset */}
            {currentStep === "reset" && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="8자 이상 영문, 숫자 조합"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="새 비밀번호를 다시 입력하세요"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        보안 강화 권장사항
                      </p>
                      <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                        <li>• 8자 이상의 비밀번호 사용</li>
                        <li>• 영문 대소문자, 숫자, 특수문자 조합</li>
                        <li>• 다른 사이트와 다른 고유한 비밀번호</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "비밀번호 변경 중..." : "비밀번호 변경 완료"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            문제가 지속되면{" "}
            <Button variant="link" size="sm" className="p-0 text-xs underline">
              고객지원센터
            </Button>
            로 문의하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
