import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import fs from "fs/promises";
import path from "path";
import os from "os";

/**
 * Test the reporter's upload mechanism against a mock HTTP server.
 * This verifies the multipart form data encoding is correct.
 */
describe("Reporter upload (mock server)", () => {
  let server: http.Server;
  let port: number;
  let lastRequest: {
    headers: http.IncomingHttpHeaders;
    body: Buffer;
  } | null = null;

  beforeEach(async () => {
    lastRequest = null;

    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => {
        lastRequest = {
          headers: req.headers,
          body: Buffer.concat(chunks),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "rpt_test123",
            summary: { totalTests: 10, passed: 8, failed: 2 },
          })
        );
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("sends multipart form data with zip file and fields", async () => {
    // Dynamically import the reporter to use the mock server
    const ReportServerReporter = (await import("./index")).default;

    // Create a minimal report directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-reporter-test-"));
    const reportDir = path.join(tmpDir, "playwright-report");
    await fs.mkdir(reportDir);
    await fs.writeFile(
      path.join(reportDir, "index.html"),
      "<html>Test Report</html>"
    );

    const reporter = new ReportServerReporter({
      serverUrl: `http://localhost:${port}`,
      projectName: "test-project",
      title: "CI Run #42",
      outputDir: reportDir,
    });

    // Simulate onBegin
    reporter.onBegin({} as never, {} as never);

    // Simulate onEnd
    await reporter.onEnd({ status: "passed" } as never);

    // Verify the request was made
    expect(lastRequest).not.toBeNull();
    expect(lastRequest!.headers["content-type"]).toContain(
      "multipart/form-data"
    );

    const body = lastRequest!.body.toString();
    expect(body).toContain('name="projectName"');
    expect(body).toContain("test-project");
    expect(body).toContain('name="title"');
    expect(body).toContain("CI Run #42");
    expect(body).toContain('name="file"');
    expect(body).toContain("report.zip");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("handles server errors gracefully", async () => {
    // Close the good server and start one that returns errors
    await new Promise<void>((resolve) => server.close(() => resolve()));

    const errorServer = http.createServer((_req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal error" }));
    });

    await new Promise<void>((resolve) => {
      errorServer.listen(port, () => resolve());
    });

    const ReportServerReporter = (await import("./index")).default;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-reporter-test-"));
    const reportDir = path.join(tmpDir, "playwright-report");
    await fs.mkdir(reportDir);
    await fs.writeFile(
      path.join(reportDir, "index.html"),
      "<html>Test Report</html>"
    );

    const reporter = new ReportServerReporter({
      serverUrl: `http://localhost:${port}`,
      projectName: "test-project",
      outputDir: reportDir,
    });

    reporter.onBegin({} as never, {} as never);

    // Should not throw — errors are caught and logged
    await reporter.onEnd({ status: "passed" } as never);

    await new Promise<void>((resolve) =>
      errorServer.close(() => resolve())
    );
    await fs.rm(tmpDir, { recursive: true, force: true });

    // Re-create the original server so afterEach cleanup doesn't fail
    server = http.createServer(() => {});
    await new Promise<void>((resolve) => {
      server.listen(port, () => resolve());
    });
  });
});
