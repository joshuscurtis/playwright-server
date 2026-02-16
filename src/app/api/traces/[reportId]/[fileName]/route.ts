import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq, and } from "drizzle-orm";

/**
 * Serves trace zip files for the Playwright trace viewer.
 * The trace viewer fetches these files to display interactive traces.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string; fileName: string }> }
) {
  try {
    const { reportId, fileName } = await params;
    const db = getDb();
    const storage = getStorage();

    // Find the trace record
    const trace = await db.query.traces.findFirst({
      where: and(
        eq(schema.traces.reportId, reportId),
        eq(schema.traces.testName, fileName)
      ),
    });

    if (!trace) {
      // Try a broader search by looking for the trace file in the report's files
      const report = await db.query.reports.findFirst({
        where: eq(schema.reports.id, reportId),
      });

      if (!report) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      // Try to serve the file directly from the report storage
      const storageKey = `${report.storagePath}/data/${fileName}`;
      const exists = await storage.exists(storageKey);

      if (!exists) {
        return NextResponse.json(
          { error: "Trace file not found" },
          { status: 404 }
        );
      }

      const data = await storage.get(storageKey);
      return new NextResponse(new Uint8Array(data), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const data = await storage.get(trace.storagePath);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Serve trace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
