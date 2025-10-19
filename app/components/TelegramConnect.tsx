import { useState, useEffect } from "react";
import { Button } from "../components/button";
import { Send, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TelegramStatus {
  connected: boolean;
  chatId?: string;
  username?: string;
  connectedAt?: string;
  notificationsEnabled?: boolean;
}

interface TelegramConnectProps {
  isConnected: boolean;
  onDisconnect?: () => void | Promise<void>;
  isLoading?: boolean;
}

export function TelegramConnect({
  isConnected,
  onDisconnect,
  isLoading = false,
}: TelegramConnectProps) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // 텔레그램 연동 상태 확인
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/telegram/auth", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("텔레그램 상태 확인 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);

      // 인증 토큰 생성
      const response = await fetch("/api/telegram/auth", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("인증 토큰 생성 실패");
      }

      const { deepLink } = await response.json();

      // 텔레그램 앱으로 이동
      window.open(deepLink, "_blank");

      toast.success("텔레그램 앱이 열렸습니다. 봇과 대화를 시작하세요!", {
        description: "연동 후 페이지를 새로고침하면 상태가 업데이트됩니다.",
      });
    } catch (error) {
      console.error("텔레그램 연동 실패:", error);
      toast("텔레그램 연동에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // status.connected: DB에 chatId가 있는지 (실제 텔레그램 연동 여부)
  // isConnected: telegramNotificationEnabled (알림 활성화 여부)
  // 둘 다 true여야 "연동되었습니다" UI 표시
  if (status?.connected && isConnected) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              텔레그램이 연동되었습니다
            </p>
            {status?.username && (
              <p className="text-sm text-green-700 dark:text-green-300">
                @{status.username}
              </p>
            )}
            {status?.connectedAt && (
              <p className="text-xs text-green-600 dark:text-green-400">
                연동 시각:{" "}
                {new Date(status.connectedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">알림 종류</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              주문 체결 알림
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              수익/손실 알림
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              김치 프리미엄 알림
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              중요 시스템 알림
            </li>
          </ul>
        </div>

        {onDisconnect && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDisconnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              "연동 해제하기"
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          💡 연동 해제 시 텔레그램 알림을 받을 수 없습니다
        </p>
      </div>
    );
  }

  // 연동되지 않은 경우
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">연동 방법</h4>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>아래 "텔레그램 연동하기" 버튼 클릭</li>
          <li>텔레그램 앱이 자동으로 열립니다</li>
          <li>Karbit Bot과 대화를 시작합니다</li>
          <li>연동이 자동으로 완료됩니다</li>
        </ol>
      </div>

      <Button className="w-full" onClick={handleConnect} disabled={connecting}>
        {connecting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            연동 중...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            텔레그램 연동하기
            <ExternalLink className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        텔레그램 앱이 설치되어 있어야 합니다
      </p>
    </div>
  );
}
