import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Passport 및 서버 외부에서 사용할 독립적인 DB 연결
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // passport용으로는 작은 풀 사용
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
