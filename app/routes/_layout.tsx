import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { AppSidebar } from "../components/app-sidebar";
import { Toaster } from "../components/sonner";
import { Button } from "../components/button";
import { Sheet, SheetContent, SheetTrigger } from "../components/sheet";
import { Menu } from "lucide-react";
import { useUser, useIsLoading, useAuthActions } from "~/stores";

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
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const isLoading = useIsLoading();
  const { checkAuth } = useAuthActions();

  // 페이지 로드 시 사용자 인증 상태 확인
  useEffect(() => {
    // 사용자 정보가 없는 경우에만 인증 체크
    if (!user && !isLoading) {
      checkAuth();
    }
  }, [user, isLoading, checkAuth]);

  // 현재 경로에서 활성 탭 결정
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "dashboard";
    if (path === "/exchanges") return "exchanges";
    if (path === "/autotrading") return "autotrading";
    if (path === "/plans") return "plans";
    return "dashboard";
  };

  const handleTabChange = (tab: string) => {
    // 탭 변경시 해당 경로로 네비게이션
    const routes: { [key: string]: string } = {
      dashboard: "/dashboard",
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
          <h1 className="text-lg font-medium">Karbit</h1>
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
