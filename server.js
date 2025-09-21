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
if (!process.env.PORT) {
  console.error(
    "PORT 환경 변수가 설정되어 있지 않습니다. .env 파일을 확인하세요."
  );
  process.exit(1);
}
const PORT = DEVELOPMENT ? 3000 : Number.parseInt(process.env.PORT);

const app = express();

app.use(compression());
app.disable("x-powered-by");

// CORS 미들웨어
app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없으면(서버-서버, Postman 등) 허용
      if (!origin) return callback(null, true);
      const allowed = [
        process.env.BASE_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
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
  console.log("Starting production server");
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

const server = app.listen(PORT, () => {
  const baseUrl = DEVELOPMENT
    ? `http://localhost:${PORT}`
    : process.env.BASE_URL;
  console.log(`Server is running on ${baseUrl}`);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
