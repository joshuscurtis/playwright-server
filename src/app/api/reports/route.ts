import { NextRequest } from "next/server";
import { getDb, schema } from "@/lib/db";
import { desc, eq, and, ilike } from "drizzle-orm";
import { apiError, apiSuccess, mapReportToResponse } from "@/lib/api";
import { API_DEFAULTS } from "@/lib/constants";
import type { DrizzleReportWithProject } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;

    const projectSlug = searchParams.get("project");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(API_DEFAULTS.PAGE_LIMIT)),
      API_DEFAULTS.PAGE_MAX
    );
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [];

    if (projectSlug) {
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.slug, projectSlug),
      });
      if (project) {
        conditions.push(eq(schema.reports.projectId, project.id));
      } else {
        return apiSuccess({ reports: [], total: 0 });
      }
    }

    if (branch) {
      conditions.push(eq(schema.reports.branch, branch));
    }

    if (search) {
      conditions.push(ilike(schema.reports.title, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const reports = await db.query.reports.findMany({
      where,
      with: { project: true },
      orderBy: [desc(schema.reports.createdAt)],
      limit,
      offset,
    });

    return apiSuccess({
      reports: (reports as DrizzleReportWithProject[]).map((r) => ({
        ...mapReportToResponse(r),
        url: `/reports/${r.id}`,
      })),
    });
  } catch (error) {
    console.error("List reports error:", error);
    return apiError("Internal server error", 500);
  }
}
