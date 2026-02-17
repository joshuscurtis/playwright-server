import { NextRequest } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { apiError, apiSuccess } from "@/lib/api";
import { API_DEFAULTS } from "@/lib/constants";
import type { DrizzleTestResultWithReport } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fullName = searchParams.get("fullName");
    const projectId = searchParams.get("projectId");

    if (!fullName || !projectId) {
      return apiError("fullName and projectId are required", 400);
    }

    const db = getDb();

    const history = await db.query.testResults.findMany({
      where: and(
        eq(schema.testResults.fullName, fullName),
        eq(schema.testResults.projectId, projectId)
      ),
      with: { report: true },
      orderBy: [desc(schema.testResults.createdAt)],
      limit: API_DEFAULTS.PAGE_LIMIT,
    });

    return apiSuccess(
      (history as DrizzleTestResultWithReport[]).map((h) => ({
        id: h.id,
        status: h.status,
        durationMs: h.durationMs,
        retries: h.retries,
        errorMessage: h.errorMessage,
        createdAt: h.createdAt,
        report: {
          id: h.report.id,
          title: h.report.title,
          branch: h.report.branch,
          commitSha: h.report.commitSha,
        },
      }))
    );
  } catch (error) {
    console.error("Failed to load test history:", error);
    return apiError("Internal server error", 500);
  }
}
