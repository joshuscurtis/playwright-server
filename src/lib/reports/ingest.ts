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
  testResults: TestResultData[];
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

export interface TestResultData {
  name: string;
  fullName: string;
  suiteName: string | null;
  fileName: string | null;
  status: "passed" | "failed" | "skipped" | "flaky";
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  errorStack: string | null;
  tags: string[];
}

/**
 * Ingest a Playwright report zip file:
 * 1. Extract to temp dir
 * 2. Parse result summary and individual test results from report data
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

    // Try to parse result summary and individual test results
    const { summary: resultSummary, testResults } =
      await parseReportData(extractDir);

    return { reportId, storagePath, files, traces, resultSummary, testResults };
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

interface ParsedReport {
  summary: ResultSummary | null;
  testResults: TestResultData[];
}

/**
 * Parse Playwright report data from extracted directory.
 * Tries report.json (JSON reporter) first, then falls back to HTML reporter data.
 */
async function parseReportData(extractDir: string): Promise<ParsedReport> {
  const possiblePaths = ["report.json", "data/report.json"];

  let bestSummary: ResultSummary | null = null;
  let bestTestResults: TestResultData[] = [];

  for (const p of possiblePaths) {
    try {
      const data = await fs.readFile(path.join(extractDir, p), "utf-8");
      const json = JSON.parse(data);
      const summary = extractSummaryFromJson(json);
      const testResults = extractTestResults(json);

      if (summary) bestSummary = summary;
      if (testResults.length > bestTestResults.length) {
        bestTestResults = testResults;
      }
      if (bestSummary && bestTestResults.length > 0) break;
    } catch {
      continue;
    }
  }

  return { summary: bestSummary, testResults: bestTestResults };
}

function extractSummaryFromJson(json: unknown): ResultSummary | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  if (obj.stats && typeof obj.stats === "object") {
    const stats = obj.stats as Record<string, unknown>;
    return {
      totalTests:
        ((stats.expected as number) ?? 0) +
        ((stats.unexpected as number) ?? 0) +
        ((stats.skipped as number) ?? 0) +
        ((stats.flaky as number) ?? 0),
      passed: (stats.expected as number) ?? 0,
      failed: (stats.unexpected as number) ?? 0,
      skipped: (stats.skipped as number) ?? 0,
      flaky: (stats.flaky as number) ?? 0,
      durationMs: (stats.duration as number) ?? 0,
    };
  }

  return null;
}

/**
 * Extract individual test results from Playwright JSON report.
 * Playwright JSON format: { suites: [{ title, file, suites, specs }] }
 * Each spec has: { title, ok, tests: [{ expectedStatus, results: [{ status, duration, error }] }] }
 */
function extractTestResults(json: unknown): TestResultData[] {
  if (!json || typeof json !== "object") return [];
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.suites)) return [];

  const results: TestResultData[] = [];
  for (const suite of obj.suites) {
    extractFromSuite(suite, [], results);
  }
  return results;
}

function extractFromSuite(
  suite: any,
  parentSuites: string[],
  results: TestResultData[],
  parentFile?: string | null
): void {
  if (!suite || typeof suite !== "object") return;

  const suitePath = [...parentSuites];
  if (suite.title) suitePath.push(suite.title);

  const fileName = suite.file || parentFile || null;

  // Process specs in this suite
  if (Array.isArray(suite.specs)) {
    for (const spec of suite.specs) {
      extractFromSpec(spec, suitePath, fileName, results);
    }
  }

  // Recurse into nested suites, passing file name down
  if (Array.isArray(suite.suites)) {
    for (const child of suite.suites) {
      extractFromSuite(child, suitePath, results, fileName);
    }
  }
}

function extractFromSpec(
  spec: any,
  suitePath: string[],
  fileName: string | null,
  results: TestResultData[]
): void {
  if (!spec || typeof spec !== "object") return;
  if (!Array.isArray(spec.tests)) return;

  for (const test of spec.tests) {
    if (!test || !Array.isArray(test.results) || test.results.length === 0)
      continue;

    const testResults = test.results;
    const lastResult = testResults[testResults.length - 1];

    // Determine final status
    let status: TestResultData["status"];
    const retries = testResults.length - 1;

    if (lastResult.status === "skipped") {
      status = "skipped";
    } else if (retries > 0 && lastResult.status === "passed") {
      status = "flaky";
    } else if (
      lastResult.status === "passed" ||
      lastResult.status === "expected"
    ) {
      status = "passed";
    } else {
      status = "failed";
    }

    // Sum duration across all retries
    const durationMs = testResults.reduce(
      (sum: number, r: any) => sum + (r.duration || 0),
      0
    );

    // Extract error from the last failure
    let errorMessage: string | null = null;
    let errorStack: string | null = null;
    const failedResult = testResults.find(
      (r: any) =>
        r.status === "failed" ||
        r.status === "timedOut" ||
        r.status === "unexpected"
    );
    if (failedResult?.error) {
      errorMessage = failedResult.error.message || null;
      errorStack = failedResult.error.stack || null;
    }

    // Extract tags from annotations
    const tags: string[] = [];
    if (Array.isArray(spec.tags)) {
      tags.push(...spec.tags);
    }
    if (Array.isArray(test.annotations)) {
      for (const ann of test.annotations) {
        if (ann.type && ann.type !== "fixme" && ann.type !== "skip") {
          tags.push(ann.type);
        }
      }
    }

    const suiteName =
      suitePath.length > 1 ? suitePath.slice(1).join(" > ") : null;
    const fullName = [...suitePath, spec.title].join(" > ");

    results.push({
      name: spec.title || "Unknown test",
      fullName,
      suiteName,
      fileName,
      status,
      durationMs,
      retries,
      errorMessage,
      errorStack,
      tags,
    });
  }
}
