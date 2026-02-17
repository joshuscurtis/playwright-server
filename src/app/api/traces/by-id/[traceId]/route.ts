import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";

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
      return NextResponse.json(
        { error: "Trace not found" },
        { status: 404 }
      );
    }

    const data = await storage.get(trace.storagePath);
    const fileName = trace.testName.split("/").pop() || "trace.zip";

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
