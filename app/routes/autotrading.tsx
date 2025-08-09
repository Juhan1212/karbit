import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Button } from "../components/button";
import { Badge } from "../components/badge";
import { Switch } from "../components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Slider } from "../components/slider";
import {
  AlertTriangle,
  Play,
  Pause,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/alert";

export function meta() {
  return [
    { title: "Auto Trading - Karbit" },
    { name: "description", content: "Manage automated trading strategies" },
  ];
}

export async function loader() {
  return {
    message: "Auto trading data loaded successfully",
  };
}

export default function AutoTrading() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [seedAmount, setSeedAmount] = useState([10000000]); // 1천만원 기본값

  const formatKRW = (amount: number) => {
    return (amount / 10000).toFixed(0) + "만원";
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1>자동매매 설정</h1>
          <p className="text-muted-foreground">
            김치 프리미엄 기반 자동매매 전략을 설정하세요
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "실행 중" : "정지"}
          </Badge>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            disabled={true} // 거래소 연동 필요
          />
        </div>
      </div>

      {/* Status Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          자동매매를 시작하려면 거래소 연동과 Starter 플랜 이상 구독이
          필요합니다.
        </AlertDescription>
      </Alert>

      {/* Trading Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">현재 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">정지</div>
            <div className="text-xs text-muted-foreground">연동 필요</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">활성 포지션</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">0</div>
            <div className="text-xs text-muted-foreground">거래 없음</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">오늘 수익</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">₩0</div>
            <div className="text-xs text-muted-foreground">시작 후 확인</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl">-</div>
            <div className="text-xs text-muted-foreground">데이터 부족</div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>기본 설정</CardTitle>
            <CardDescription>
              자동매매 기본 파라미터를 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seed Amount */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">시드 금액</label>
                <span className="text-sm text-muted-foreground">
                  {formatKRW(seedAmount[0])}
                </span>
              </div>
              <Slider
                value={seedAmount}
                onValueChange={setSeedAmount}
                max={100000000} // 1억
                min={1000000} // 100만
                step={1000000} // 100만 단위
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100만원</span>
                <span>1억원</span>
              </div>
            </div>

            {/* Target Coins */}
            <div className="space-y-2">
              <label className="text-sm font-medium">거래 코인</label>
              <Select defaultValue="auto">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">자동 선택</SelectItem>
                  <SelectItem value="xrp">XRP만</SelectItem>
                  <SelectItem value="btc">BTC만</SelectItem>
                  <SelectItem value="eth">ETH만</SelectItem>
                  <SelectItem value="custom">사용자 정의</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Premium Threshold */}
            <div className="space-y-2">
              <label className="text-sm font-medium">프리미엄 임계점</label>
              <Select defaultValue="0.5">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.3">0.3% 이상</SelectItem>
                  <SelectItem value="0.5">0.5% 이상</SelectItem>
                  <SelectItem value="1.0">1.0% 이상</SelectItem>
                  <SelectItem value="1.5">1.5% 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risk Management */}
            <div className="space-y-2">
              <label className="text-sm font-medium">리스크 관리</label>
              <Select defaultValue="conservative">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">보수적</SelectItem>
                  <SelectItem value="balanced">균형</SelectItem>
                  <SelectItem value="aggressive">공격적</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              고급 전략
              <Badge variant="secondary" className="ml-auto">
                Premium
              </Badge>
            </CardTitle>
            <CardDescription>
              AI 기반 고급 전략 (Premium 플랜에서 사용 가능)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 opacity-50">
            <div className="space-y-2">
              <label className="text-sm font-medium">AI 전략 모드</label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Premium 플랜 필요" />
                </SelectTrigger>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">백테스트 기간</label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Premium 플랜 필요" />
                </SelectTrigger>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">포트폴리오 리밸런싱</label>
              <Switch disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">알림 설정</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">웹훅 알림</span>
                  <Switch disabled />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">텔레그램 알림</span>
                  <Switch disabled />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            거래 내역
          </CardTitle>
          <CardDescription>최근 자동매매 거래 기록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 lg:py-12 text-muted-foreground">
            <p>거래 내역이 없습니다.</p>
            <p className="text-sm">
              자동매매를 시작하면 여기에 거래 내역이 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>제어판</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              disabled={!isEnabled}
              variant="destructive"
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              긴급 정지
            </Button>
            <Button disabled variant="outline" className="flex-1">
              백테스트 실행
            </Button>
            <Button disabled variant="outline" className="flex-1">
              전략 최적화
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
