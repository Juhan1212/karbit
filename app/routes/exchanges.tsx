import React, { useState } from "react";
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
  status: string;
}

interface ExchangeCardProps {
  exchange: Exchange;
  type: "korean" | "global";
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

export async function loader() {
  return {
    message: "Exchange connection data loaded successfully",
  };
}

export default function ExchangeConnection() {
  const [connectedExchanges, setConnectedExchanges] = useState<Exchange[]>([]);

  const koreanExchanges: Exchange[] = [
    { name: "업비트", logo: "U", status: "disconnected" },
    { name: "빗썸", logo: "B", status: "disconnected" },
  ];

  const globalExchanges: Exchange[] = [
    { name: "바이낸스", logo: "Bi", status: "disconnected" },
    { name: "바이빗", logo: "By", status: "disconnected" },
    { name: "OKX", logo: "O", status: "disconnected" },
  ];

  const ExchangeCard = ({ exchange, type }: ExchangeCardProps) => (
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
                {type === "korean" ? "국내 거래소" : "해외 거래소"}
              </p>
            </div>
          </div>
          <Badge
            variant={exchange.status === "connected" ? "default" : "secondary"}
          >
            {exchange.status === "connected" ? "연결됨" : "미연결"}
          </Badge>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant={exchange.status === "connected" ? "outline" : "default"}
              className="w-full"
              size="sm"
            >
              {exchange.status === "connected" ? (
                <>
                  <Settings className="w-4 h-4 mr-2" />
                  설정 관리
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  연결하기
                </>
              )}
            </Button>
          </DialogTrigger>
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
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  레퍼럴 코드로 가입한 계정의 API 키만 등록 가능합니다.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  placeholder="API 키를 입력하세요"
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <Input
                  id="secret-key"
                  placeholder="시크릿 키를 입력하세요"
                  type="password"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1">연결 테스트</Button>
                <Button variant="outline" className="flex-1">
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

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
                {
                  connectedExchanges.filter((e) =>
                    ["업비트", "빗썸"].includes(e.name)
                  ).length
                }
                /2 연결됨
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">해외 거래소</h3>
              <p className="text-sm text-muted-foreground">
                {
                  connectedExchanges.filter((e) =>
                    ["바이낸스", "바이빗", "OKX"].includes(e.name)
                  ).length
                }
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
            <ExchangeCard
              key={exchange.name}
              exchange={exchange}
              type="korean"
            />
          ))}
        </div>
      </div>

      {/* Global Exchanges */}
      <div>
        <h2 className="mb-4">해외 거래소</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {globalExchanges.map((exchange) => (
            <ExchangeCard
              key={exchange.name}
              exchange={exchange}
              type="global"
            />
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
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-muted rounded-full" />
              </div>
              <span className="text-muted-foreground text-sm">
                최소 1개의 국내 거래소 연결
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-muted rounded-full" />
              </div>
              <span className="text-muted-foreground text-sm">
                최소 1개의 해외 거래소 연결
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-muted flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-muted rounded-full" />
              </div>
              <span className="text-muted-foreground text-sm">
                Starter 플랜 이상 구독
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
