import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

let _db: DbInstance | null = null;

function createNeonDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzleNeon(sql, { schema });
}

function createPgDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return drizzlePg(pool, { schema });
}

export function getDb(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!_db) {
    // Use node-postgres for local/standard PostgreSQL, Neon for serverless
    if (url.includes("neon.tech")) {
      _db = createNeonDb(url);
    } else {
      _db = createPgDb(url);
    }
  }
  return _db as any;
}

export type Database = ReturnType<typeof getDb>;

export { schema };
