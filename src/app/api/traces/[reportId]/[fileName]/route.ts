import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq, and } from "drizzle-orm";
import { apiError, assetHeaders } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string; fileName: string }> }
) {
  try {
    const { reportId, fileName } = await params;
    const db = getDb();
    const storage = getStorage();

    const trace = await db.query.traces.findFirst({
      where: and(
        eq(schema.traces.reportId, reportId),
        eq(schema.traces.testName, fileName)
      ),
    });

    if (!trace) {
      const report = await db.query.reports.findFirst({
        where: eq(schema.reports.id, reportId),
      });

      if (!report) {
        return apiError("Report not found", 404);
      }

      const storageKey = `${report.storagePath}/data/${fileName}`;
      const exists = await storage.exists(storageKey);

      if (!exists) {
        return apiError("Trace file not found", 404);
      }

      const data = await storage.get(storageKey);
      return new NextResponse(new Uint8Array(data), {
        headers: assetHeaders("application/zip", fileName),
      });
    }

    const data = await storage.get(trace.storagePath);

    return new NextResponse(new Uint8Array(data), {
      headers: assetHeaders("application/zip", fileName),
    });
  } catch (error) {
    console.error("Serve trace error:", error);
    return apiError("Internal server error", 500);
  }
}
