import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { apiError, assetHeaders } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  try {
    const { traceId } = await params;
    const db = getDb();
    const storage = getStorage();

    const trace = await db.query.traces.findFirst({
      where: eq(schema.traces.id, traceId),
    });

    if (!trace) {
      return apiError("Trace not found", 404);
    }

    const data = await storage.get(trace.storagePath);
    const fileName = trace.testName.split("/").pop() || "trace.zip";

    return new NextResponse(new Uint8Array(data), {
      headers: assetHeaders("application/zip", fileName),
    });
  } catch (error) {
    console.error("Serve trace error:", error);
    return apiError("Internal server error", 500);
  }
}
