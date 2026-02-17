import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { eq } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Paper,
  Breadcrumbs,
  Anchor,
  Code,
  Group,
  Stack,
  Badge,
} from "@mantine/core";
import { TestResultsTable } from "@/app/components/TestResultsTable";

interface ReportDetail {
  id: string;
  title: string;
  project: { id: string; name: string; slug: string };
  storagePath: string;
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
  testResults: {
    id: string;
    name: string;
    fullName: string;
    suiteName: string | null;
    fileName: string | null;
    status: string;
    durationMs: number;
    retries: number;
    errorMessage: string | null;
    errorStack: string | null;
    tags: string[] | null;
    projectId: string;
  }[];
}

async function getReport(id: string): Promise<ReportDetail | null> {
  try {
    const db = getDb();
    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
      with: { project: true, traces: true, testResults: true },
    });
    if (!report) return null;
    return {
      id: report.id,
      title: report.title,
      project: { id: report.project.id, name: report.project.name, slug: report.project.slug },
      storagePath: report.storagePath,
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
      testResults: (report.testResults || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        fullName: t.fullName,
        suiteName: t.suiteName,
        fileName: t.fileName,
        status: t.status,
        durationMs: t.durationMs,
        retries: t.retries,
        errorMessage: t.errorMessage,
        errorStack: t.errorStack,
        tags: t.tags,
        projectId: t.projectId,
      })),
    };
  } catch (error) {
    console.error("Failed to load report:", error);
    return null;
  }
}

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);

  // Check if the HTML report is a real Playwright HTML report (has JS/CSS assets)
  let hasRichHtmlReport = false;
  if (report) {
    try {
      const storage = getStorage();
      const files = await storage.list(report.storagePath);
      // Real Playwright HTML reports have JS bundles, CSS, app/ directory, etc.
      // Minimal/synthetic reports only have index.html + report.json
      hasRichHtmlReport = files.some(
        (f) => f.endsWith(".js") || f.endsWith(".css") || f.includes("/app/")
      );
    } catch {
      // If storage check fails, don't show iframe
    }
  }

  if (!report) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Title order={2} mb="xs">Report not found</Title>
          <Anchor href="/">&larr; Back to dashboard</Anchor>
        </div>
      </div>
    );
  }

  const passRate = report.totalTests > 0
    ? Math.round((report.passed / report.totalTests) * 100)
    : 0;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", backgroundColor: "#f8f9fa" }}>
      {/* Hero Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #087f5b 0%, #099268 50%, #0ca678 100%)",
          color: "white",
        }}
      >
        <Container size="xl" py="xl">
          <Breadcrumbs
            mb="sm"
            separatorMargin={6}
            styles={{ separator: { color: "rgba(255,255,255,0.5)" } }}
          >
            <Anchor href="/" size="sm" c="white" style={{ opacity: 0.8 }}>Dashboard</Anchor>
            <Anchor href={`/projects/${report.project.slug}`} size="sm" c="white" style={{ opacity: 0.8 }}>
              {report.project.name}
            </Anchor>
            <Text size="sm" c="white">{report.title}</Text>
          </Breadcrumbs>

          <Title order={2} c="white" mb={4}>{report.title}</Title>

          <Group gap="md" mt={4}>
            {report.branch && (
              <Text size="sm" style={{ opacity: 0.8 }}>
                Branch: <Code style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11 }}>{report.branch}</Code>
              </Text>
            )}
            {report.commitSha && (
              <Text size="sm" style={{ opacity: 0.8 }}>
                Commit: <Code style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11 }}>{report.commitSha.slice(0, 8)}</Code>
              </Text>
            )}
            {report.ciProvider && (
              <Text size="sm" style={{ opacity: 0.8 }}>CI: {report.ciProvider}</Text>
            )}
            {report.buildUrl && (
              <Anchor href={report.buildUrl} target="_blank" rel="noopener noreferrer" size="sm" c="white" style={{ opacity: 0.8 }}>
                Build link &rarr;
              </Anchor>
            )}
          </Group>

          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            <HeroStat label="Total" value={report.totalTests} />
            <HeroStat label="Pass Rate" value={`${passRate}%`} />
            <HeroStat label="Passed" value={report.passed} />
            <HeroStat label="Failed" value={report.failed} />
            <HeroStat label="Skipped" value={report.skipped} />
            <HeroStat label="Flaky" value={report.flaky} />
            <HeroStat label="Duration" value={fmt(report.durationMs)} />
          </div>
        </Container>
      </div>

      <Container size="xl" py="lg">
        {/* Test Results Table */}
        {report.testResults.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <TestResultsTable
              testResults={report.testResults}
              projectId={report.project.id}
            />
          </div>
        )}

        {/* HTML Report - only show when a real Playwright HTML report was uploaded */}
        {hasRichHtmlReport && (
          <Paper shadow="xs" radius="md" mb="lg" style={{ overflow: "hidden", background: "white" }}>
            <div className="section-header">
              <Text fw={600} size="sm">HTML Report</Text>
            </div>
            <iframe
              src={`/api/reports/${report.id}/files/index.html`}
              style={{ width: "100%", border: "none", minHeight: "50vh", height: "70vh" }}
              title="Playwright HTML Report"
            />
          </Paper>
        )}

        {/* Traces */}
        {report.traces.length > 0 && (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
            <div className="section-header">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">Traces</Text>
                <Text size="xs" c="dimmed">{report.traces.length} total</Text>
              </Group>
            </div>
            <Stack gap={0}>
              {report.traces.map((trace) => {
                const displayName = trace.testName.split("/").pop() || trace.testName;
                return (
                  <Link
                    key={trace.id}
                    href={`/traces/${trace.id}`}
                    className="list-item-hover"
                    style={{
                      textDecoration: "none",
                      display: "block",
                      padding: "10px 16px",
                      borderBottom: "1px solid #f1f3f5",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} c="teal">
                          {displayName}
                        </Text>
                        <Text size="xs" c="dimmed">{trace.testFile}</Text>
                      </div>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {(trace.sizeBytes / 1024).toFixed(0)} KB
                      </Text>
                    </Group>
                  </Link>
                );
              })}
            </Stack>
          </Paper>
        )}
      </Container>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "14px 16px",
        textAlign: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <Text size="xl" fw={800} c="white" lh={1.1}>
        {value}
      </Text>
      <Text size="xs" c="white" style={{ opacity: 0.7 }} mt={4}>
        {label}
      </Text>
    </div>
  );
}
