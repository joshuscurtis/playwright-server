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
  Anchor,
} from "@mantine/core";
import { DashboardCharts } from "@/app/components/DashboardCharts";
import { HeroStat } from "@/app/components/HeroStat";
import { formatDuration, formatDate } from "@/lib/format";
import { tableHeaderStyle as th, tableCellStyle as td, heroGradient } from "@/lib/theme";
import { mapReportToResponse } from "@/lib/api";
import type { ReportWithProject, DrizzleReportWithProject } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getReports(): Promise<ReportWithProject[]> {
  try {
    const db = getDb();
    const reports = await db.query.reports.findMany({
      with: { project: true },
      orderBy: [desc(schema.reports.createdAt)],
      limit: 50,
    });
    return (reports as DrizzleReportWithProject[]).map(mapReportToResponse);
  } catch (error) {
    console.error("Failed to load reports:", error);
    return [];
  }
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
      <div style={{ background: heroGradient, color: "white" }}>
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
                <HeroStat label="Latest Duration" value={formatDuration(latest.durationMs)} />
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
                          <Text size="sm" c="dimmed">{formatDuration(r.durationMs)}</Text>
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
                          <Text size="xs" c="dimmed">{formatDate(r.createdAt)}</Text>
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
