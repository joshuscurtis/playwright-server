import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Badge,
  Code,
  Paper,
  Group,
  Stack,
  Anchor,
} from "@mantine/core";
import { DashboardCharts } from "@/app/components/DashboardCharts";

export const dynamic = "force-dynamic";

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
      project: {
        id: r.project.id,
        name: r.project.name,
        slug: r.project.slug,
      },
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
    }));
  } catch (error) {
    console.error("Failed to load reports:", error);
    return [];
  }
}

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(passed: number, failed: number, flaky: number) {
  if (failed > 0)
    return (
      <Badge color="red" variant="light" size="sm">
        {failed} failed
      </Badge>
    );
  if (flaky > 0)
    return (
      <Badge color="yellow" variant="light" size="sm">
        {flaky} flaky
      </Badge>
    );
  return (
    <Badge color="teal" variant="light" size="sm">
      All passed
    </Badge>
  );
}

const th: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 11,
  color: "#868e96",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "2px solid #e9ecef",
  background: "white",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f3f5",
  verticalAlign: "middle",
};

export default async function DashboardPage() {
  const reports = await getReports();

  const total = reports.length;
  const latest = reports[0];
  const sumPassed = reports.reduce((s, r) => s + r.passed, 0);
  const sumFailed = reports.reduce((s, r) => s + r.failed, 0);
  const sumFlaky = reports.reduce((s, r) => s + r.flaky, 0);
  const avgPassRate =
    total > 0
      ? Math.round(
          (reports.reduce(
            (s, r) =>
              s + (r.totalTests > 0 ? (r.passed / r.totalTests) * 100 : 0),
            0
          ) /
            total) *
            10
        ) / 10
      : 0;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", backgroundColor: "#f8f9fa" }}>
      {/* Hero */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #087f5b 0%, #099268 50%, #0ca678 100%)",
          color: "white",
        }}
      >
        <Container size="xl" py="xl">
          <Title order={2} c="white" mb={4}>
            Dashboard
          </Title>
          <Text size="sm" style={{ opacity: 0.8 }}>
            {total} report{total !== 1 ? "s" : ""} across all projects
          </Text>

          {total > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              <HeroStat label="Reports" value={total} />
              <HeroStat label="Avg Pass Rate" value={`${avgPassRate}%`} />
              <HeroStat label="Total Passed" value={sumPassed} />
              <HeroStat label="Total Failed" value={sumFailed} />
              <HeroStat label="Total Flaky" value={sumFlaky} />
              {latest && (
                <HeroStat label="Latest Duration" value={fmt(latest.durationMs)} />
              )}
            </div>
          )}
        </Container>
      </div>

      <Container size="xl" py="lg">
        {reports.length === 0 ? (
          <Paper p="xl" ta="center" shadow="xs" radius="md">
            <Text size="lg" fw={600} mb="xs">
              No reports yet
            </Text>
            <Text c="dimmed" mb="lg">
              Upload your first Playwright report to get started.
            </Text>
            <Code block p="md" style={{ textAlign: "left" }}>
              {`curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.vercel.app"}/api/reports/upload \\
  -F "file=@playwright-report.zip" \\
  -F "projectName=my-project" \\
  -F "title=Nightly Run"`}
            </Code>
          </Paper>
        ) : (
          <>
            <DashboardCharts />

            <Paper
              shadow="xs"
              radius="md"
              style={{ overflow: "hidden", background: "white" }}
            >
              <div className="section-header">
                <Group justify="space-between" align="center">
                  <Text fw={600} size="sm">
                    Recent Reports
                  </Text>
                  <Text size="xs" c="dimmed">
                    {reports.length} total
                  </Text>
                </Group>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={th}>Report</th>
                      <th style={th}>Project</th>
                      <th style={th}>Status</th>
                      <th style={th}>Tests</th>
                      <th style={th}>Duration</th>
                      <th style={th}>Branch</th>
                      <th style={th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="hoverable">
                        <td style={td}>
                          <Anchor href={`/reports/${r.id}`} fw={600} size="sm">
                            {r.title}
                          </Anchor>
                        </td>
                        <td style={td}>
                          <Anchor
                            href={`/projects/${r.project.slug}`}
                            size="xs"
                            c="dimmed"
                          >
                            {r.project.name}
                          </Anchor>
                        </td>
                        <td style={td}>
                          {statusBadge(r.passed, r.failed, r.flaky)}
                        </td>
                        <td style={td}>
                          <Group gap={4} wrap="nowrap">
                            <Text span size="sm" c="teal" fw={600}>
                              {r.passed}
                            </Text>
                            {r.failed > 0 && (
                              <Text span size="sm" c="red" fw={600}>
                                /{r.failed}
                              </Text>
                            )}
                            {r.skipped > 0 && (
                              <Text span size="xs" c="dimmed">
                                /{r.skipped}s
                              </Text>
                            )}
                          </Group>
                        </td>
                        <td style={td}>
                          <Text size="sm" c="dimmed">{fmt(r.durationMs)}</Text>
                        </td>
                        <td style={td}>
                          {r.branch ? (
                            <Code style={{ fontSize: 11, padding: "2px 6px" }}>
                              {r.branch}
                            </Code>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                          <Text size="xs" c="dimmed">{fmtDate(r.createdAt)}</Text>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Paper>
          </>
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
