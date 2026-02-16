import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { LocalStorageProvider } from "./local";

describe("LocalStorageProvider", () => {
  let storage: LocalStorageProvider;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pw-storage-test-"));
    storage = new LocalStorageProvider(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("put and get", () => {
    it("stores and retrieves a file", async () => {
      const data = Buffer.from("hello world");
      await storage.put("test/file.txt", data);
      const result = await storage.get("test/file.txt");
      expect(result.toString()).toBe("hello world");
    });

    it("creates nested directories automatically", async () => {
      const data = Buffer.from("deep file");
      await storage.put("a/b/c/d/deep.txt", data);
      const result = await storage.get("a/b/c/d/deep.txt");
      expect(result.toString()).toBe("deep file");
    });

    it("overwrites existing files", async () => {
      await storage.put("file.txt", Buffer.from("v1"));
      await storage.put("file.txt", Buffer.from("v2"));
      const result = await storage.get("file.txt");
      expect(result.toString()).toBe("v2");
    });
  });

  describe("getStream", () => {
    it("returns a readable stream", async () => {
      await storage.put("stream.txt", Buffer.from("stream data"));
      const stream = await storage.getStream("stream.txt");
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks).toString()).toBe("stream data");
    });
  });

  describe("exists", () => {
    it("returns true for existing files", async () => {
      await storage.put("exists.txt", Buffer.from("yes"));
      expect(await storage.exists("exists.txt")).toBe(true);
    });

    it("returns false for missing files", async () => {
      expect(await storage.exists("nope.txt")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes a file", async () => {
      await storage.put("doomed.txt", Buffer.from("bye"));
      await storage.delete("doomed.txt");
      expect(await storage.exists("doomed.txt")).toBe(false);
    });

    it("does not throw for missing files", async () => {
      await expect(storage.delete("ghost.txt")).resolves.not.toThrow();
    });
  });

  describe("deletePrefix", () => {
    it("removes all files under a prefix", async () => {
      await storage.put("project/a.txt", Buffer.from("a"));
      await storage.put("project/b.txt", Buffer.from("b"));
      await storage.put("other/c.txt", Buffer.from("c"));

      await storage.deletePrefix("project");

      expect(await storage.exists("project/a.txt")).toBe(false);
      expect(await storage.exists("project/b.txt")).toBe(false);
      expect(await storage.exists("other/c.txt")).toBe(true);
    });
  });

  describe("list", () => {
    it("lists all files under a prefix", async () => {
      await storage.put("reports/r1/index.html", Buffer.from("html"));
      await storage.put("reports/r1/data.json", Buffer.from("json"));
      await storage.put("reports/r2/index.html", Buffer.from("html2"));

      const files = await storage.list("reports/r1");
      expect(files.sort()).toEqual([
        "reports/r1/data.json",
        "reports/r1/index.html",
      ]);
    });

    it("returns empty array for non-existent prefix", async () => {
      const files = await storage.list("nonexistent");
      expect(files).toEqual([]);
    });
  });

  describe("path traversal protection", () => {
    it("rejects path traversal attempts", async () => {
      await expect(
        storage.put("../../etc/passwd", Buffer.from("evil"))
      ).rejects.toThrow("path traversal");
    });
  });
});
