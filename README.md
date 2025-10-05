# Karbit - 암호화폐 자동 트레이딩 플랫폼

<div align="center">

![Karbit Logo](https://img.shields.io/badge/Karbit-Crypto_Trading-blue?style=for-the-badge)

**김치 프리미엄을 활용한 스마트 자동매매 플랫폼**

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=react-router&logoColor=white)](https://reactrouter.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE.md)

[특징](#-주요-기능) • [시작하기](#-시작하기) • [아키텍처](#-기술-스택) • [배포](#-배포) • [기여](#-기여하기)

</div>

---

## 📖 프로젝트 개요

**Karbit**은 React Router v7 기반으로 개발된 현대적인 암호화폐 자동 트레이딩 플랫폼입니다. 한국 거래소와 해외 거래소 간의 가격 차이(김치 프리미엄)를 실시간으로 모니터링하고, 사용자 정의 전략에 따라 자동으로 매매를 실행합니다.

### 왜 Karbit인가?

- 🌏 **다중 거래소 지원**: Binance, Bybit, OKX, Bithumb, Upbit 등 주요 거래소 통합
- 🤖 **스마트 자동매매**: 김치 프리미엄을 활용한 지능형 트레이딩 전략
- 📊 **실시간 모니터링**: 포트폴리오와 거래 현황을 실시간으로 추적
- 💳 **구독 기반 서비스**: Toss Payments 연동을 통한 유연한 플랜 관리
- � **보안 우선**: JWT 인증, API 키 암호화, Rate Limiting 적용

---

## ✨ 주요 기능

### 🏦 거래소 통합

- **해외 거래소**: Binance, Bybit, OKX
- **국내 거래소**: Bithumb, Upbit
- 실시간 잔액 조회 및 거래 실행
- 다중 거래소 동시 관리

### 📈 트레이딩 기능

- 실시간 김치 프리미엄 모니터링
- 사용자 정의 자동매매 전략 설정
- 활성 포지션 실시간 추적
- 수익률 분석 및 거래 히스토리

### 💼 사용자 관리

- JWT 기반 인증 시스템
- 이메일 인증 및 비밀번호 재설정
- 구독 플랜 관리 (Free, Premium, Pro)
- 사용자별 API 키 암호화 저장

### � 대시보드

- 실시간 환율 및 프리미엄 차트
- 포트폴리오 현황 시각화
- 트레이딩 통계 및 성과 분석
- TradingView 차트 통합

---

## 🛠️ 기술 스택

### Frontend

```
React 19 + TypeScript
├── React Router v7        # 풀스택 React 프레임워크
├── TailwindCSS v4         # 유틸리티 퍼스트 CSS
├── Radix UI               # 접근성 높은 UI 컴포넌트
├── Zustand                # 경량 상태 관리
├── Recharts               # 데이터 시각화
├── Lightweight Charts     # 트레이딩 차트
└── Lucide React           # 아이콘 라이브러리
```

### Backend

```
Node.js + Express
├── PostgreSQL             # 관계형 데이터베이스
├── Drizzle ORM            # 타입 안전 ORM
├── JWT                    # 인증 토큰 관리
├── bcryptjs               # 비밀번호 해싱
└── Nodemailer             # 이메일 서비스
```

### 거래소 API

```
Exchange Integrations
├── node-binance-api       # Binance API
├── bybit-api              # Bybit API
├── okx-api                # OKX API
├── Bithumb API (Custom)   # Bithumb 연동
└── Upbit API (Custom)     # Upbit 연동
```

### 결제 시스템

- **Toss Payments SDK**: 구독 결제 처리
- 자동 결제 및 플랜 업그레이드/다운그레이드

---

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
│   ├── stores/                  # Zustand 상태 관리
│   └── utils/                   # 유틸리티 함수
├── database/                    # 데이터베이스 계층
│   ├── schema.ts               # Drizzle 스키마 정의
│   ├── user.ts                 # 사용자 관련 쿼리
│   ├── exchange.ts             # 거래소 관련 쿼리
│   ├── strategy.ts             # 트레이딩 전략
│   └── position.ts             # 포지션 관리
├── exchanges/                   # 거래소 API 클라이언트
│   ├── binance.ts              # Binance 통합
│   ├── bybit.ts                # Bybit 통합
│   ├── okx.ts                  # OKX 통합
│   ├── bithumb.ts              # Bithumb 통합
│   └── upbit.ts                # Upbit 통합
├── drizzle/                    # 데이터베이스 마이그레이션
├── server.js                   # Express 서버
└── docker-compose.yml          # Docker 설정
```

---

## 🚀 시작하기

### 사전 요구사항

- **Node.js** >= 18.x
- **PostgreSQL** >= 16.x
- **Docker** (선택사항)
- **npm** 또는 **yarn**

### 설치

1. **저장소 클론**

   ```bash
   git clone https://github.com/Juhan1212/karbit.git
   cd karbit
   ```

2. **의존성 설치**

   ```bash
   npm install
   ```

3. **환경 변수 설정**

   ```bash
   cp .env.example .env
   ```

   `.env` 파일을 열어 다음 환경 변수를 설정하세요:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/karbit
   JWT_SECRET=your_jwt_secret_key
   SMTP_HOST=smtp.gmail.com
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_password
   TOSS_CLIENT_KEY=your_toss_client_key
   TOSS_SECRET_KEY=your_toss_secret_key
   ```

4. **데이터베이스 실행** (Docker 사용)

   ```bash
   npm run db:start
   ```

5. **데이터베이스 마이그레이션**

   ```bash
   npm run db:migrate
   ```

6. **초기 데이터 시드** (선택사항)

   ```bash
   npm run db:seed drizzle/seed-plans.sql
   npm run db:seed drizzle/seed-exchanges.sql
   npm run db:seed drizzle/seed-coins.sql
   ```

7. **개발 서버 실행**

   ```bash
   npm run dev
   ```

8. **브라우저에서 확인**
   ```
   http://localhost:5173
   ```

---

## 📋 사용 가능한 스크립트

| 명령어                | 설명                            |
| --------------------- | ------------------------------- |
| `npm run dev`         | 개발 서버 실행 (HMR 지원)       |
| `npm run build`       | 프로덕션 빌드                   |
| `npm start`           | 프로덕션 서버 실행              |
| `npm run typecheck`   | TypeScript 타입 체크            |
| `npm run db:start`    | PostgreSQL Docker 컨테이너 시작 |
| `npm run db:stop`     | PostgreSQL Docker 컨테이너 중지 |
| `npm run db:generate` | Drizzle 스키마 생성             |
| `npm run db:migrate`  | 데이터베이스 마이그레이션 실행  |
| `npm run db:push`     | 스키마 변경사항 푸시            |
| `npm run db:studio`   | Drizzle Studio 실행             |
| `npm run db:seed`     | 초기 데이터 시드                |

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블

#### 사용자 관리

- `users`: 사용자 정보
- `sessions`: 세션 관리
- `user_plan_history`: 플랜 변경 이력

#### 거래소 관리

- `exchanges`: 거래소 정보
- `user_exchanges`: 사용자-거래소 연결
- `coins_exchanges`: 거래소별 지원 코인

#### 트레이딩

- `strategies`: 자동매매 전략
- `positions`: 활성 포지션
- `orders`: 주문 내역
- `trading_history`: 거래 히스토리

#### 결제

- `plans`: 구독 플랜
- `payments`: 결제 내역

---

## 🔧 개발 가이드

### 새로운 거래소 추가

1. `exchanges/` 디렉토리에 새 파일 생성

   ```typescript
   // exchanges/new-exchange.ts
   export class NewExchangeClient {
     async getBalance() {
       /* ... */
     }
     async createOrder() {
       /* ... */
     }
   }
   ```

2. `database/exchange.ts`에 거래소 정보 추가
3. `database/schema.ts`에 필요한 스키마 업데이트
4. UI 컴포넌트에 통합

### 새로운 트레이딩 전략 추가

1. `database/strategy.ts`에 전략 로직 구현
2. `app/routes/autotrading.tsx`에 UI 추가
3. 백테스팅 로직 구현 (선택사항)

### API 엔드포인트 추가

1. `app/routes/api/` 디렉토리에 새 파일 생성
2. 인증 미들웨어 적용
3. 에러 핸들링 및 응답 포맷 표준화

---

## 🔒 보안

### 구현된 보안 기능

- ✅ **JWT 기반 인증**: Secure, HttpOnly 쿠키 사용
- ✅ **비밀번호 해싱**: bcryptjs를 이용한 안전한 저장
- ✅ **API 키 암호화**: 거래소 API 키 암호화 저장
- ✅ **SQL 인젝션 방지**: Drizzle ORM 사용
- ✅ **XSS 방지**: React의 자동 이스케이프
- ✅ **CSRF 방지**: 토큰 검증
- ✅ **Rate Limiting**: API 호출 제한

### 보안 권장사항

- 프로덕션 환경에서는 강력한 JWT_SECRET 사용
- HTTPS 사용 필수
- 정기적인 의존성 업데이트
- 환경 변수를 통한 민감 정보 관리

---

## 🚢 배포

### Docker를 이용한 배포

1. **Docker 이미지 빌드**

   ```bash
   docker build -t karbit:latest .
   ```

2. **컨테이너 실행**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="your_db_url" \
     -e JWT_SECRET="your_secret" \
     karbit:latest
   ```

### PM2를 이용한 배포

프로젝트에 포함된 `deploy.sh` 스크립트를 사용하세요:

```bash
chmod +x deploy.sh
./deploy.sh
```

이 스크립트는 다음 작업을 수행합니다:

- PM2 설치 (필요시)
- 프로덕션 빌드
- PM2로 서버 데몬 등록
- systemd 서비스로 등록
- 자동 재시작 설정

### 지원 플랫폼

- AWS (EC2, ECS, Elastic Beanstalk)
- Google Cloud Platform (Compute Engine, Cloud Run)
- Azure (Container Apps, App Service)
- Digital Ocean (Droplets, App Platform)
- Vercel, Netlify (프론트엔드)
- Railway, Render, Fly.io

---

## 📊 성능 최적화

### 구현된 최적화

- **React 메모이제이션**: useMemo, useCallback 활용
- **데이터베이스 쿼리 최적화**: 인덱스 및 조인 최적화
- **코드 스플리팅**: React Router의 lazy loading
- **에셋 최적화**: Vite의 자동 최적화
- **실시간 데이터 폴링**: 효율적인 간격 설정

---

## 🤝 기여하기

프로젝트에 기여를 원하시면 다음 절차를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 기여 가이드라인

- 코드 스타일: TypeScript + ESLint 규칙 준수
- 커밋 메시지: [Conventional Commits](https://www.conventionalcommits.org/) 형식
- 테스트: 새로운 기능에 대한 테스트 추가
- 문서화: README 및 코드 주석 업데이트

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE.md](./LICENSE.md) 파일을 참조하세요.

---

## 📞 지원 및 문의

- **이슈 리포트**: [GitHub Issues](https://github.com/Juhan1212/karbit/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/Juhan1212/karbit/discussions)
- **이메일**: support@karbit.io (예시)

<div align="center">

**Built with ❤️ using React Router v7**

[⬆ 맨 위로](#karbit---암호화폐-자동-트레이딩-플랫폼)

</div>
