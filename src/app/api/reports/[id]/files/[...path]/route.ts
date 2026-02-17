import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import mime from "mime-types";
import { apiError, isSafePath } from "@/lib/api";
import { CACHE, SECURITY_HEADERS } from "@/lib/constants";

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
      return apiError("Report not found", 404);
    }

    const filePath = pathSegments.join("/");

    if (!isSafePath(filePath)) {
      return apiError("Invalid path", 400);
    }

    const storageKey = `${report.storagePath}/${filePath}`;

    const exists = await storage.exists(storageKey);
    if (!exists) {
      return apiError("File not found", 404);
    }

    const data = await storage.get(storageKey);
    const contentType =
      mime.lookup(filePath) || "application/octet-stream";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": CACHE.IMMUTABLE,
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    console.error("Serve file error:", error);
    return apiError("Internal server error", 500);
  }
}
