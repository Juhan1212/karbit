import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  planId: number | null;
  totalSelfEntryCount?: number;
  totalAutoEntryCount?: number;
  totalAlarmCount?: number;
  plan?: {
    id: number;
    name: string;
    description: string | null;
    price: string | null;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  isHydrated: boolean; // SSR 하이드레이션 상태 추적

  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: false,
  isCheckingAuth: false,
  isHydrated: true, // persist 없으므로 항상 hydrated

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setHydrated: (isHydrated) => set({ isHydrated }),

  // 현재 사용자 정보 조회
  checkAuth: async () => {
    const currentState = get();
    if (currentState.isCheckingAuth) {
      return;
    }

    set({ isCheckingAuth: true, isLoading: true });

    try {
      const response = await fetch("/api/auth?action=me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set({ user: data.user, isLoading: false, isCheckingAuth: false });
        } else {
          set({ user: null, isLoading: false, isCheckingAuth: false });
        }
      } else {
        set({ user: null, isLoading: false, isCheckingAuth: false });
      }
    } catch (error) {
      console.error("Auth check error:", error);
      set({ user: null, isLoading: false, isCheckingAuth: false });
    }
  },

  // 로그인
  login: async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const response = await fetch("/api/auth?action=login", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "로그인 중 오류가 발생했습니다." };
    }
  },

  // 회원가입
  signup: async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);

      const response = await fetch("/api/auth?action=signup", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, message: "회원가입 중 오류가 발생했습니다." };
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await fetch("/api/auth?action=logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      set({ user: null });
    }
  },

  // 인증 새로고침
  refreshAuth: async () => {
    try {
      const response = await fetch("/api/auth?action=refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set({ user: data.user });
        }
      }
    } catch (error) {
      console.error("Refresh auth error:", error);
    }
  },

  // 상태 초기화
  reset: () =>
    set({
      user: null,
      isLoading: false,
      isCheckingAuth: false,
      isHydrated: true,
    }),
}));

// 편의를 위한 선택자들 (성능 최적화)
export const useUser = () => useAuthStore((state) => state.user);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useIsHydrated = () => useAuthStore((state) => state.isHydrated);
export const useUserPlan = () =>
  useAuthStore((state) => state.user?.plan || null);

export const useAuthActions = () => {
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const logout = useAuthStore((state) => state.logout);
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const reset = useAuthStore((state) => state.reset);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setHydrated = useAuthStore((state) => state.setHydrated);

  return {
    login,
    signup,
    logout,
    refreshAuth,
    checkAuth,
    reset,
    setUser,
    setLoading,
    setHydrated,
  };
};
