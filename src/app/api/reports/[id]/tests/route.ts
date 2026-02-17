import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const testResults = await db.query.testResults.findMany({
      where: eq(schema.testResults.reportId, id),
    });

    return NextResponse.json(testResults);
  } catch (error) {
    console.error("Failed to load test results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
