import { Readable } from "stream";
import { neon } from "@neondatabase/serverless";
import { StorageProvider } from "./types";

type Row = Record<string, unknown>;

/**
 * Stores files as bytea rows in PostgreSQL.
 * Designed for Vercel/Neon where the local filesystem is ephemeral.
 */
export class PgStorageProvider implements StorageProvider {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  async ensureTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS storage_files (
        key TEXT PRIMARY KEY,
        data BYTEA NOT NULL,
        content_type TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }

  async put(key: string, data: Buffer, contentType?: string): Promise<void> {
    await this.sql`
      INSERT INTO storage_files (key, data, content_type)
      VALUES (${key}, ${data}, ${contentType ?? null})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, content_type = EXCLUDED.content_type
    `;
  }

  async get(key: string): Promise<Buffer> {
    const rows = (await this.sql`
      SELECT data FROM storage_files WHERE key = ${key}
    `) as Row[];
    if (rows.length === 0) {
      throw new Error(`File not found: ${key}`);
    }
    // Neon returns bytea as a hex string prefixed with \x
    const raw = rows[0].data;
    if (Buffer.isBuffer(raw)) return raw;
    if (typeof raw === "string") {
      // Handle hex-encoded bytea (\x prefix)
      if (raw.startsWith("\\x")) {
        return Buffer.from(raw.slice(2), "hex");
      }
      return Buffer.from(raw, "base64");
    }
    return Buffer.from(raw as any);
  }

  async getStream(key: string): Promise<Readable> {
    const buf = await this.get(key);
    return Readable.from(buf);
  }

  async delete(key: string): Promise<void> {
    await this.sql`DELETE FROM storage_files WHERE key = ${key}`;
  }

  async deletePrefix(prefix: string): Promise<void> {
    await this.sql`DELETE FROM storage_files WHERE key LIKE ${prefix + "%"}`;
  }

  async exists(key: string): Promise<boolean> {
    const rows = (await this.sql`
      SELECT 1 FROM storage_files WHERE key = ${key} LIMIT 1
    `) as Row[];
    return rows.length > 0;
  }

  async list(prefix: string): Promise<string[]> {
    const rows = (await this.sql`
      SELECT key FROM storage_files WHERE key LIKE ${prefix + "%"} ORDER BY key
    `) as Row[];
    return rows.map((r) => r.key as string);
  }
}
