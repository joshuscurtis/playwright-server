import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { ingestReport } from "@/lib/reports/ingest";
import { generateId } from "@/lib/id";
import { eq } from "drizzle-orm";

const uploadSchema = z.object({
  projectName: z.string().min(1),
  title: z.string().optional(),
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  commitMessage: z.string().optional(),
  ciProvider: z.string().optional(),
  buildUrl: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract the zip file
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing required 'file' field (zip file)" },
        { status: 400 }
      );
    }

    // Parse metadata fields
    const rawMeta: Record<string, unknown> = {};
    for (const key of uploadSchema.keyof().options) {
      const val = formData.get(key);
      if (val !== null) {
        if (key === "metadata") {
          try {
            rawMeta[key] = JSON.parse(val as string);
          } catch {
            rawMeta[key] = {};
          }
        } else {
          rawMeta[key] = val;
        }
      }
    }

    const parsed = uploadSchema.safeParse(rawMeta);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid metadata", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const meta = parsed.data;
    const db = getDb();
    const storage = getStorage();

    // Ensure project exists (upsert by slug)
    const slug = meta.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    let project = await db.query.projects.findFirst({
      where: eq(schema.projects.slug, slug),
    });

    if (!project) {
      const projectId = generateId("prj");
      const [newProject] = await db
        .insert(schema.projects)
        .values({
          id: projectId,
          name: meta.projectName,
          slug,
        })
        .returning();
      project = newProject;
    }

    // Ingest the report zip
    const zipBuffer = Buffer.from(await file.arrayBuffer());
    const ingestResult = await ingestReport(zipBuffer, project.id, storage);

    const title =
      meta.title ||
      `Report ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

    // Insert report record
    await db.insert(schema.reports).values({
      id: ingestResult.reportId,
      projectId: project.id,
      title,
      storagePath: ingestResult.storagePath,
      totalTests: ingestResult.resultSummary?.totalTests ?? 0,
      passed: ingestResult.resultSummary?.passed ?? 0,
      failed: ingestResult.resultSummary?.failed ?? 0,
      skipped: ingestResult.resultSummary?.skipped ?? 0,
      flaky: ingestResult.resultSummary?.flaky ?? 0,
      durationMs: ingestResult.resultSummary?.durationMs ?? 0,
      ciProvider: meta.ciProvider,
      branch: meta.branch,
      commitSha: meta.commitSha,
      commitMessage: meta.commitMessage,
      buildUrl: meta.buildUrl,
      metadata: meta.metadata,
    });

    // Insert trace records
    for (const trace of ingestResult.traces) {
      await db.insert(schema.traces).values({
        id: generateId("trc"),
        reportId: ingestResult.reportId,
        testName: trace.fileName,
        testFile: trace.fileName,
        storagePath: trace.storagePath,
        sizeBytes: trace.sizeBytes,
      });
    }

    return NextResponse.json({
      id: ingestResult.reportId,
      projectId: project.id,
      projectSlug: project.slug,
      title,
      url: `/reports/${ingestResult.reportId}`,
      totalFiles: ingestResult.files.length,
      traces: ingestResult.traces.length,
      summary: ingestResult.resultSummary,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
