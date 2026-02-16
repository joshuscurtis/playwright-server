import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
      with: { project: true, traces: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      title: report.title,
      project: {
        id: report.project.id,
        name: report.project.name,
        slug: report.project.slug,
      },
      totalTests: report.totalTests,
      passed: report.passed,
      failed: report.failed,
      skipped: report.skipped,
      flaky: report.flaky,
      durationMs: report.durationMs,
      branch: report.branch,
      commitSha: report.commitSha,
      commitMessage: report.commitMessage,
      ciProvider: report.ciProvider,
      buildUrl: report.buildUrl,
      metadata: report.metadata,
      createdAt: report.createdAt,
      traces: report.traces.map((t) => ({
        id: t.id,
        testName: t.testName,
        testFile: t.testFile,
        sizeBytes: t.sizeBytes,
      })),
      url: `/reports/${report.id}`,
    });
  } catch (error) {
    console.error("Get report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const storage = getStorage();

    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Delete files from storage
    await storage.deletePrefix(report.storagePath);

    // Delete from database (cascade deletes traces)
    await db.delete(schema.reports).where(eq(schema.reports.id, id));

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Delete report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
