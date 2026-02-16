import archiver from "archiver";
import fs from "fs";
import path from "path";
import { Writable } from "stream";

/**
 * Create a zip buffer from a directory (the Playwright HTML report output).
 */
export async function zipDirectory(dirPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => reject(err));
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });

    writable.on("finish", () => resolve(Buffer.concat(chunks)));

    archive.pipe(writable);
    archive.directory(dirPath, false);
    archive.finalize();
  });
}

/**
 * Recursively list files in a directory.
 */
export function listFiles(dir: string, prefix = ""): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...listFiles(path.join(dir, entry.name), rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}
