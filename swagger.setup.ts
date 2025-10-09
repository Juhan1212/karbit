import express from "express";

export async function setupSwagger(app: express.Express) {
  // 개발 환경에서만 Swagger UI 활성화
  if (process.env.NODE_ENV === "development") {
    try {
      // 동적 import를 사용하여 개발 의존성 로드
      const swaggerUi = await import("swagger-ui-express");
      const config = await import("./swagger.config.js");

      // Swagger UI 설정
      const swaggerOptions = {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Karbit API Documentation",
      };

      // Swagger JSON 엔드포인트
      app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(config.swaggerSpec);
      });

      // Swagger UI 엔드포인트
      app.use(
        "/api-docs",
        swaggerUi.default.serve,
        swaggerUi.default.setup(config.swaggerSpec, swaggerOptions)
      );

      console.log("✅ Swagger UI available at: http://localhost:3000/api-docs");
      console.log(
        "✅ Swagger JSON available at: http://localhost:3000/api-docs.json"
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn("⚠️ Swagger setup failed:", err.message);
      console.warn("Run: npm install swagger-jsdoc swagger-ui-express");
    }
  }
}
