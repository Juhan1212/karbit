import { useNavigate } from "react-router";
import { useUser, useUserPlan, useAuthActions } from "~/stores";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import {
  BarChart3,
  Settings,
  TrendingUp,
  Link2,
  Crown,
  Home,
  LogOut,
  User,
  Newspaper,
  Trophy,
  MessageCircle,
  Gift,
  Lightbulb,
} from "lucide-react";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}

export function AppSidebar({
  activeTab,
  onTabChange,
  isMobile = false,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const user = useUser();
  const userPlan = useUserPlan();
  const { logout } = useAuthActions();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const getPlanBadgeVariant = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case "free":
        return "secondary";
      case "starter":
        return "default";
      case "premium":
        return "default";
      default:
        return "secondary";
    }
  };

  const getPlanDescription = (plan: any) => {
    if (!plan) return "기본 환율 모니터링만 가능합니다";
    return plan.description || "고급 기능을 이용할 수 있습니다";
  };

  const handleUpgrade = () => {
    onTabChange("plans");
  };
  const menuItems = [
    { id: "dashboard", label: "대시보드", icon: Home, disabled: false },
    {
      id: "tradeExplain",
      label: "거래 설명",
      icon: Lightbulb,
      disabled: false,
    },
    { id: "exchanges", label: "거래소 연동", icon: Link2, disabled: false },
    {
      id: "autotrading",
      label: "자동매매 설정",
      icon: TrendingUp,
      disabled: false,
    },
    { id: "plans", label: "플랜 관리", icon: Crown, disabled: false },
    { id: "news", label: "거래소 뉴스", icon: Newspaper, disabled: false },
    {
      id: "leaderboard",
      label: "리더보드",
      icon: Trophy,
      disabled: false,
    },
    {
      id: "community",
      label: "커뮤니티",
      icon: MessageCircle,
      disabled: false,
    },
    { id: "payback", label: "거래소 페이백", icon: Gift, disabled: true },
  ];

  const sidebarClasses = isMobile
    ? "h-full w-full bg-sidebar border-r border-sidebar-border"
    : "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border";

  return (
    <div className={sidebarClasses}>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src="/logo-no-bg.png"
              alt="Karbit Logo"
              className="w-100 h-100 object-contain"
            />
          </div>
          <h1 className="text-xl font-medium">Karbit</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-11 ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => !item.disabled && onTabChange(item.id)}
              disabled={item.disabled}
            >
              <Icon className="w-4 h-4" />
              <span className="flex items-center gap-2">
                {item.label}
                {item.disabled && (
                  <Badge variant="secondary" className="text-xs">
                    준비중
                  </Badge>
                )}
              </span>
            </Button>
          );
        })}
      </nav>

      {/* User Info, Plan & Logout - Combined */}
      <div
        className={`${isMobile ? "mt-8 mx-4" : "absolute bottom-6 left-4 right-4"}`}
      >
        <Card className="p-4 gap-3">
          {/* User Info */}
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {user?.name || "사용자"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{user?.email}</p>

          {/* Current Plan */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <span className="text-sm text-muted-foreground">현재 플랜</span>
            <Badge
              variant={
                getPlanBadgeVariant(userPlan?.name || "Free") as
                  | "secondary"
                  | "default"
              }
              className="text-white"
            >
              {userPlan?.name || "Free"}
            </Badge>
          </div>

          {/* Upgrade Button */}
          <Button
            size="sm"
            className="w-full text-white mb-1.5"
            onClick={handleUpgrade}
          >
            업그레이드
          </Button>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-3 h-3" />
            로그아웃
          </Button>
        </Card>
      </div>
    </div>
  );
}
