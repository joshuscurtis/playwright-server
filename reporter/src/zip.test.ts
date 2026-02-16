import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import extractZip from "extract-zip";
import { zipDirectory, listFiles } from "./zip";

describe("zipDirectory", () => {
  let tmpDir: string;
  let reportDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-zip-test-"));
    reportDir = path.join(tmpDir, "report");
    await fs.mkdir(reportDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("zips a directory into a valid zip buffer", async () => {
    await fs.writeFile(path.join(reportDir, "index.html"), "<html>test</html>");
    await fs.mkdir(path.join(reportDir, "data"));
    await fs.writeFile(path.join(reportDir, "data/test.json"), '{"ok":true}');

    const zipBuffer = await zipDirectory(reportDir);
    expect(zipBuffer.length).toBeGreaterThan(0);

    // Verify by extracting
    const extractDir = path.join(tmpDir, "extracted");
    const zipPath = path.join(tmpDir, "test.zip");
    await fs.writeFile(zipPath, zipBuffer);
    await extractZip(zipPath, { dir: extractDir });

    const indexHtml = await fs.readFile(
      path.join(extractDir, "index.html"),
      "utf-8"
    );
    expect(indexHtml).toBe("<html>test</html>");

    const testJson = await fs.readFile(
      path.join(extractDir, "data/test.json"),
      "utf-8"
    );
    expect(JSON.parse(testJson)).toEqual({ ok: true });
  });

  it("handles nested directories", async () => {
    await fs.mkdir(path.join(reportDir, "a/b/c"), { recursive: true });
    await fs.writeFile(path.join(reportDir, "a/b/c/deep.txt"), "deep");

    const zipBuffer = await zipDirectory(reportDir);
    const extractDir = path.join(tmpDir, "extracted");
    const zipPath = path.join(tmpDir, "test.zip");
    await fs.writeFile(zipPath, zipBuffer);
    await extractZip(zipPath, { dir: extractDir });

    const content = await fs.readFile(
      path.join(extractDir, "a/b/c/deep.txt"),
      "utf-8"
    );
    expect(content).toBe("deep");
  });
});

describe("listFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-list-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("lists all files recursively", async () => {
    await fs.writeFile(path.join(tmpDir, "a.txt"), "a");
    await fs.mkdir(path.join(tmpDir, "sub"));
    await fs.writeFile(path.join(tmpDir, "sub/b.txt"), "b");

    const files = listFiles(tmpDir);
    expect(files.sort()).toEqual(["a.txt", "sub/b.txt"]);
  });
});
