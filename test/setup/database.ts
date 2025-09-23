// test/setup/database.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../app/database/schema";
import { DatabaseContext } from "../../app/database/context";

let connection: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function setupTestDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for tests");
  }

  if (!connection) {
    connection = postgres(process.env.DATABASE_URL, { prepare: false });
    db = drizzle(connection, { schema });
  }

  return db!;
}

export async function runWithDatabase<T>(
  callback: () => Promise<T>
): Promise<T> {
  const testDb = await setupTestDatabase();
  return DatabaseContext.run(testDb, callback);
}

export async function closeTestDatabase() {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
}
