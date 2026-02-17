import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const db = getDb();

    // Get recent reports for trend data
    const reportsQuery = projectId
      ? db.query.reports.findMany({
          where: eq(schema.reports.projectId, projectId),
          orderBy: [desc(schema.reports.createdAt)],
          limit: 20,
        })
      : db.query.reports.findMany({
          orderBy: [desc(schema.reports.createdAt)],
          limit: 20,
        });

    const reports = await reportsQuery;

    // Trend data (pass rate over time) - reversed to show oldest first
    const trend = reports
      .map((r: any) => ({
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

    // Get slowest tests from recent reports
    const slowestTests = await db.query.testResults.findMany({
      orderBy: [desc(schema.testResults.durationMs)],
      limit: 10,
    });

    // Get flaky tests (tests with status "flaky" in recent runs)
    const flakyTests = await db.query.testResults.findMany({
      where: eq(schema.testResults.status, "flaky"),
      orderBy: [desc(schema.testResults.createdAt)],
      limit: 20,
    });

    // Deduplicate flaky tests by fullName, counting occurrences
    const flakyMap = new Map<string, { fullName: string; fileName: string | null; count: number; lastSeen: Date }>();
    for (const t of flakyTests as any[]) {
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

    // Get failure categories
    const failedTests = await db.query.testResults.findMany({
      where: eq(schema.testResults.status, "failed"),
      orderBy: [desc(schema.testResults.createdAt)],
      limit: 50,
    });

    const categoryMap = new Map<string, { category: string; count: number; tests: string[] }>();
    for (const t of failedTests as any[]) {
      const category = categorizeError(t.errorMessage);
      const existing = categoryMap.get(category);
      if (existing) {
        existing.count++;
        if (existing.tests.length < 3) existing.tests.push(t.name);
      } else {
        categoryMap.set(category, { category, count: 1, tests: [t.name] });
      }
    }

    return NextResponse.json({
      trend,
      slowestTests: (slowestTests as any[]).map((t) => ({
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
