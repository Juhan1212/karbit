import compression from "compression";
import express from "express";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

// Short-circuit the type-checking of the built output.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BUILD_PATH = join(__dirname, "build/server/index.js");

if (!process.env.NODE_ENV) {
  console.error(
    "NODE_ENV 환경 변수가 설정되어 있지 않습니다. .env 파일을 확인하세요."
  );
  process.exit(1);
}

const DEVELOPMENT = process.env.NODE_ENV === "development";

// 프로덕션에서는 항상 3000포트 사용 (Nginx 리버스 프록시)
const PORT = 3000;

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port: ${PORT}`);

const app = express();

app.use(compression());
app.disable("x-powered-by");

// Trust proxy - Nginx 뒤에서 실제 클라이언트 IP 받기
app.set("trust proxy", true);

// CORS 미들웨어
app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없으면(서버-서버, Postman 등) 허용
      if (!origin) return callback(null, true);

      const allowed = [
        process.env.BASE_URL,
        process.env.BASE_DNS_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://karbit.world",
        "https://www.karbit.world",
      ];

      // ngrok 도메인 허용 (개발 환경)
      if (DEVELOPMENT && origin.includes(".ngrok-free.app")) {
        return callback(null, true);
      }

      // ngrok.io 도메인 허용 (구버전)
      if (DEVELOPMENT && origin.includes(".ngrok.io")) {
        return callback(null, true);
      }

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

if (DEVELOPMENT) {
  console.log("Starting development server");
  try {
    const viteDevServer = await import("vite").then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      })
    );

    // 정적 파일 서빙 (업로드된 이미지) - Vite 미들웨어보다 먼저
    app.use(
      "/uploads",
      express.static("public/uploads", {
        maxAge: "1d",
        setHeaders: (res, path) => {
          if (path.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        },
      })
    );

    // Swagger 설정 (Vite를 통해 TypeScript 파일 로드) - React Router보다 먼저 등록
    try {
      const swaggerModule =
        await viteDevServer.ssrLoadModule("./swagger.setup.ts");
      await swaggerModule.setupSwagger(app);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn("⚠️ Swagger setup failed:", error.message);
    }

    app.use(viteDevServer.middlewares);
    app.use(async (req, res, next) => {
      try {
        const source = await viteDevServer.ssrLoadModule("./server/app.ts");
        return await source.app(req, res, next);
      } catch (error) {
        console.error("SSR Load Error:", error);
        if (typeof error === "object" && error instanceof Error) {
          viteDevServer.ssrFixStacktrace(error);
        }
        next(error);
      }
    });
  } catch (error) {
    console.error("Failed to create Vite dev server:", error);
    process.exit(1);
  }
} else {
  console.log("Starting production server (behind Nginx reverse proxy)");

  // 정적 파일 서빙 (업로드된 이미지)
  app.use(
    "/uploads",
    express.static("public/uploads", {
      maxAge: "1d",
      setHeaders: (res, path) => {
        if (path.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    })
  );

  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(morgan("tiny"));
  app.use(express.static("build/client", { maxAge: "1h" }));

  try {
    const mod = await import(`file://${BUILD_PATH}`);
    app.use(mod.app);
    console.log("React Router app loaded successfully");
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Server is running on http://127.0.0.1:${PORT}`);
  console.log(
    `🔒 Listening only on localhost (Nginx will handle external traffic)`
  );
  if (!DEVELOPMENT) {
    console.log(`🌐 Public URL: https://karbit.world`);
  }
});

server.on("error", (error) => {
  console.error("Server error:", error);
  // error 객체에 code 프로퍼티가 있는지 타입 가드로 확인
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EADDRINUSE"
  ) {
    console.error(
      `❌ Port ${PORT} is already in use. Stop the existing process first.`
    );
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
