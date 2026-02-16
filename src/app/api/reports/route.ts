import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { desc, eq, and, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;

    const projectSlug = searchParams.get("project");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [];

    if (projectSlug) {
      // Find project by slug first
      const project = await db.query.projects.findFirst({
        where: eq(schema.projects.slug, projectSlug),
      });
      if (project) {
        conditions.push(eq(schema.reports.projectId, project.id));
      } else {
        return NextResponse.json({ reports: [], total: 0 });
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

    return NextResponse.json({
      reports: reports.map((r: any) => ({
        id: r.id,
        title: r.title,
        project: { id: r.project.id, name: r.project.name, slug: r.project.slug },
        totalTests: r.totalTests,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        flaky: r.flaky,
        durationMs: r.durationMs,
        branch: r.branch,
        commitSha: r.commitSha,
        ciProvider: r.ciProvider,
        createdAt: r.createdAt,
        url: `/reports/${r.id}`,
      })),
    });
  } catch (error) {
    console.error("List reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
