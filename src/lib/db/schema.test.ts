import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { projects, reports, traces } from "./schema";

describe("Database schema", () => {
  describe("projects table", () => {
    it("has all expected columns", () => {
      const cols = getTableColumns(projects);
      expect(cols).toHaveProperty("id");
      expect(cols).toHaveProperty("name");
      expect(cols).toHaveProperty("slug");
      expect(cols).toHaveProperty("createdAt");
      expect(cols).toHaveProperty("updatedAt");
    });

    it("has id as primary key", () => {
      const cols = getTableColumns(projects);
      expect(cols.id.primary).toBe(true);
    });

    it("marks name and slug as not null", () => {
      const cols = getTableColumns(projects);
      expect(cols.name.notNull).toBe(true);
      expect(cols.slug.notNull).toBe(true);
    });
  });

  describe("reports table", () => {
    it("has all expected columns", () => {
      const cols = getTableColumns(reports);
      expect(cols).toHaveProperty("id");
      expect(cols).toHaveProperty("projectId");
      expect(cols).toHaveProperty("title");
      expect(cols).toHaveProperty("storagePath");
      expect(cols).toHaveProperty("totalTests");
      expect(cols).toHaveProperty("passed");
      expect(cols).toHaveProperty("failed");
      expect(cols).toHaveProperty("skipped");
      expect(cols).toHaveProperty("flaky");
      expect(cols).toHaveProperty("durationMs");
      expect(cols).toHaveProperty("ciProvider");
      expect(cols).toHaveProperty("branch");
      expect(cols).toHaveProperty("commitSha");
      expect(cols).toHaveProperty("commitMessage");
      expect(cols).toHaveProperty("buildUrl");
      expect(cols).toHaveProperty("metadata");
      expect(cols).toHaveProperty("createdAt");
    });

    it("has id as primary key", () => {
      const cols = getTableColumns(reports);
      expect(cols.id.primary).toBe(true);
    });

    it("has required fields marked as not null", () => {
      const cols = getTableColumns(reports);
      expect(cols.projectId.notNull).toBe(true);
      expect(cols.title.notNull).toBe(true);
      expect(cols.storagePath.notNull).toBe(true);
      expect(cols.totalTests.notNull).toBe(true);
      expect(cols.passed.notNull).toBe(true);
      expect(cols.failed.notNull).toBe(true);
    });

    it("has optional CI fields", () => {
      const cols = getTableColumns(reports);
      expect(cols.ciProvider.notNull).toBe(false);
      expect(cols.branch.notNull).toBe(false);
      expect(cols.commitSha.notNull).toBe(false);
    });
  });

  describe("traces table", () => {
    it("has all expected columns", () => {
      const cols = getTableColumns(traces);
      expect(cols).toHaveProperty("id");
      expect(cols).toHaveProperty("reportId");
      expect(cols).toHaveProperty("testName");
      expect(cols).toHaveProperty("testFile");
      expect(cols).toHaveProperty("storagePath");
      expect(cols).toHaveProperty("sizeBytes");
      expect(cols).toHaveProperty("createdAt");
    });

    it("has id as primary key", () => {
      const cols = getTableColumns(traces);
      expect(cols.id.primary).toBe(true);
    });

    it("has required fields marked as not null", () => {
      const cols = getTableColumns(traces);
      expect(cols.reportId.notNull).toBe(true);
      expect(cols.testName.notNull).toBe(true);
      expect(cols.testFile.notNull).toBe(true);
      expect(cols.storagePath.notNull).toBe(true);
    });
  });
});
