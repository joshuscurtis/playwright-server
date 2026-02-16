import Link from "next/link";

interface ReportDetail {
  id: string;
  title: string;
  project: { id: string; name: string; slug: string };
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  ciProvider?: string;
  buildUrl?: string;
  createdAt: string;
  traces: { id: string; testName: string; testFile: string; sizeBytes: number }[];
}

async function getReport(id: string): Promise<ReportDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/reports/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Report not found
          </h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <Link
              href={`/projects/${report.project.slug}`}
              className="hover:text-gray-700"
            >
              {report.project.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{report.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {report.branch && (
              <span>
                Branch:{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                  {report.branch}
                </code>
              </span>
            )}
            {report.commitSha && (
              <span>
                Commit:{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded">
                  {report.commitSha.slice(0, 8)}
                </code>
              </span>
            )}
            {report.ciProvider && <span>CI: {report.ciProvider}</span>}
            {report.buildUrl && (
              <a
                href={report.buildUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Build link &rarr;
              </a>
            )}
          </div>

          <div className="flex gap-6 mt-4">
            <StatBox label="Total" value={report.totalTests} />
            <StatBox label="Passed" value={report.passed} color="green" />
            <StatBox label="Failed" value={report.failed} color="red" />
            <StatBox label="Skipped" value={report.skipped} color="gray" />
            <StatBox label="Flaky" value={report.flaky} color="yellow" />
            <StatBox
              label="Duration"
              value={
                report.durationMs < 1000
                  ? `${report.durationMs}ms`
                  : `${(report.durationMs / 1000).toFixed(1)}s`
              }
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
            <h2 className="font-medium text-gray-900">HTML Report</h2>
          </div>
          <iframe
            src={`/api/reports/${report.id}/files/index.html`}
            className="w-full border-0"
            style={{ height: "70vh" }}
            title="Playwright HTML Report"
          />
        </div>

        {report.traces.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
              <h2 className="font-medium text-gray-900">
                Traces ({report.traces.length})
              </h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {report.traces.map((trace) => (
                <li key={trace.id} className="px-4 py-3 hover:bg-gray-50">
                  <Link
                    href={`/traces/${report.id}/${encodeURIComponent(trace.testName)}`}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <span className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        {trace.testName}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">
                        {trace.testFile}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs">
                      {(trace.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    gray: "text-gray-400",
  };

  return (
    <div className="text-center">
      <div
        className={`text-2xl font-bold ${color ? colorClasses[color] : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
