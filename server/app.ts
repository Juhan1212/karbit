import { createRequestHandler } from "@react-router/express";
import { drizzle } from "drizzle-orm/postgres-js";
import express from "express";
import postgres from "postgres";
import "react-router";

import { DatabaseContext } from "~/database/context";
import * as schema from "~/database/schema";

declare module "react-router" {
  interface AppLoadContext {
    VALUE_FROM_EXPRESS: string;
  }
}

export const app = express();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = postgres(process.env.DATABASE_URL, {
  // Connection pool 설정
  max: 20, // 최대 연결 수
  idle_timeout: 20, // 유휴 연결 타임아웃 (초)
  connect_timeout: 10, // 연결 타임아웃 (초)

  // 재시도 설정
  connection: {
    application_name: "karbit-app",
  },

  // 에러 핸들링
  onnotice: (notice) => {
    console.log("PostgreSQL Notice:", notice);
  },
});
const db = drizzle(client, { schema });
app.use((_, __, next) => DatabaseContext.run(db, next));

// .well-known 경로들 처리 (Chrome DevTools, 보안 관련 등)
app.use((req, res, next) => {
  if (req.path.startsWith("/.well-known/")) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return {
        VALUE_FROM_EXPRESS: "Hello from Express",
      };
    },
  })
);
