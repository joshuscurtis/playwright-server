import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

interface Report {
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
  url: string;
}

async function getReports(): Promise<Report[]> {
  try {
    const db = getDb();
    const reports = await db.query.reports.findMany({
      with: { project: true },
      orderBy: [desc(schema.reports.createdAt)],
      limit: 50,
    });
    return reports.map((r: any) => ({
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
      url: `/reports/${r.id}`,
    }));
  } catch (error) {
    console.error("Failed to load reports:", error);
    return [];
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ passed, failed, total }: { passed: number; failed: number; total: number }) {
  if (failed > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        {failed} failed
      </span>
    );
  }
  if (passed === total && total > 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        All passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
      {total} tests
    </span>
  );
}

export default async function DashboardPage() {
  const reports = await getReports();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Playwright Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Self-hosted test report dashboard
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {reports.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              No reports yet
            </h2>
            <p className="text-gray-500 mb-4">
              Upload your first Playwright report to get started.
            </p>
            <pre className="inline-block text-left bg-gray-900 text-green-400 p-4 rounded-lg text-sm">
{`// playwright.config.ts
reporter: [
  ['playwright-report-server-reporter', {
    serverUrl: '${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}',
    projectName: 'my-project'
  }]
]`}
            </pre>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {report.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/projects/${report.project.slug}`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        {report.project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        passed={report.passed}
                        failed={report.failed}
                        total={report.totalTests}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="text-green-600">{report.passed}</span>
                      {report.failed > 0 && (
                        <> / <span className="text-red-600">{report.failed}</span></>
                      )}
                      {report.skipped > 0 && (
                        <> / <span className="text-gray-400">{report.skipped} skip</span></>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(report.durationMs)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.branch && (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                          {report.branch}
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(report.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
