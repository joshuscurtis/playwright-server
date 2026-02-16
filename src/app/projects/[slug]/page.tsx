import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

interface Report {
  id: string;
  title: string;
  project: { id: string; name: string; slug: string };
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  branch: string | null;
  commitSha: string | null;
  createdAt: Date;
  url: string;
}

async function getProjectReports(slug: string): Promise<{ reports: Report[]; projectName: string }> {
  try {
    const db = getDb();
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.slug, slug),
    });
    if (!project) return { reports: [], projectName: slug };

    const reports = await db.query.reports.findMany({
      where: eq(schema.reports.projectId, project.id),
      with: { project: true },
      orderBy: [desc(schema.reports.createdAt)],
      limit: 100,
    });

    return {
      projectName: project.name,
      reports: reports.map((r: any) => ({
        id: r.id,
        title: r.title,
        project: { id: r.project.id, name: r.project.name, slug: r.project.slug },
        totalTests: r.totalTests,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        durationMs: r.durationMs,
        branch: r.branch,
        commitSha: r.commitSha,
        createdAt: r.createdAt,
        url: `/reports/${r.id}`,
      })),
    };
  } catch (error) {
    console.error("Failed to load project reports:", error);
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
