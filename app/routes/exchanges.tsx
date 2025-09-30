import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, redirect } from "react-router";
import { toast } from "sonner";
import { validateSession } from "~/database/session";
import { getUserExchangeConnections } from "~/database/exchange";
import { getAuthTokenFromRequest } from "~/utils/cookies";
import { useUser, useUserPlan } from "~/stores";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { Label } from "../components/label";
import { Badge } from "../components/badge";
import { AlertCircle, CheckCircle, Plus, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog";
import { Alert, AlertDescription } from "../components/alert";

interface Exchange {
  name: string;
  logo: string;
  type: "korean" | "global";
  status: "connected" | "disconnected";
  apiKey?: string;
}

export function meta() {
  return [
    { title: "Exchange Connection - Karbit" },
    {
      name: "description",
      content: "Connect and manage cryptocurrency exchanges",
    },
  ];
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 쿠키에서 토큰 추출
    const token = getAuthTokenFromRequest(request);

    if (!token) {
      throw redirect("/login");
    }

    // 사용자 인증 확인
    const user = await validateSession(token);
    if (!user) {
      throw redirect("/login");
    }

    // 사용자의 거래소 연결 상태 조회
    const connections = await getUserExchangeConnections(user.id);

    return {
      connections,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw redirect("/login");
    }
    console.error("exchanges loader error:", error);
    return {
      connections: [],
    };
  }
}

const ExchangeCard = React.memo(({ exchange }: { exchange: Exchange }) => {
  const fetcher = useFetcher();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [apiKey, setApiKey] = useState(exchange.apiKey || "");
  const [secretKey, setSecretKey] = useState("");

  useEffect(() => {
    setApiKey(exchange.apiKey || "");
    setSecretKey("");
  }, [exchange]);

  const handleConnect = useCallback(async () => {
    if (!apiKey || !secretKey) {
      toast.error("API 키와 시크릿 키를 모두 입력해주세요.");
      return;
    }

    setIsConnecting(true);

    fetcher.submit(
      {
        action: "connect",
        exchangeName: exchange.name,
        apiKey,
        secretKey,
      },
      {
        method: "POST",
        action: "/api/exchanges",
      }
    );

    // fetcher 응답 처리는 useEffect에서 처리
  }, [apiKey, secretKey, exchange.name, fetcher]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);

    fetcher.submit(
      {
        action: "disconnect",
        exchangeName: exchange.name,
      },
      {
        method: "POST",
        action: "/api/exchanges",
      }
    );
  }, [exchange.name, fetcher]);

  // fetcher 상태 변화 감지
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        toast.success(fetcher.data.message);

        // 연결 해제 시 다이얼로그 닫기
        if (fetcher.data.action === "disconnect") {
          setIsDialogOpen(false);
        }
      } else {
        toast.error(fetcher.data.message || "작업에 실패했습니다.");
      }
      setIsConnecting(false);
      setIsDisconnecting(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="font-medium text-sm">{exchange.logo}</span>
            </div>
            <div>
              <h3 className="font-medium">{exchange.name}</h3>
              <p className="text-xs text-muted-foreground">
                {exchange.type === "korean" ? "국내 거래소" : "해외 거래소"}
              </p>
            </div>
          </div>
          <Badge
            variant={
              exchange.status === "connected" ? "destructive" : "secondary"
            }
          >
            {exchange.status === "connected" ? "연결됨" : "미연결"}
          </Badge>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open); // x버튼으로 닫을 때 상태 업데이트
          }}
        >
          <Button
            variant={exchange.status === "connected" ? "outline" : "default"}
            className={
              exchange.status === "connected" ? "w-full" : "w-full text-white"
            }
            size="sm"
            onClick={() => {
              setIsDialogOpen(true); // 다이얼로그 열기
            }}
          >
            {exchange.status === "connected" ? (
              <>
                <Settings className="w-4 h-4 mr-2" />
                연결 관리
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                연결하기
              </>
            )}
          </Button>
          <DialogContent
            className="mx-4 max-w-md"
            aria-describedby="exchange-dialog-description"
          >
            <DialogHeader>
              <DialogTitle>{exchange.name} 연동</DialogTitle>
              <DialogDescription id="exchange-dialog-description">
                API 키를 입력하여 거래소를 연동하세요. 보안을 위해 읽기 전용
                권한을 권장합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {exchange.type === "global" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    레퍼럴 코드로 가입한 계정의 API 키만 등록 가능합니다.
                  </AlertDescription>
                </Alert>
              )}

              {exchange.status === "connected" ? (
                // 연결된 상태 - 연결정보 수정 및 해제 옵션
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        연결 완료
                      </span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      {exchange.name} 거래소가 성공적으로 연결되었습니다.
                    </p>
                  </div>

                  {/* 연결정보 수정 폼 */}
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      placeholder="API 키를 입력하세요"
                      type={
                        exchange.status === "connected" ? "text" : "password"
                      }
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secret-key">Secret Key</Label>
                    <Input
                      id="secret-key"
                      placeholder="시크릿 키를 입력하세요"
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 text-white"
                      onClick={handleConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? "수정 중..." : "연결정보 수정"}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? "해제 중..." : "연결정보 해제"}
                    </Button>
                  </div>
                </div>
              ) : (
                // 연결되지 않은 상태 - API 키 입력 폼
                <>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      placeholder="API 키를 입력하세요"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret-key">Secret Key</Label>
                    <Input
                      id="secret-key"
                      placeholder="시크릿 키를 입력하세요"
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full text-white"
                    onClick={handleConnect}
                    disabled={isConnecting}
                  >
                    {isConnecting ? "연결 중..." : "연결하기"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});

ExchangeCard.displayName = "ExchangeCard";

import { KoreanExchangeType } from "~/types/exchange";

export default function ExchangesPage() {
  const { connections } = useLoaderData<typeof loader>();
  const user = useUser();
  const userPlan = useUserPlan();

  const createExchangeFromConnection = useCallback(
    (name: string, logo: string, type: "korean" | "global"): Exchange => {
      const connection = connections.find((c) => c.exchangeName === name);
      return {
        name,
        logo,
        type,
        status: connection?.isConnected ? "connected" : "disconnected",
        apiKey: connection?.apiKey || "",
      };
    },
    [connections]
  );

  const koreanExchanges: Exchange[] = useMemo(
    () => [
      createExchangeFromConnection(KoreanExchangeType.업비트, "U", "korean"),
      createExchangeFromConnection(KoreanExchangeType.빗썸, "B", "korean"),
    ],
    [createExchangeFromConnection]
  );

  const globalExchanges: Exchange[] = useMemo(
    () => [
      createExchangeFromConnection(KoreanExchangeType.바이낸스, "Bi", "global"),
      createExchangeFromConnection(KoreanExchangeType.바이빗, "By", "global"),
      createExchangeFromConnection(KoreanExchangeType.OKX, "O", "global"),
    ],
    [createExchangeFromConnection]
  );

  // 자동매매 시작 조건 확인
  const conditions = useMemo(() => {
    const hasKoreanExchange = koreanExchanges.some(
      (e) => e.status === "connected"
    );
    const hasGlobalExchange = globalExchanges.some(
      (e) => e.status === "connected"
    );
    const hasStarterPlan = userPlan && userPlan.name !== "Free";

    return [
      {
        text: "최소 1개의 국내 거래소 연결",
        satisfied: hasKoreanExchange,
      },
      {
        text: "최소 1개의 해외 거래소 연결",
        satisfied: hasGlobalExchange,
      },
      {
        text: "Starter 플랜 이상 구독",
        satisfied: hasStarterPlan,
      },
    ];
  }, [koreanExchanges, globalExchanges, userPlan]);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1>거래소 연동</h1>
        <p className="text-muted-foreground">
          자동매매를 위해 거래소 API를 연결하세요
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            연동 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">국내 거래소</h3>
              <p className="text-sm text-muted-foreground">
                {koreanExchanges.filter((e) => e.status === "connected").length}
                /2 연결됨
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">해외 거래소</h3>
              <p className="text-sm text-muted-foreground">
                {globalExchanges.filter((e) => e.status === "connected").length}
                /3 연결됨
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Korean Exchanges */}
      <div>
        <h2 className="mb-4">국내 거래소</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {koreanExchanges.map((exchange) => (
            <ExchangeCard key={exchange.name} exchange={exchange} />
          ))}
        </div>
      </div>

      {/* Global Exchanges */}
      <div>
        <h2 className="mb-4">해외 거래소</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalExchanges.map((exchange) => (
            <ExchangeCard key={exchange.name} exchange={exchange} />
          ))}
        </div>
      </div>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>자동매매 시작 조건</CardTitle>
          <CardDescription>
            다음 조건을 모두 만족해야 자동매매를 시작할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    condition.satisfied
                      ? "border-green-500 bg-green-500"
                      : "border-muted"
                  }`}
                >
                  {condition.satisfied ? (
                    <CheckCircle className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2 h-2 bg-muted rounded-full" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    condition.satisfied
                      ? "text-green-700 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {condition.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
