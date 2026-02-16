import { Readable } from "stream";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  constructor(private basePath: string) {}

  private resolvePath(key: string): string {
    // Prevent path traversal
    const resolved = path.resolve(this.basePath, key);
    if (!resolved.startsWith(path.resolve(this.basePath))) {
      throw new Error("Invalid storage key: path traversal detected");
    }
    return resolved;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async getStream(key: string): Promise<Readable> {
    const filePath = this.resolvePath(key);
    return createReadStream(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.unlink(filePath).catch(() => {});
  }

  async deletePrefix(prefix: string): Promise<void> {
    const dirPath = this.resolvePath(prefix);
    await fs.rm(dirPath, { recursive: true, force: true });
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = this.resolvePath(prefix);
    const results: string[] = [];
    try {
      await this._walk(dirPath, prefix, results);
    } catch {
      // Directory doesn't exist, return empty
    }
    return results;
  }

  private async _walk(
    dir: string,
    prefix: string,
    results: string[]
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(prefix, entry.name);
      if (entry.isDirectory()) {
        await this._walk(path.join(dir, entry.name), relPath, results);
      } else {
        results.push(relPath);
      }
    }
  }
}
