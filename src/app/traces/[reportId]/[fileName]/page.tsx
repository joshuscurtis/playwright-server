/**
 * Trace viewer page — embeds the Playwright trace viewer.
 *
 * The trace viewer is loaded from Playwright's CDN and pointed
 * at our trace file API endpoint.
 */
export default async function TraceViewerPage({
  params,
}: {
  params: Promise<{ reportId: string; fileName: string }>;
}) {
  const { reportId, fileName } = await params;
  const traceUrl = `/api/traces/${reportId}/${fileName}`;

  // Use Playwright's hosted trace viewer with our trace URL
  const viewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(traceUrl)}`;

  return (
    <div className="h-screen w-screen">
      <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <a href="/" className="text-blue-400 hover:text-blue-300">
            &larr; Back
          </a>
          <span className="text-gray-400">|</span>
          <span>Trace: {decodeURIComponent(fileName)}</span>
        </div>
        <a
          href={viewerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-xs"
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
