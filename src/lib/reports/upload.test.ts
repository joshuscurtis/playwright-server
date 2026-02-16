import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import archiver from "archiver";
import { Writable } from "stream";
import { ingestReport } from "./ingest";
import { LocalStorageProvider } from "@/lib/storage/local";

/** Create a realistic Playwright report zip */
async function createPlaywrightReportZip(options?: {
  includeTraces?: boolean;
  includeResultJson?: boolean;
}): Promise<Buffer> {
  const files: Record<string, string | Buffer> = {
    "index.html": `<!DOCTYPE html>
<html>
<head><title>Playwright Test Report</title></head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>`,
    "app.js": "// Playwright report app bundle\nconsole.log('report');",
    "assets/style.css": "body { font-family: sans-serif; }",
  };

  if (options?.includeResultJson) {
    files["report.json"] = JSON.stringify({
      stats: {
        expected: 42,
        unexpected: 3,
        skipped: 5,
        flaky: 2,
        duration: 15230,
      },
    });
  }

  if (options?.includeTraces) {
    files["data/trace-abc123.zip"] = Buffer.from("fake trace zip data 1");
    files["data/trace-def456.zip"] = Buffer.from("fake trace zip data 2");
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    const archive = archiver("zip", { zlib: { level: 0 } });
    archive.on("error", reject);
    writable.on("finish", () => resolve(Buffer.concat(chunks)));

    archive.pipe(writable);
    for (const [name, content] of Object.entries(files)) {
      archive.append(
        typeof content === "string" ? Buffer.from(content) : content,
        { name }
      );
    }
    archive.finalize();
  });
}

describe("Upload flow (end-to-end with local storage)", () => {
  let storage: LocalStorageProvider;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-upload-test-"));
    storage = new LocalStorageProvider(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("ingests a basic report zip and stores all files", async () => {
    const zip = await createPlaywrightReportZip();
    const result = await ingestReport(zip, "prj_test123", storage);

    expect(result.reportId).toMatch(/^rpt_/);
    expect(result.files).toContain("index.html");
    expect(result.files).toContain("app.js");
    expect(result.files).toContain("assets/style.css");

    // Verify stored
    const html = await storage.get(`prj_test123/${result.reportId}/index.html`);
    expect(html.toString()).toContain("Playwright Test Report");
  });

  it("extracts test result summary from report.json", async () => {
    const zip = await createPlaywrightReportZip({ includeResultJson: true });
    const result = await ingestReport(zip, "prj_test123", storage);

    expect(result.resultSummary).toEqual({
      totalTests: 52,
      passed: 42,
      failed: 3,
      skipped: 5,
      flaky: 2,
      durationMs: 15230,
    });
  });

  it("identifies and catalogues trace files", async () => {
    const zip = await createPlaywrightReportZip({ includeTraces: true });
    const result = await ingestReport(zip, "prj_test123", storage);

    expect(result.traces).toHaveLength(2);
    const traceNames = result.traces.map((t) => t.fileName).sort();
    expect(traceNames).toEqual([
      "data/trace-abc123.zip",
      "data/trace-def456.zip",
    ]);

    // Verify traces are stored
    for (const trace of result.traces) {
      const exists = await storage.exists(trace.storagePath);
      expect(exists).toBe(true);
    }
  });

  it("handles a full report with results and traces", async () => {
    const zip = await createPlaywrightReportZip({
      includeResultJson: true,
      includeTraces: true,
    });
    const result = await ingestReport(zip, "prj_full", storage);

    // All files present
    expect(result.files.length).toBeGreaterThanOrEqual(5);

    // Summary parsed
    expect(result.resultSummary?.totalTests).toBe(52);

    // Traces found
    expect(result.traces).toHaveLength(2);

    // All files accessible in storage
    for (const file of result.files) {
      const key = `prj_full/${result.reportId}/${file}`;
      expect(await storage.exists(key)).toBe(true);
    }
  });

  it("generates unique report IDs per ingestion", async () => {
    const zip = await createPlaywrightReportZip();
    const r1 = await ingestReport(zip, "prj_test", storage);
    const r2 = await ingestReport(zip, "prj_test", storage);

    expect(r1.reportId).not.toBe(r2.reportId);
    expect(r1.storagePath).not.toBe(r2.storagePath);
  });
});
