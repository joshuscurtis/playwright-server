import { headers } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

async function getTrace(traceId: string) {
  try {
    const db = getDb();
    return await db.query.traces.findFirst({
      where: eq(schema.traces.id, traceId),
      with: { report: { with: { project: true } } },
    });
  } catch {
    return null;
  }
}

export default async function TraceViewerPage({
  params,
}: {
  params: Promise<{ traceId: string }>;
}) {
  const { traceId } = await params;
  const trace = await getTrace(traceId);

  const hdrs = await headers();
  const host = hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  const traceApiUrl = `${baseUrl}/api/traces/by-id/${traceId}`;
  const viewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(traceApiUrl)}`;

  const displayName = trace
    ? trace.testName.split("/").pop() || trace.testName
    : traceId;

  return (
    <div className="h-screen w-screen">
      <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          {trace?.report ? (
            <a
              href={`/reports/${trace.report.id}`}
              className="text-blue-400 hover:text-blue-300"
            >
              &larr; Back to report
            </a>
          ) : (
            <a href="/" className="text-blue-400 hover:text-blue-300">
              &larr; Back
            </a>
          )}
          <span className="text-gray-400">|</span>
          <span className="truncate">{displayName}</span>
        </div>
        <a
          href={viewerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs flex-shrink-0 ml-4"
        >
          Open in Playwright Trace Viewer &rarr;
        </a>
      </div>
      <iframe
        src={viewerUrl}
        className="w-full"
        style={{ height: "calc(100vh - 40px)" }}
        title="Playwright Trace Viewer"
      />
    </div>
  );
}
