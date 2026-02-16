import type {
  Reporter,
  FullConfig,
  Suite,
  FullResult,
} from "@playwright/test/reporter";
import { zipDirectory } from "./zip";
import { detectCI } from "./ci-detect";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import { URL } from "url";

export interface ReportServerOptions {
  /** URL of the report server (e.g., "http://localhost:3000") */
  serverUrl: string;

  /** Project name to group reports under */
  projectName: string;

  /** Optional custom title for this report */
  title?: string;

  /** Path to the Playwright HTML report output directory (default: playwright-report) */
  outputDir?: string;

  /** Whether to include trace files (default: true) */
  includeTraces?: boolean;
}

class ReportServerReporter implements Reporter {
  private options: ReportServerOptions;
  private startTime = 0;

  constructor(options: ReportServerOptions) {
    this.options = options;
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = Date.now();
  }

  async onEnd(result: FullResult): Promise<void> {
    const outputDir = this.options.outputDir || "playwright-report";
    const reportDir = path.resolve(outputDir);

    if (!fs.existsSync(reportDir)) {
      console.log(
        `[report-server] Report directory not found: ${reportDir}. Skipping upload.`
      );
      return;
    }

    console.log(`[report-server] Zipping report from ${reportDir}...`);
    const zipBuffer = await zipDirectory(reportDir);
    console.log(
      `[report-server] Zip created (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`
    );

    const ci = detectCI();
    const formFields: Record<string, string> = {
      projectName: this.options.projectName,
    };

    if (this.options.title) formFields.title = this.options.title;
    if (ci) {
      formFields.ciProvider = ci.provider;
      if (ci.branch) formFields.branch = ci.branch;
      if (ci.commitSha) formFields.commitSha = ci.commitSha;
      if (ci.commitMessage) formFields.commitMessage = ci.commitMessage;
      if (ci.buildUrl) formFields.buildUrl = ci.buildUrl;
    }

    try {
      console.log(
        `[report-server] Uploading to ${this.options.serverUrl}...`
      );
      const response = await this.upload(zipBuffer, formFields);
      const body = JSON.parse(response);

      const reportUrl = `${this.options.serverUrl}/reports/${body.id}`;
      console.log(`[report-server] Report uploaded successfully!`);
      console.log(`[report-server] View report: ${reportUrl}`);
      console.log(
        `[report-server] Tests: ${body.summary?.totalTests ?? "?"} total, ${body.summary?.passed ?? "?"} passed, ${body.summary?.failed ?? "?"} failed`
      );
    } catch (error) {
      console.error(`[report-server] Failed to upload report:`, error);
    }
  }

  private upload(
    zipBuffer: Buffer,
    fields: Record<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const boundary =
        "----ReportServerBoundary" + Math.random().toString(36).slice(2);
      const parts: Buffer[] = [];

      // Add form fields
      for (const [key, value] of Object.entries(fields)) {
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
          )
        );
      }

      // Add zip file
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="report.zip"\r\nContent-Type: application/zip\r\n\r\n`
        )
      );
      parts.push(zipBuffer);
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

      const body = Buffer.concat(parts);
      const url = new URL("/api/reports/upload", this.options.serverUrl);
      const transport = url.protocol === "https:" ? https : http;

      const req = transport.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Content-Length": body.length,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          res.on("end", () => {
            const responseBody = Buffer.concat(chunks).toString();
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(responseBody);
            } else {
              reject(
                new Error(
                  `Upload failed with status ${res.statusCode}: ${responseBody}`
                )
              );
            }
          });
        }
      );

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }
}

export default ReportServerReporter;
