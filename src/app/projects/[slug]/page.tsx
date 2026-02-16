import Link from "next/link";

interface Report {
  id: string;
  title: string;
  project: { id: string; name: string; slug: string };
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  branch?: string;
  commitSha?: string;
  createdAt: string;
  url: string;
}

async function getProjectReports(slug: string): Promise<{ reports: Report[]; projectName: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/reports?project=${slug}&limit=100`, {
      cache: "no-store",
    });
    if (!res.ok) return { reports: [], projectName: slug };
    const data = await res.json();
    const reports = data.reports || [];
    const projectName = reports[0]?.project?.name || slug;
    return { reports, projectName };
  } catch {
    return { reports: [], projectName: slug };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { reports, projectName } = await getProjectReports(slug);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900">{projectName}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{projectName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {reports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No reports found for this project.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {report.title}
                    </h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      {report.branch && (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                          {report.branch}
                        </code>
                      )}
                      {report.commitSha && (
                        <code className="text-xs">
                          {report.commitSha.slice(0, 8)}
                        </code>
                      )}
                      <span>
                        {new Date(report.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-medium">
                      {report.passed} passed
                    </span>
                    {report.failed > 0 && (
                      <span className="text-red-600 font-medium">
                        {report.failed} failed
                      </span>
                    )}
                    <span className="text-gray-400">
                      {formatDuration(report.durationMs)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
