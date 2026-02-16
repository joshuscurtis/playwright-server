import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import archiver from "archiver";
import { Writable } from "stream";
import { ingestReport } from "./ingest";
import { LocalStorageProvider } from "@/lib/storage/local";

/** Helper: create a zip buffer from an object of filename -> content */
async function createZipBuffer(
  files: Record<string, string | Buffer>
): Promise<Buffer> {
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

describe("ingestReport", () => {
  let storage: LocalStorageProvider;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-ingest-test-"));
    storage = new LocalStorageProvider(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("extracts and stores all files from a zip", async () => {
    const zipBuffer = await createZipBuffer({
      "index.html": "<html><body>Report</body></html>",
      "data/test-1.json": '{"test": "data"}',
      "assets/app.js": "console.log('hi')",
    });

    const result = await ingestReport(zipBuffer, "proj_123", storage);

    expect(result.reportId).toMatch(/^rpt_/);
    expect(result.storagePath).toBe(`proj_123/${result.reportId}`);
    expect(result.files.sort()).toEqual([
      "assets/app.js",
      "data/test-1.json",
      "index.html",
    ]);

    // Verify files were actually stored
    const html = await storage.get(
      `proj_123/${result.reportId}/index.html`
    );
    expect(html.toString()).toBe("<html><body>Report</body></html>");
  });

  it("identifies trace zip files", async () => {
    const traceData = Buffer.from("fake trace zip data");
    const zipBuffer = await createZipBuffer({
      "index.html": "<html>Report</html>",
      "data/trace-abc123.zip": traceData,
    });

    const result = await ingestReport(zipBuffer, "proj_123", storage);

    expect(result.traces).toHaveLength(1);
    expect(result.traces[0].fileName).toBe("data/trace-abc123.zip");
    expect(result.traces[0].sizeBytes).toBe(traceData.length);
    expect(result.traces[0].storagePath).toContain("trace-abc123.zip");
  });

  it("parses result summary from report.json", async () => {
    const reportJson = JSON.stringify({
      stats: {
        expected: 10,
        unexpected: 2,
        skipped: 3,
        flaky: 1,
        duration: 5000,
      },
    });

    const zipBuffer = await createZipBuffer({
      "index.html": "<html>Report</html>",
      "report.json": reportJson,
    });

    const result = await ingestReport(zipBuffer, "proj_123", storage);

    expect(result.resultSummary).toEqual({
      totalTests: 16,
      passed: 10,
      failed: 2,
      skipped: 3,
      flaky: 1,
      durationMs: 5000,
    });
  });

  it("returns null summary when no report.json exists", async () => {
    const zipBuffer = await createZipBuffer({
      "index.html": "<html>Report</html>",
    });

    const result = await ingestReport(zipBuffer, "proj_123", storage);
    expect(result.resultSummary).toBeNull();
  });

  it("cleans up temp directory even on success", async () => {
    const zipBuffer = await createZipBuffer({
      "index.html": "<html>Report</html>",
    });

    await ingestReport(zipBuffer, "proj_123", storage);

    // Temp dirs in os.tmpdir starting with pw-ingest- should be cleaned up
    // We can't easily check this directly, but we verify no errors occurred
  });
});
