import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

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
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  ciProvider: string | null;
  buildUrl: string | null;
  createdAt: Date;
  traces: { id: string; testName: string; testFile: string; sizeBytes: number }[];
}

async function getReport(id: string): Promise<ReportDetail | null> {
  try {
    const db = getDb();
    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
      with: { project: true, traces: true },
    });
    if (!report) return null;
    return {
      id: report.id,
      title: report.title,
      project: { id: report.project.id, name: report.project.name, slug: report.project.slug },
      totalTests: report.totalTests,
      passed: report.passed,
      failed: report.failed,
      skipped: report.skipped,
      flaky: report.flaky,
      durationMs: report.durationMs,
      branch: report.branch,
      commitSha: report.commitSha,
      commitMessage: report.commitMessage,
      ciProvider: report.ciProvider,
      buildUrl: report.buildUrl,
      createdAt: report.createdAt,
      traces: report.traces.map((t: any) => ({
        id: t.id,
        testName: t.testName,
        testFile: t.testFile,
        sizeBytes: t.sizeBytes,
      })),
    };
  } catch (error) {
    console.error("Failed to load report:", error);
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
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 mb-2 min-w-0">
            <Link href="/" className="hover:text-gray-700 flex-shrink-0">
              Dashboard
            </Link>
            <span>/</span>
            <Link
              href={`/projects/${report.project.slug}`}
              className="hover:text-gray-700 flex-shrink-0"
            >
              {report.project.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 truncate">{report.title}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{report.title}</h1>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
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

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-4">
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
            style={{ minHeight: "50vh", height: "70vh" }}
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
              {report.traces.map((trace) => {
                const displayName = trace.testName.split("/").pop() || trace.testName;
                return (
                <li key={trace.id} className="px-4 py-3 hover:bg-gray-50">
                  <Link
                    href={`/traces/${trace.id}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <div className="min-w-0">
                      <span className="text-blue-600 hover:text-blue-800 font-medium text-sm truncate block">
                        {displayName}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {trace.testFile}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {(trace.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </Link>
                </li>
                );
              })}
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
