import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { AppSidebar } from "../components/app-sidebar";
import { Toaster } from "../components/sonner";
import { Button } from "../components/button";
import { Sheet, SheetContent, SheetTrigger } from "../components/sheet";
import { Card } from "../components/card";
import { Badge } from "../components/badge";
import { Menu, TrendingUp, TrendingDown } from "lucide-react";
import { useUser, useIsLoading, useAuthActions } from "~/stores";
import { useDashboardStore } from "../stores/dashboard-store";

export function meta() {
  return [
    { title: "Karbit - Cryptocurrency Arbitrage Trading" },
    {
      name: "description",
      content: "Advanced cryptocurrency arbitrage trading platform",
    },
  ];
}

export async function loader() {
  return {
    message: "Layout loaded successfully",
  };
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const isLoading = useIsLoading();
  const { checkAuth } = useAuthActions();

  // Dashboard store에서 데이터 가져오기
  const {
    currentExchangeRate,
    legalExchangeRate,
    activePositionCount,
    kimchiPremiumData,
  } = useDashboardStore();

  // 페이지 로드 시 사용자 인증 상태 확인 (한 번만 실행)
  useEffect(() => {
    if (!authChecked && !user && !isLoading) {
      checkAuth().finally(() => {
        setAuthChecked(true);
      });
    }
  }, [authChecked, user, isLoading, checkAuth]);

  // 인증 확인 후 사용자가 없으면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (authChecked && !user && !isLoading) {
      navigate("/auth", { replace: true });
    }
  }, [authChecked, user, isLoading, navigate]);

  // 현재 경로에서 활성 탭 결정
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "dashboard";
    if (path === "/trade-explain") return "trade-explain";
    if (path === "/exchanges") return "exchanges";
    if (path === "/autotrading") return "autotrading";
    if (path === "/plans") return "plans";
    if (path === "/news") return "news";
    if (path === "/leaderboard") return "leaderboard";
    if (path === "/community") return "community";
    return "dashboard";
  };

  const handleTabChange = (tab: string) => {
    // 탭 변경시 해당 경로로 네비게이션
    const routes: { [key: string]: string } = {
      dashboard: "/dashboard",
      tradeExplain: "/trade-explain",
      exchanges: "/exchanges",
      autotrading: "/autotrading",
      plans: "/plans",
      news: "/news",
      leaderboard: "/leaderboard",
      community: "/community",
      payback: "/payback",
    };

    navigate(routes[tab] || "/dashboard");
    setSidebarOpen(false); // Close mobile sidebar when tab changes
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar activeTab={getActiveTab()} onTabChange={handleTabChange} />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <img
              src="/logo-no-bg.png"
              alt="Karbit Logo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-lg font-medium">Karbit</h1>
          </div>
          {/* Mobile Key Metrics in Header */}
          <div className="grid grid-cols-4 gap-1 text-xs">
            {/* 헤더 행 */}
            <div className="text-muted-foreground text-center">테더</div>
            <div className="text-muted-foreground text-center">환율</div>
            <div className="text-muted-foreground text-center">김프</div>
            <div className="text-muted-foreground text-center">포지션</div>

            {/* 값 행 */}
            <div className="font-medium text-center">
              {currentExchangeRate
                ? `${currentExchangeRate.toFixed(0)}`
                : "..."}
            </div>
            <div className="font-medium text-center">
              {legalExchangeRate?.rate
                ? `${legalExchangeRate.rate.toFixed(0)}`
                : "..."}
            </div>
            <div className="flex items-center justify-center gap-1">
              <span
                className={`font-medium ${kimchiPremiumData?.isHigher ? "text-green-600" : "text-red-600"}`}
              >
                {kimchiPremiumData?.percentage
                  ? `${kimchiPremiumData.percentage.toFixed(1)}%`
                  : "..."}
              </span>
              {kimchiPremiumData?.isHigher && (
                <TrendingUp className="w-3 h-3 text-green-600" />
              )}
              {!kimchiPremiumData?.isHigher &&
                kimchiPremiumData?.percentage !== 0 && (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
            </div>
            <div className="font-medium text-center">
              {activePositionCount !== undefined
                ? `${activePositionCount}`
                : "..."}
            </div>
          </div>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AppSidebar
                activeTab={getActiveTab()}
                onTabChange={handleTabChange}
                isMobile={true}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-64">
        <Outlet />
      </main>

      <Toaster />
    </div>
  );
}
