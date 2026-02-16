import { StorageProvider } from "@/lib/storage";
import { generateId } from "@/lib/id";
import path from "path";
import os from "os";
import fs from "fs/promises";
import extractZip from "extract-zip";

export interface IngestResult {
  reportId: string;
  storagePath: string;
  files: string[];
  traces: TraceMeta[];
  resultSummary: ResultSummary | null;
}

export interface TraceMeta {
  fileName: string;
  storagePath: string;
  sizeBytes: number;
}

export interface ResultSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
}

/**
 * Ingest a Playwright report zip file:
 * 1. Extract to temp dir
 * 2. Parse result summary from report data if available
 * 3. Upload all files to storage
 * 4. Identify trace files
 */
export async function ingestReport(
  zipBuffer: Buffer,
  projectId: string,
  storage: StorageProvider
): Promise<IngestResult> {
  const reportId = generateId("rpt");
  const storagePath = `${projectId}/${reportId}`;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-ingest-"));

  try {
    // Write zip to temp file and extract
    const zipPath = path.join(tmpDir, "report.zip");
    await fs.writeFile(zipPath, zipBuffer);
    const extractDir = path.join(tmpDir, "extracted");
    await extractZip(zipPath, { dir: extractDir });

    // Walk extracted files
    const files: string[] = [];
    const traces: TraceMeta[] = [];
    await walkDir(extractDir, "", files);

    // Upload all files to storage and identify traces
    for (const relativePath of files) {
      const filePath = path.join(extractDir, relativePath);
      const data = await fs.readFile(filePath);
      const storageKey = `${storagePath}/${relativePath}`;
      await storage.put(storageKey, data);

      if (relativePath.endsWith(".zip") && relativePath.includes("trace")) {
        const stat = await fs.stat(filePath);
        traces.push({
          fileName: relativePath,
          storagePath: storageKey,
          sizeBytes: stat.size,
        });
      }
    }

    // Try to parse result summary
    const resultSummary = await parseResultSummary(extractDir);

    return { reportId, storagePath, files, traces, resultSummary };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function walkDir(
  baseDir: string,
  prefix: string,
  results: string[]
): Promise<void> {
  const entries = await fs.readdir(path.join(baseDir, prefix), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkDir(baseDir, relativePath, results);
    } else {
      results.push(relativePath);
    }
  }
}

/**
 * Try to parse Playwright's report.json or result data.
 * The HTML reporter includes a JSON payload with test stats.
 */
async function parseResultSummary(
  extractDir: string
): Promise<ResultSummary | null> {
  // Playwright HTML reporter stores data in report.json or app.js
  // Check for common patterns
  const possiblePaths = [
    "report.json",
    "data/report.json",
  ];

  for (const p of possiblePaths) {
    try {
      const data = await fs.readFile(path.join(extractDir, p), "utf-8");
      const json = JSON.parse(data);
      return extractSummaryFromJson(json);
    } catch {
      continue;
    }
  }

  return null;
}

function extractSummaryFromJson(json: unknown): ResultSummary | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  // Playwright JSON reporter format
  if (obj.stats && typeof obj.stats === "object") {
    const stats = obj.stats as Record<string, unknown>;
    return {
      totalTests: (stats.expected as number ?? 0) + (stats.unexpected as number ?? 0) + (stats.skipped as number ?? 0) + (stats.flaky as number ?? 0),
      passed: (stats.expected as number) ?? 0,
      failed: (stats.unexpected as number) ?? 0,
      skipped: (stats.skipped as number) ?? 0,
      flaky: (stats.flaky as number) ?? 0,
      durationMs: (stats.duration as number) ?? 0,
    };
  }

  return null;
}
