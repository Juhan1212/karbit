# Agent 지침

- 질문은 반드시 한글로 대답할 것.
- 특정 라이브러리에 대해서는 반드시 context7 mcp를 이용해서 최신화된 라이브러리를 확인하여 대답할 것.
- 아키텍쳐 설계에 대한 답을 해줄 때에는 mermaid chart도 제공해줄 것.
- db에 관한 질문을 할 때에는 dbcode를 통해 로컬db와 커넥션을 하고, 실제 데이터베이스, 테이블, 데이터를 확인하여 최적의 답을 낼 것.

# Karbit - 암호화폐 자동 트레이딩 플랫폼

## 프로젝트 개요

Karbit은 React Router v7 기반으로 개발된 현대적인 암호화폐 자동 트레이딩 플랫폼입니다. 다중 거래소를 지원하며, 한국 거래소와 해외 거래소 간의 프리미엄, 즉 김치 프리미엄을 이용한 자동매매 전략을 구사할 수 있도록 합니다.

## 🚀 주요 기능

- **다중 거래소 지원**: Binance, Bybit, OKX, Bithumb, Upbit 등 주요 거래소 통합
- **자동 트레이딩**: 사용자 정의 전략에 따른 자동 매매 실행
- **결제 시스템**: Toss Payments 연동을 통한 구독 플랜 관리
- **실시간 대시보드**: 포트폴리오 및 트레이딩 현황 실시간 모니터링
- **사용자 관리**: JWT 기반 인증 시스템 및 프로필 관리
- **이메일 알림**: Nodemailer를 통한 트레이딩 알림 및 계정 관리

## 🛠️ 기술 스택

### Frontend

- **React 19** + **TypeScript**: 현대적 React 개발
- **React Router v7**: 풀스택 React 프레임워크
- **TailwindCSS v4**: 유틸리티 퍼스트 CSS 프레임워크
- **Radix UI**: 접근성 높은 UI 컴포넌트 라이브러리
- **Zustand**: 경량 상태 관리
- **Recharts**: 데이터 시각화
- **Lucide React**: 아이콘 라이브러리
- **LightWeight Chart**: 차트 라이브러리

### Backend

- **Express.js**: Node.js 웹 서버
- **PostgreSQL**: 주 데이터베이스
- **Drizzle ORM**: 타입 안전한 데이터베이스 ORM
- **JWT**: 인증 토큰 관리
- **bcryptjs**: 비밀번호 해싱

### 거래소 API

- **node-binance-api**: 바이낸스 API 클라이언트
- **bybit-api**: 바이비트 API 클라이언트
- **okx-api**: OKX API 클라이언트

### 결제 & 알림

- **@tosspayments/tosspayments-sdk**: 토스페이먼츠 결제 연동
- **nodemailer**: 이메일 발송 서비스

### 개발 도구

- **Vite**: 빌드 도구 및 개발 서버
- **Jest**: 테스트 프레임워크
- **Docker**: 컨테이너화
- **TypeScript**: 정적 타입 검사

## 📁 프로젝트 구조

```
karbit/
├── app/                          # React Router 앱
│   ├── routes/                   # 페이지 라우트
│   │   ├── home.tsx             # 홈페이지
│   │   ├── auth.tsx             # 인증 페이지
│   │   ├── dashboard.tsx        # 대시보드
│   │   ├── autotrading.tsx      # 자동 트레이딩 설정
│   │   ├── exchanges.tsx        # 거래소 연결 관리
│   │   ├── plans.tsx            # 구독 플랜
│   │   └── api/                 # API 엔드포인트
│   ├── components/              # 재사용 가능한 UI 컴포넌트
│   └── stores/                  # Zustand 상태 스토어
├── database/                    # 데이터베이스 관련
│   ├── schema.ts               # Drizzle 스키마 정의
│   ├── user.ts                 # 사용자 관련 쿼리
│   ├── exchange.ts             # 거래소 관련 쿼리
│   ├── strategy.ts             # 트레이딩 전략 관련
│   └── payment.ts              # 결제 관련 쿼리
├── exchanges/                   # 거래소 API 클라이언트
│   ├── binance.ts              # 바이낸스 API
│   ├── bybit.ts                # 바이비트 API
│   ├── okx.ts                  # OKX API
│   ├── bithumb.ts              # 빗썸 API
│   └── upbit.ts                # 업비트 API
├── drizzle/                    # 데이터베이스 마이그레이션
├── server/                     # 서버 설정
├── utils/                      # 유틸리티 함수
└── test/                       # 테스트
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블

- **users**: 사용자 정보 및 플랜 관리
- **plans**: 구독 플랜 정보
- **exchanges**: 거래소 정보
- **user_exchanges**: 사용자 거래소 연결 정보
- **strategies**: 트레이딩 전략 설정
- **strategy_executions**: 전략 실행 기록
- **payments**: 결제 기록
- **coins**: 지원 코인 정보

### 주요 기능별 테이블

- **인증**: users, sessions
- **거래소**: exchanges, user_exchanges, exchange_balances
- **트레이딩**: strategies, strategy_executions, orders
- **결제**: plans, payments, user_plan_history

## 🔐 인증 시스템

- JWT 기반 세션 관리
- bcryptjs를 이용한 비밀번호 해싱
- 이메일 인증 및 비밀번호 재설정
- 쿠키 기반 토큰 저장

## 💳 결제 시스템

- Toss Payments 연동
- 구독 기반 플랜 시스템
- 자동 결제 및 플랜 업그레이드/다운그레이드
- 결제 히스토리 관리

## 📊 트레이딩 기능

### 지원 거래소

- **해외**: Binance, Bybit, OKX
- **국내**: Bithumb, Upbit

### 모니터링

- 실시간 포지션 현황
- 수익률 추적
- 거래 히스토리
- 성과 분석 대시보드

## 🚀 시작하기

### 환경 설정

1. **의존성 설치**

```bash
npm install
```

2. **환경 변수 설정**

```bash
cp .env.example .env
# DATABASE_URL, JWT_SECRET 등 필요한 환경 변수 설정
```

3. **데이터베이스 실행**

```bash
npm run db:start
```

4. **데이터베이스 마이그레이션**

```bash
npm run db:migrate
```

5. **개발 서버 실행**

```bash
npm run dev
```

### Docker 실행

```bash
# PostgreSQL 컨테이너 실행
docker-compose up -d

# 애플리케이션 빌드 및 실행
docker build -t karbit .
docker run -p 3000:3000 karbit
```

## 📋 사용 가능한 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 실행
- `npm run db:generate`: 데이터베이스 스키마 생성
- `npm run db:migrate`: 마이그레이션 실행
- `npm run db:studio`: Drizzle Studio 실행
- `npm run typecheck`: TypeScript 타입 체크

## 🔧 개발 가이드

### 새로운 거래소 추가

1. `exchanges/` 디렉토리에 새 거래소 API 클라이언트 생성
2. `database/exchange.ts`에 거래소 정보 추가
3. 거래소별 API 인터페이스 구현

### 새로운 트레이딩 전략 추가

1. `database/strategy.ts`에 전략 로직 구현
2. `app/routes/autotrading.tsx`에 UI 컴포넌트 추가
3. 백테스팅 및 실시간 실행 로직 구현

### API 엔드포인트 추가

1. `app/routes/api/` 디렉토리에 새 엔드포인트 생성
2. 적절한 인증 미들웨어 적용
3. 에러 핸들링 및 응답 포맷 표준화

## 🔒 보안 고려사항

- API 키 암호화 저장
- SQL 인젝션 방지 (Drizzle ORM 사용)
- XSS 방지
- CSRF 토큰 검증
- Rate Limiting 적용

## 📈 성능 최적화

- React 컴포넌트 메모이제이션
- 데이터베이스 쿼리 최적화
- 이미지 및 에셋 최적화
- CDN 활용
- 캐싱 전략

## 🌐 배포

### 프로덕션 체크리스트

- [ ] 환경 변수 설정
- [ ] 데이터베이스 마이그레이션
- [ ] SSL 인증서 설정
- [ ] 도메인 연결
- [ ] 모니터링 도구 설정

## 📞 지원 및 기여

- 이슈 리포트: GitHub Issues
- 기능 요청: GitHub Discussions
- 코드 기여: Pull Request 환영

---

**Built with ❤️ using React Router v7**
