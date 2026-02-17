import { NextResponse } from "next/server";
import { CACHE, SECURITY_HEADERS } from "@/lib/constants";

/**
 * Return a standardised JSON error response.
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Return a standardised JSON success response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Build response headers for serving binary trace / file assets.
 * Includes CORS, caching, and security headers.
 */
export function assetHeaders(
  contentType: string,
  fileName?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": CACHE.IMMUTABLE,
    "Access-Control-Allow-Origin": "*",
    ...SECURITY_HEADERS,
  };
  if (fileName) {
    headers["Content-Disposition"] = `inline; filename="${fileName}"`;
  }
  return headers;
}

/**
 * Validate that a file path is safe (no traversal attacks).
 * Returns `true` if the path is safe.
 */
export function isSafePath(filePath: string): boolean {
  // Block path traversal via "..", absolute paths, and null bytes
  if (filePath.includes("..")) return false;
  if (filePath.startsWith("/")) return false;
  if (filePath.includes("\0")) return false;
  // Block backslash-based traversal on all platforms
  if (filePath.includes("\\")) return false;
  return true;
}

/**
 * Map a Drizzle report row (with project relation) to a clean API response.
 */
export function mapReportToResponse(r: {
  id: string;
  title: string;
  project: { id: string; name: string; slug: string };
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  branch: string | null;
  commitSha: string | null;
  ciProvider: string | null;
  createdAt: Date;
}) {
  return {
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
  };
}
