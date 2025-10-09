import React from "react";
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
    { id: "dashboard", label: "대시보드", icon: Home },
    { id: "exchanges", label: "거래소 연동", icon: Link2 },
    { id: "autotrading", label: "자동매매 설정", icon: TrendingUp },
    { id: "plans", label: "플랜 관리", icon: Crown },
    { id: "news", label: "거래소 뉴스", icon: Newspaper },
    { id: "leaderboard", label: "실시간 워뇨띠 포지션", icon: Trophy },
    { id: "community", label: "커뮤니티", icon: MessageCircle },
    { id: "payback", label: "거래소 페이백", icon: Gift },
  ];

  const sidebarClasses = isMobile
    ? "h-full w-full bg-sidebar border-r border-sidebar-border"
    : "fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border";

  return (
    <div className={sidebarClasses}>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground text-white" />
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
              className="w-full justify-start gap-3 h-11"
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 mt-6">
        <Card className="p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {user?.name || "사용자"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{user?.email}</p>
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

      {/* Current Plan */}
      <div
        className={`${isMobile ? "mt-8 mx-4" : "absolute bottom-6 left-4 right-4"}`}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
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
          <p className="text-xs text-muted-foreground mb-3">
            {getPlanDescription(userPlan)}
          </p>
          <Button
            size="sm"
            className="w-full text-white"
            onClick={handleUpgrade}
          >
            업그레이드
          </Button>
        </Card>
      </div>
    </div>
  );
}
