import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { S3StorageProvider, S3StorageConfig } from "./s3";
import {
  S3Client,
  CreateBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

/**
 * These tests require LocalStack running on port 4566.
 * Start it with: docker compose -f docker-compose.dev.yml up localstack
 *
 * They are skipped automatically if LocalStack is unreachable.
 */

const LOCALSTACK_ENDPOINT = "http://localhost:4566";
const TEST_BUCKET = "vitest-s3-storage-test";

async function isLocalStackAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCALSTACK_ENDPOINT}/_localstack/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const localStackAvailable = await isLocalStackAvailable();

describe.skipIf(!localStackAvailable)("S3StorageProvider (LocalStack)", () => {
  const config: S3StorageConfig = {
    bucket: TEST_BUCKET,
    region: "us-east-1",
    endpoint: LOCALSTACK_ENDPOINT,
    accessKeyId: "test",
    secretAccessKey: "test",
    forcePathStyle: true,
  };

  let storage: S3StorageProvider;
  let s3Client: S3Client;

  beforeAll(async () => {
    s3Client = new S3Client({
      region: "us-east-1",
      endpoint: LOCALSTACK_ENDPOINT,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      forcePathStyle: true,
    });

    // Create test bucket (ignore if already exists)
    try {
      await s3Client.send(
        new CreateBucketCommand({ Bucket: TEST_BUCKET })
      );
    } catch {
      // bucket may already exist
    }
  });

  beforeEach(async () => {
    storage = new S3StorageProvider(config);

    // Clean up all objects in the bucket
    const list = await s3Client.send(
      new ListObjectsV2Command({ Bucket: TEST_BUCKET })
    );
    if (list.Contents) {
      await Promise.all(
        list.Contents.map((obj) =>
          s3Client.send(
            new DeleteObjectCommand({ Bucket: TEST_BUCKET, Key: obj.Key! })
          )
        )
      );
    }
  });

  describe("put and get", () => {
    it("stores and retrieves a file", async () => {
      const data = Buffer.from("hello s3");
      await storage.put("test/file.txt", data, "text/plain");
      const result = await storage.get("test/file.txt");
      expect(result.toString()).toBe("hello s3");
    });

    it("stores binary data", async () => {
      const data = Buffer.from([0x00, 0xff, 0x42, 0xde, 0xad]);
      await storage.put("binary.dat", data, "application/octet-stream");
      const result = await storage.get("binary.dat");
      expect(result).toEqual(data);
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
    it("returns true for existing objects", async () => {
      await storage.put("check.txt", Buffer.from("yes"));
      expect(await storage.exists("check.txt")).toBe(true);
    });

    it("returns false for missing objects", async () => {
      expect(await storage.exists("missing.txt")).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes an object", async () => {
      await storage.put("doomed.txt", Buffer.from("bye"));
      await storage.delete("doomed.txt");
      expect(await storage.exists("doomed.txt")).toBe(false);
    });
  });

  describe("deletePrefix", () => {
    it("removes all objects under a prefix", async () => {
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
    it("lists objects under a prefix", async () => {
      await storage.put("reports/r1/index.html", Buffer.from("html"));
      await storage.put("reports/r1/data.json", Buffer.from("json"));
      await storage.put("reports/r2/other.html", Buffer.from("other"));

      const files = await storage.list("reports/r1/");
      expect(files.sort()).toEqual([
        "reports/r1/data.json",
        "reports/r1/index.html",
      ]);
    });

    it("returns empty array for non-existent prefix", async () => {
      const files = await storage.list("nonexistent/");
      expect(files).toEqual([]);
    });
  });
});
