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
  Shield,
  Database,
  Eye,
  Share,
  Clock,
  UserCheck,
  Phone,
  Lock,
} from "lucide-react";

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export default function PrivacyPolicyPage(props: PrivacyPolicyPageProps = {}) {
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
      id: "overview",
      title: "제1조 (개인정보 처리방침 개요)",
      icon: Shield,
      content: `
㈜카빗(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

1. 개인정보 처리 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개별 동의를 받는 등 필요한 조치를 이행할 예정입니다.

2. 개인정보 처리 및 보유기간
회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.

3. 정보주체의 권리·의무 및 행사방법
정보주체는 개인정보 열람, 정정·삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다.
      `,
    },
    {
      id: "collection",
      title: "제2조 (개인정보 수집 항목 및 방법)",
      icon: Database,
      content: `
1. 수집하는 개인정보 항목:

가. 회원가입시 수집정보
   필수항목: 이름, 이메일주소, 휴대폰번호, 비밀번호, 생년월일
   선택항목: 직업, 투자경험, 관심분야, 마케팅 수신동의

나. 서비스 이용과정에서 수집정보
   - 거래소 API 키 및 시크릿 키
   - 투자 성향 설문 결과
   - 자동매매 설정 정보
   - 투자 금액 및 수익률 정보

다. 자동으로 생성·수집되는 정보
   - IP주소, MAC주소, 쿠키, 방문기록
   - 서비스 이용기록, 접속로그, 접속시간
   - 기기정보 (OS, 브라우저 정보 등)
   - 결제정보 (카드번호 일부, 승인번호 등)

2. 개인정보 수집방법:
   - 웹사이트 회원가입 및 서비스 신청
   - 전화, 이메일을 통한 문의
   - 이벤트 참여 및 설문조사
   - 제휴사로부터의 정보 제공
      `,
    },
    {
      id: "purpose",
      title: "제3조 (개인정보 처리 목적)",
      icon: Eye,
      content: `
회사는 다음의 목적을 위하여 개인정보를 처리합니다:

1. 서비스 제공 관련
   - 회원 식별 및 인증
   - 맞춤형 서비스 제공
   - 자동매매 서비스 제공
   - 투자전략 추천 및 분석
   - 거래내역 조회 및 관리

2. 회원관리
   - 본인 확인 및 개인식별
   - 불량회원의 부정이용 방지
   - 비인가 사용방지 및 계정 도용 방지
   - 연령확인, 법정대리인 동의진행
   - 고충처리를 위한 원활한 의사소통

3. 마케팅 및 광고 활용
   - 신규 서비스 개발 및 맞춤 서비스 제공
   - 이벤트 및 광고성 정보 제공 (동의시에만)
   - 통계작성, 학술연구 또는 시장조사
   - 서비스 개선 및 신규 서비스 개발

4. 법적 의무 이행
   - 자금세탁방지법에 따른 본인확인
   - 전자금융거래법에 따른 기록보존
   - 통신비밀보호법에 따른 통신자료 제공
   - 기타 관련 법령에 따른 의무사항 이행
      `,
    },
    {
      id: "retention",
      title: "제4조 (개인정보 보유 및 이용기간)",
      icon: Clock,
      content: `
1. 개인정보 보유기간
회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외없이 해당 개인정보를 지체없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

2. 회사 내부 방침에 의한 정보보유 사유
   - 부정이용 방지: 1년
   - 서비스 이용기록: 1년
   - 고객문의 기록: 3년

3. 관련법령에 의한 정보보유 사유

가. 전자상거래 등에서 소비자보호에 관한 법률
   - 계약 또는 청약철회 기록: 5년
   - 대금결제 및 재화공급 기록: 5년
   - 소비자 불만 또는 분쟁처리 기록: 3년
   - 표시/광고에 관한 기록: 6개월

나. 통신비밀보호법
   - 방문에 관한 기록: 3개월

다. 전자금융거래법
   - 전자금융거래에 관한 기록: 5년

라. 자금세탁방지법
   - 고객확인기록: 5년
   - 거래기록: 5년

4. 보유기간 경과 및 처리목적 달성시 지체없이 개인정보를 파기합니다.
      `,
    },
    {
      id: "sharing",
      title: "제5조 (개인정보 제3자 제공)",
      icon: Share,
      content: `
회사는 개인정보를 제1조(개인정보 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

1. 개인정보 제3자 제공 현황

가. 결제서비스 업체
   제공받는 자: ㈜토스페이먼츠, ㈜NHN한국사이버결제
   제공목적: 결제서비스 제공 및 결제내역 확인
   제공항목: 이름, 휴대폰번호, 이메일주소, 결제정보
   보유기간: 서비스 제공 완료 후 즉시 파기

나. 본인확인 서비스 업체
   제공받는 자: ㈜NICE신용평가정보, ㈜서울크레디트버로
   제공목적: 본인확인 및 연령확인
   제공항목: 이름, 생년월일, 성별, 휴대폰번호
   보유기간: 본인확인 완료 후 즉시 파기

다. 클라우드 서비스 업체
   제공받는 자: Amazon Web Services, Microsoft Azure
   제공목적: 서비스 인프라 제공 및 데이터 보관
   제공항목: 서비스 이용 기록, 로그 데이터
   보유기간: 서비스 계약 종료시까지

2. 개인정보 제공 거부권
정보주체는 개인정보 제3자 제공에 대해 거부할 권리가 있습니다. 다만, 제공을 거부할 경우 서비스 이용에 제한이 있을 수 있습니다.
      `,
    },
    {
      id: "consignment",
      title: "제6조 (개인정보 처리업무 위탁)",
      icon: UserCheck,
      content: `
회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.

1. 개인정보 처리업무 위탁 현황

가. 고객상담 서비스
   위탁업체: ㈜카카오고객센터
   위탁업무: 고객문의 응답 및 상담서비스
   개인정보 보유기간: 위탁계약 종료시까지

나. 시스템 운영 및 유지보수
   위탁업체: ㈜NHN
   위탁업무: 시스템 운영, 유지보수, 장애대응
   개인정보 보유기간: 위탁계약 종료시까지

다. 마케팅 대행 서비스
   위탁업체: ㈜데이터마케팅코리아
   위탁업무: 마케팅 이벤트 기획 및 발송대행
   개인정보 보유기간: 위탁계약 종료시까지

라. 데이터 분석 서비스
   위탁업체: Google Analytics, Facebook Pixel
   위탁업무: 서비스 이용 통계 및 분석
   개인정보 보유기간: 위탁계약 종료시까지

2. 회사는 위탁계약 체결시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.

3. 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체없이 본 개인정보 처리방침을 통하여 공개하도록 하겠습니다.
      `,
    },
    {
      id: "rights",
      title: "제7조 (정보주체의 권리 및 행사방법)",
      icon: UserCheck,
      content: `
1. 정보주체의 권리
정보주체는 회사에 대해 언제든지 다음과 같은 개인정보 보호 관련 권리를 행사할 수 있습니다.

가. 개인정보 열람요구
나. 오류 등이 있을 경우 정정·삭제요구
다. 처리정지요구
라. 손해배상청구

2. 권리 행사방법
위의 권리 행사는 회사에 대해 개인정보 보호법 시행규칙 별지 제8호 서식에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.

권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.

3. 개인정보 열람 및 처리정지 요구는 개인정보 보호법 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한 될 수 있습니다.

4. 개인정보의 정정·삭제요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.

5. 회사는 정보주체 권리에 따른 열람의 요구, 정정·삭제의 요구, 처리정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한 대리인인지를 확인합니다.
      `,
    },
    {
      id: "security",
      title: "제8조 (개인정보 보호를 위한 기술적·관리적 대책)",
      icon: Lock,
      content: `
회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.

1. 기술적 보호조치

가. 개인정보 암호화
   - 개인정보는 암호화되어 저장 및 관리되고 있어, 본인만이 알 수 있도록 하고 있습니다.
   - 비밀번호는 단방향 암호화하여 저장되므로 본인 외에는 알 수 없습니다.

나. 해킹 등에 대비한 기술적 대책
   - 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 하며 외부로부터 접근이 통제된 구역에 시스템을 설치하고 기술적/물리적으로 감시 및 차단하고 있습니다.

다. 개인정보에 대한 접근 제한
   - 개인정보를 처리하는 데이터베이스시스템에 대한 접근권한의 부여,변경,말소를 통하여 개인정보에 대한 접근통제를 위하여 필요한 조치를 하고 있으며 침입차단시스템을 이용하여 외부로부터의 무단 접근을 통제하고 있습니다.

2. 관리적 보호조치

가. 개인정보 취급 직원의 최소화 및 교육
   - 개인정보를 취급하는 직원을 지정하고 담당자에 한정시켜 최소화 하여 개인정보를 관리하는 대책을 시행하고 있습니다.

나. 정기적인 자체 감사 실시
   - 개인정보 취급 관련 안정성 확보를 위해 정기적(분기 1회)으로 자체 감사를 실시하고 있습니다.

3. 물리적 보호조치
   - 컴퓨터, 자료보관함 등의 잠금장치 사용
   - 데이터센터 등의 출입통제
      `,
    },
    {
      id: "contact",
      title: "제9조 (개인정보 보호책임자)",
      icon: Phone,
      content: `
회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

1. 개인정보 보호책임자
   - 성명: 김개인
   - 직책: 개인정보보호팀장
   - 직급: 부장
   - 연락처: privacy@karbit.co.kr, 02-1234-5678

2. 개인정보 보호 담당부서
   - 부서명: 개인정보보호팀
   - 담당자: 이담당
   - 연락처: privacy@karbit.co.kr, 02-1234-5679

정보주체께서는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해드릴 것입니다.

3. 기타 개인정보 침해에 대한 신고나 상담이 필요한 경우에는 아래 기관에 문의하시기 바랍니다.

▶ 개인정보 침해신고센터 (한국인터넷진흥원 운영)
   - 신고전화: 국번없이 118
   - 홈페이지: privacy.kisa.or.kr

▶ 개인정보 분쟁조정위원회
   - 신고전화: 국번없이 1833-6972
   - 홈페이지: www.kopico.go.kr

▶ 대검찰청 사이버범죄수사단
   - 신고전화: 02-3480-3573
   - 홈페이지: www.spo.go.kr

▶ 경찰청 사이버테러대응센터
   - 신고전화: 국번없이 182
   - 홈페이지: cyberbureau.police.go.kr

부칙
제1조 (시행일) 이 개인정보처리방침은 2025년 1월 1일부터 시행됩니다.
제2조 (이전 개인정보처리방침과의 차이점) 해당사항 없음
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
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl">개인정보 처리방침</h1>
            </div>
            <p className="text-muted-foreground">
              Karbit이 개인정보를 어떻게 수집하고 보호하는지 확인하세요
            </p>
            <Badge variant="outline">최종 개정일: 2025년 1월 1일</Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="개인정보처리방침 내용을 검색하세요..."
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
                        const isSubSection = /^[가-힣]\./.test(line.trim());

                        if (isNumbered) {
                          return (
                            <p
                              key={index}
                              className="font-medium mb-2 text-primary"
                            >
                              {line.trim()}
                            </p>
                          );
                        } else if (isSubSection) {
                          return (
                            <p key={index} className="font-medium mb-2 ml-4">
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
            개인정보 처리에 대해 궁금한 점이 있으시면{" "}
            <Button variant="link" className="p-0 text-sm underline">
              개인정보보호팀 (privacy@karbit.co.kr)
            </Button>
            로 문의하세요.
          </p>
          <Separator className="my-4" />
          <p>
            © 2025 Karbit Inc. All rights reserved. | 개인정보보호책임자:
            김개인 | 연락처: 02-1234-5678
          </p>
        </div>
      </div>
    </div>
  );
}
