import React, { useState } from "react";
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
import { ScrollArea } from "../components/scroll-area";
import { Separator } from "../components/separator";
import { Badge } from "../components/badge";
import {
  BarChart3,
  ArrowLeft,
  Search,
  FileText,
  Shield,
  AlertTriangle,
  Clock,
  Users,
  CreditCard,
  Ban,
  Gavel,
} from "lucide-react";

interface TermsOfServicePageProps {
  onBack?: () => void;
}

export default function TermsOfServicePage(
  props: TermsOfServicePageProps = {}
) {
  const { onBack } = props;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1); // 이전 페이지로 이동
    }
  };

  const sections = [
    {
      id: "definitions",
      title: "제1조 (정의)",
      icon: FileText,
      content: `
1. "서비스"라 함은 ㈜카빗(Karbit)이 제공하는 김치 프리미엄 자동매매 플랫폼 및 관련 서비스를 의미합니다.
2. "회원"이라 함은 본 약관에 동의하고 서비스 이용계약을 체결한 개인 또는 법인을 의미합니다.
3. "자동매매"라 함은 회원이 설정한 조건에 따라 시스템이 자동으로 암호화폐 거래를 수행하는 서비스를 의미합니다.
4. "김치 프리미엄"이라 함은 국내 거래소와 해외 거래소 간의 암호화폐 가격 차이를 의미합니다.
5. "API"라 함은 거래소와의 연동을 위한 응용 프로그램 인터페이스를 의미합니다.
6. "시드 자금"이라 함은 자동매매를 위해 회원이 설정한 운용 자금을 의미합니다.
      `,
    },
    {
      id: "eligibility",
      title: "제2조 (서비스 이용자격)",
      icon: Users,
      content: `
1. 서비스 이용자격은 다음과 같습니다:
   - 만 19세 이상의 개인
   - 대한민국 거주자 또는 해외거주 한국인
   - 암호화폐 거래 경험이 있는 자
   - 투자 손실 위험을 이해하고 있는 자

2. 다음의 경우 서비스 이용이 제한될 수 있습니다:
   - 미성년자 (법정대리인 동의 없는 경우)
   - 이전에 회원자격을 상실한 적이 있는 자
   - 관련 법령에 위배되는 목적으로 서비스를 이용하려는 자
   - 허위 정보를 제공한 자

3. 회사는 서비스 이용자격을 확인하기 위해 신분증명서류 제출을 요구할 수 있습니다.
      `,
    },
    {
      id: "account",
      title: "제3조 (계정 생성 및 관리)",
      icon: Shield,
      content: `
1. 회원가입 절차:
   - 회원가입 신청서 작성 및 본인인증
   - 이용약관 및 개인정보처리방침 동의
   - 이메일 인증 및 휴대폰 인증
   - 투자성향 설문 및 위험고지 확인

2. 계정 보안 의무:
   - 로그인 정보의 안전한 관리
   - 타인에게 계정 정보 공유 금지
   - 의심스러운 활동 발견시 즉시 신고
   - 정기적인 비밀번호 변경 권장

3. 계정 정보 변경:
   - 개인정보 변경시 사전 신고 의무
   - 연락처 변경시 24시간 내 업데이트
   - 거래소 API 정보 변경시 재인증 필요
      `,
    },
    {
      id: "services",
      title: "제4조 (서비스 내용)",
      icon: BarChart3,
      content: `
1. 제공 서비스:
   - 실시간 김치 프리미엄 모니터링
   - 다중 거래소 API 연동 서비스
   - 자동매매 알고리즘 제공
   - AI 기반 투자전략 추천 (Premium 플랜)
   - 수익률 분석 및 리포팅

2. 플랜별 서비스:
   - Free 플랜: 실시간 환율 차트 및 기본 정보
   - Starter 플랜: 거래소 연동 및 기본 자동매매
   - Premium 플랜: AI 전략 추천 및 고급 분석

3. 서비스 제한사항:
   - 시스템 점검시 일시적 서비스 중단
   - 거래소 API 장애시 연동 중단
   - 네트워크 장애시 실시간 데이터 지연 가능
      `,
    },
    {
      id: "fees",
      title: "제5조 (이용요금 및 수수료)",
      icon: CreditCard,
      content: `
1. 이용요금:
   - Free 플랜: 무료
   - Starter 플랜: 월 29,900원
   - Premium 플랜: 월 99,900원
   - 연간 결제시 20% 할인 적용

2. 성과 수수료:
   - 자동매매 수익의 10% (Starter 플랜)
   - 자동매매 수익의 15% (Premium 플랜)
   - 손실 발생시 성과 수수료 없음

3. 기타 수수료:
   - 거래소 거래 수수료는 별도 부담
   - 출금 수수료는 거래소 정책에 따름
   - 환전 수수료는 이용자 부담

4. 요금 정책:
   - 요금은 매월 선불 결제
   - 중도 해지시 일할 계산 환불
   - 연체시 서비스 이용 제한
      `,
    },
    {
      id: "risks",
      title: "제6조 (투자위험 고지)",
      icon: AlertTriangle,
      content: `
1. 투자위험 안내:
   - 암호화폐 투자는 고위험 투자로 원금 손실 가능
   - 시장 변동성으로 인한 예상치 못한 손실 발생 가능
   - 자동매매 시스템의 완전성을 보장하지 않음
   - 기술적 오류로 인한 손실 가능성

2. 회사의 책임 제한:
   - 투자 손실에 대한 책임을 지지 않음
   - 시스템 오류로 인한 손해 배상 제한
   - 거래소 장애로 인한 손실 면책
   - 불가항력으로 인한 서비스 중단 면책

3. 이용자 주의사항:
   - 투자는 본인 책임하에 수행
   - 여유 자금으로만 투자 권장
   - 정기적인 포트폴리오 점검 필요
   - 시장 상황에 따른 전략 조정 필요
      `,
    },
    {
      id: "restrictions",
      title: "제7조 (서비스 이용 제한)",
      icon: Ban,
      content: `
1. 금지 행위:
   - 시스템 해킹 및 불법적 접근
   - 타인의 계정 무단 사용
   - 허위 정보 제공 및 신원 도용
   - 자금세탁 및 불법 자금 유입
   - 시장 조작 행위

2. 이용 제한 조치:
   - 경고 및 서비스 이용 일시 정지
   - 계정 영구 정지
   - 법적 조치 및 손해배상 청구
   - 관련 기관 신고

3. 제재 기준:
   - 1차 위반: 경고 및 7일 이용정지
   - 2차 위반: 30일 이용정지
   - 3차 위반: 영구 이용정지
   - 중대 위반: 즉시 영구정지
      `,
    },
    {
      id: "suspension",
      title: "제8조 (서비스 중단 및 종료)",
      icon: Clock,
      content: `
1. 서비스 중단 사유:
   - 시스템 점검 및 업데이트
   - 거래소 API 장애
   - 네트워크 장애 및 보안 위협
   - 법적 요구사항 변경

2. 사전 통지:
   - 계획된 중단: 24시간 전 공지
   - 긴급 중단: 사후 즉시 공지
   - 장기 중단: 대체 서비스 안내
   - 영구 종료: 30일 전 사전 공지

3. 서비스 종료시 조치:
   - 미사용 결제 금액 환불
   - 개인정보 삭제 (법적 보관 의무 제외)
   - 자동매매 중단 안내
   - 데이터 백업 서비스 제공
      `,
    },
    {
      id: "disputes",
      title: "제9조 (분쟁 해결)",
      icon: Gavel,
      content: `
1. 분쟁 해결 절차:
   - 1단계: 고객센터 상담 (평일 9:00-18:00)
   - 2단계: 분쟁조정위원회 조정
   - 3단계: 소비자분쟁조정위원회 조정
   - 4단계: 법정 소송

2. 준거법 및 관할법원:
   - 준거법: 대한민국 법률
   - 관할법원: 서울중앙지방법원
   - 중재기관: 대한상사중재원

3. 소멸시효:
   - 손해배상청구권: 3년
   - 환불청구권: 5년
   - 개인정보 관련: 관련법에 따름

부칙
제1조 (시행일) 본 약관은 2025년 1월 1일부터 시행합니다.
제2조 (경과조치) 본 약관 시행 이전 가입한 회원에게도 적용됩니다.
제3조 (개정) 약관 개정시 30일 전 공지하며, 중대한 변경시 동의를 받습니다.
      `,
    },
  ];

  const filteredSections = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src="/logo-no-bg.png"
                  alt="Karbit Logo"
                  className="w-100 h-100 object-contain"
                />
              </div>
              <span className="font-medium">Karbit</span>
            </div>
          </div>

          <div className="text-center space-y-2 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-2xl">서비스 이용약관</h1>
            </div>
            <p className="text-muted-foreground">
              Karbit 서비스 이용을 위한 약관을 확인하세요
            </p>
            <Badge variant="outline">최종 개정일: 2025년 1월 1일</Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="약관 내용을 검색하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 pb-20">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">목차</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {sections.map((section) => (
                      <Button
                        key={section.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-sm h-auto py-2"
                        onClick={() => {
                          document.getElementById(section.id)?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                      >
                        <section.icon className="w-3 h-3" />
                        <span className="text-left leading-tight">
                          {section.title}
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {filteredSections.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">검색 결과가 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              filteredSections.map((section) => (
                <Card key={section.id} id={section.id} className="scroll-mt-32">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <section.icon className="w-5 h-5 text-primary" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {section.content.split("\n").map((line, index) => {
                        if (line.trim() === "") return <br key={index} />;

                        const isNumbered = /^\d+\./.test(line.trim());
                        const isBullet = /^-/.test(line.trim());
                        const isIndented = line.startsWith("   ");

                        if (isNumbered) {
                          return (
                            <p key={index} className="font-medium mb-2">
                              {line.trim()}
                            </p>
                          );
                        } else if (isBullet) {
                          return (
                            <p key={index} className="ml-4 mb-1">
                              {line.trim()}
                            </p>
                          );
                        } else if (isIndented) {
                          return (
                            <p
                              key={index}
                              className="ml-6 text-sm text-muted-foreground mb-1"
                            >
                              {line.trim()}
                            </p>
                          );
                        } else {
                          return (
                            <p key={index} className="mb-2">
                              {line.trim()}
                            </p>
                          );
                        }
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-background/50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto p-6 text-center text-sm text-muted-foreground">
          <p>
            본 약관에 대해 궁금한 점이 있으시면{" "}
            <Button variant="link" className="p-0 text-sm underline">
              고객센터
            </Button>
            로 문의하세요.
          </p>
          <Separator className="my-4" />
          <p>
            © 2025 Karbit Inc. All rights reserved. | 사업자등록번호:
            123-45-67890 | 대표이사: 홍길동
          </p>
        </div>
      </div>
    </div>
  );
}
