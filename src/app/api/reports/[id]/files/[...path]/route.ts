import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import mime from "mime-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path: pathSegments } = await params;
    const db = getDb();
    const storage = getStorage();

    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const filePath = pathSegments.join("/");

    // Prevent path traversal
    if (filePath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const storageKey = `${report.storagePath}/${filePath}`;

    const exists = await storage.exists(storageKey);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const data = await storage.get(storageKey);
    const contentType =
      mime.lookup(filePath) || "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Serve file error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
