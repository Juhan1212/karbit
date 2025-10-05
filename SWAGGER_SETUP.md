# Swagger API 문서 설정 가이드

## 📚 개요

Karbit 프로젝트에 Swagger (OpenAPI) 기반 API 문서화 및 테스트 환경을 구축하는 방법입니다.

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
npm install swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. Swagger UI 접속

브라우저에서 다음 URL로 접속:

- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## 📁 파일 구조

```
karbit/
├── swagger.config.ts       # Swagger 설정 파일
├── swagger.setup.ts        # Swagger 초기화 로직
├── swagger.annotations.ts  # API 문서 주석
└── server.js               # Express 서버 (Swagger 통합)
```

## 📝 API 문서 작성 방법

### 방법 1: JSDoc 주석 사용 (swagger.annotations.ts)

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: 엔드포인트 설명
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param1
 *         schema:
 *           type: string
 *         description: 파라미터 설명
 *     responses:
 *       200:
 *         description: 성공 응답
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 */
```

### 방법 2: API 파일에 직접 주석 추가

```typescript
// app/routes/api/example.ts

/**
 * @swagger
 * /api/example:
 *   post:
 *     summary: 예제 API
 *     tags: [Example]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 생성 성공
 */
export async function action({ request }: ActionFunctionArgs) {
  // 구현
}
```

## 🔧 설정 커스터마이징

### swagger.config.ts 수정

```typescript
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Your API Title",
      version: "1.0.0",
      description: "API 설명",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "개발 서버",
      },
    ],
  },
  apis: ["./app/routes/api/**/*.ts", "./swagger.annotations.ts"],
};
```

## 🎨 Swagger UI 커스터마이징

### swagger.setup.ts에서 옵션 수정

```typescript
const swaggerOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { color: #3b82f6 }
  `,
  customSiteTitle: "Your API Docs",
  customfavIcon: "/favicon.ico",
};
```

## 🔐 인증 설정

### Bearer Token 인증

1. Swagger UI 우측 상단 "Authorize" 버튼 클릭
2. Bearer Token 입력
3. "Authorize" 클릭하여 인증

### Cookie 인증

브라우저에 이미 로그인되어 있다면 자동으로 쿠키가 전송됩니다.

## 📋 주요 태그 및 스키마

### 기본 태그

- **Auth**: 인증 관련 API
- **User**: 사용자 관련 API
- **Exchange**: 거래소 관련 API
- **Position**: 포지션 관련 API
- **Strategy**: 전략 관련 API
- **Payment**: 결제 관련 API

### 공통 스키마

- **User**: 사용자 정보
- **Position**: 포지션 정보
- **Strategy**: 전략 정보
- **Error**: 에러 응답

## 🚀 프로덕션 빌드

프로덕션 환경에서는 보안상 Swagger UI가 비활성화됩니다.

필요시 환경 변수로 제어:

```env
ENABLE_SWAGGER=true  # 프로덕션에서도 활성화 (권장하지 않음)
```

## 📊 API 테스트 예제

### 1. 로그인 테스트

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. 인증이 필요한 API 테스트

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 문제 해결

### Swagger UI가 로드되지 않는 경우

1. 패키지가 설치되었는지 확인:

   ```bash
   npm list swagger-jsdoc swagger-ui-express
   ```

2. 개발 모드로 실행 중인지 확인:

   ```bash
   echo $NODE_ENV  # development여야 함
   ```

3. 콘솔 로그 확인:
   ```
   ✅ Swagger UI available at: http://localhost:3000/api-docs
   ```

### API가 문서에 표시되지 않는 경우

1. `swagger.config.ts`의 `apis` 배열에 파일 경로가 포함되었는지 확인
2. JSDoc 주석 형식이 올바른지 확인
3. 서버 재시작

### TypeScript 에러가 발생하는 경우

```bash
# 타입 정의 재설치
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express

# 타입 체크
npm run typecheck
```

## 📚 참고 자료

- [Swagger OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)

## 💡 Best Practices

1. **보안**: 프로덕션에서는 Swagger UI 비활성화
2. **문서화**: 모든 API에 대해 완전한 설명 작성
3. **예제**: 각 엔드포인트에 실제 예제 데이터 포함
4. **태그**: 관련 API를 태그로 그룹화
5. **스키마**: 공통 스키마는 재사용

## 🔄 업데이트

문서를 수정한 후에는 브라우저를 새로고침하면 자동으로 반영됩니다.
개발 서버가 실행 중이면 핫 리로드됩니다.
