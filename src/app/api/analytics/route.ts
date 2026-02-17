import { NextRequest } from "next/server";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api";
import { API_DEFAULTS } from "@/lib/constants";
import type { DrizzleReportWithProject, DrizzleTestResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const db = getDb();

    const reportsQuery = projectId
      ? db.query.reports.findMany({
          where: eq(schema.reports.projectId, projectId),
          orderBy: [desc(schema.reports.createdAt)],
          limit: API_DEFAULTS.ANALYTICS_TREND_LIMIT,
        })
      : db.query.reports.findMany({
          orderBy: [desc(schema.reports.createdAt)],
          limit: API_DEFAULTS.ANALYTICS_TREND_LIMIT,
        });

    const reports = await reportsQuery;

    const trend = reports
      .map((r: typeof reports[number]) => ({
        reportId: r.id,
        title: r.title,
        date: r.createdAt,
        total: r.totalTests,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        flaky: r.flaky,
        passRate:
          r.totalTests > 0
            ? Math.round((r.passed / r.totalTests) * 100)
            : 0,
        durationMs: r.durationMs,
      }))
      .reverse();

    const slowestTests = await db.query.testResults.findMany({
      orderBy: [desc(schema.testResults.durationMs)],
      limit: API_DEFAULTS.ANALYTICS_SLOWEST_LIMIT,
    });

    const flakyTests = await db.query.testResults.findMany({
      where: eq(schema.testResults.status, "flaky"),
      orderBy: [desc(schema.testResults.createdAt)],
      limit: API_DEFAULTS.ANALYTICS_FLAKY_SCAN,
    });

    const flakyMap = new Map<string, { fullName: string; fileName: string | null; count: number; lastSeen: Date }>();
    for (const t of flakyTests as DrizzleTestResult[]) {
      const existing = flakyMap.get(t.fullName);
      if (existing) {
        existing.count++;
      } else {
        flakyMap.set(t.fullName, {
          fullName: t.fullName,
          fileName: t.fileName,
          count: 1,
          lastSeen: t.createdAt,
        });
      }
    }

    const failedTests = await db.query.testResults.findMany({
      where: eq(schema.testResults.status, "failed"),
      orderBy: [desc(schema.testResults.createdAt)],
      limit: API_DEFAULTS.ANALYTICS_FAILURE_SCAN,
    });

    const categoryMap = new Map<string, { category: string; count: number; tests: string[] }>();
    for (const t of failedTests as DrizzleTestResult[]) {
      const category = categorizeError(t.errorMessage);
      const existing = categoryMap.get(category);
      if (existing) {
        existing.count++;
        if (existing.tests.length < API_DEFAULTS.ANALYTICS_CATEGORY_SAMPLE) {
          existing.tests.push(t.name);
        }
      } else {
        categoryMap.set(category, { category, count: 1, tests: [t.name] });
      }
    }

    return apiSuccess({
      trend,
      slowestTests: (slowestTests as DrizzleTestResult[]).map((t) => ({
        name: t.name,
        fullName: t.fullName,
        fileName: t.fileName,
        durationMs: t.durationMs,
        status: t.status,
      })),
      flakyTests: Array.from(flakyMap.values()).sort(
        (a, b) => b.count - a.count
      ),
      failureCategories: Array.from(categoryMap.values()).sort(
        (a, b) => b.count - a.count
      ),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return apiError("Internal server error", 500);
  }
}

function categorizeError(errorMessage: string | null): string {
  if (!errorMessage) return "Unknown";
  const msg = errorMessage.toLowerCase();
  if (msg.includes("expect") && (msg.includes("tobe") || msg.includes("to be") || msg.includes("toequal") || msg.includes("to equal") || msg.includes("tohave") || msg.includes("to have")))
    return "Assertion Failure";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "Timeout";
  if (msg.includes("locator") || msg.includes("selector") || msg.includes("not found") || msg.includes("no element"))
    return "Element Not Found";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("econnrefused"))
    return "Network Error";
  if (msg.includes("navigation") || msg.includes("navigat"))
    return "Navigation Error";
  return "Other";
}
