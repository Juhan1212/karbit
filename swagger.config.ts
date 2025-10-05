import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Karbit API Documentation",
      version: "1.0.0",
      description: "김치 프리미엄을 활용한 암호화폐 자동 트레이딩 플랫폼 API",
      contact: {
        name: "Karbit Support",
        email: "support@karbit.io",
      },
      license: {
        name: "MIT",
        url: "https://github.com/Juhan1212/karbit/blob/main/LICENSE.md",
      },
    },
    servers: [
      {
        url: "http://localhost:5173",
        description: "개발 서버",
      },
      {
        url: "https://api.karbit.io",
        description: "프로덕션 서버",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT 토큰을 입력하세요 (쿠키 또는 헤더)",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
          description: "쿠키에 저장된 JWT 토큰",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "사용자 고유 ID",
            },
            email: {
              type: "string",
              format: "email",
              description: "이메일 주소",
            },
            name: {
              type: "string",
              description: "사용자 이름",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "생성 일시",
            },
          },
        },
        Position: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            coinSymbol: {
              type: "string",
              description: "코인 심볼 (예: BTC, ETH)",
            },
            krExchange: {
              type: "string",
              description: "한국 거래소 (UPBIT, BITHUMB)",
            },
            frExchange: {
              type: "string",
              description: "해외 거래소 (BINANCE, BYBIT, OKX)",
            },
            totalKrVolume: {
              type: "number",
              description: "한국 거래소 총 거래량",
            },
            totalFrVolume: {
              type: "number",
              description: "해외 거래소 총 거래량",
            },
            currentProfit: {
              type: "number",
              description: "현재 수익",
            },
            profitRate: {
              type: "number",
              description: "수익률 (%)",
            },
          },
        },
        Strategy: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
              description: "전략 이름",
            },
            isActive: {
              type: "boolean",
              description: "활성화 여부",
            },
            targetCoins: {
              type: "array",
              items: {
                type: "string",
              },
              description: "대상 코인 목록",
            },
            minPremium: {
              type: "number",
              description: "최소 프리미엄 (%)",
            },
            maxLeverage: {
              type: "number",
              description: "최대 레버리지",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "에러 메시지",
            },
            code: {
              type: "string",
              description: "에러 코드",
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "인증 실패",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
              example: {
                error: "Unauthorized",
                code: "AUTH_REQUIRED",
              },
            },
          },
        },
        NotFoundError: {
          description: "리소스를 찾을 수 없음",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Auth",
        description: "인증 관련 API",
      },
      {
        name: "User",
        description: "사용자 관련 API",
      },
      {
        name: "Exchange",
        description: "거래소 관련 API",
      },
      {
        name: "Position",
        description: "포지션 관련 API",
      },
      {
        name: "Strategy",
        description: "전략 관련 API",
      },
      {
        name: "Payment",
        description: "결제 관련 API",
      },
    ],
  },
  // API 문서를 자동으로 수집할 파일 경로
  apis: [
    "./app/routes/api/**/*.ts",
    "./app/routes/api/**/*.tsx",
    "./swagger.annotations.ts", // 별도 어노테이션 파일
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
