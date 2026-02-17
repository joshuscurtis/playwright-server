import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Group,
  Badge,
  Code,
  Anchor,
  Breadcrumbs,
  Paper,
  Stack,
} from "@mantine/core";

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
  createdAt: Date;
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
        flaky: r.flaky,
        durationMs: r.durationMs,
        branch: r.branch,
        commitSha: r.commitSha,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error("Failed to load project reports:", error);
    return { reports: [], projectName: slug };
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

function statusBadge(r: Report) {
  if (r.failed > 0)
    return (
      <Badge color="red" variant="light" size="sm">
        {r.failed} failed
      </Badge>
    );
  if (r.flaky > 0)
    return (
      <Badge color="yellow" variant="light" size="sm">
        {r.flaky} flaky
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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { reports, projectName } = await getProjectReports(slug);

  const totalPassed = reports.reduce((s, r) => s + r.passed, 0);
  const totalFailed = reports.reduce((s, r) => s + r.failed, 0);
  const totalFlaky = reports.reduce((s, r) => s + r.flaky, 0);
  const avgPassRate =
    reports.length > 0
      ? Math.round(
          (reports.reduce(
            (s, r) =>
              s + (r.totalTests > 0 ? (r.passed / r.totalTests) * 100 : 0),
            0
          ) /
            reports.length) *
            10
        ) / 10
      : 0;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", backgroundColor: "#f8f9fa" }}>
      {/* Hero */}
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
            <Text size="sm" c="white">{projectName}</Text>
          </Breadcrumbs>

          <Title order={2} c="white" mb={4}>{projectName}</Title>
          <Text size="sm" style={{ opacity: 0.8 }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </Text>

          {reports.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              <HeroStat label="Reports" value={reports.length} />
              <HeroStat label="Avg Pass Rate" value={`${avgPassRate}%`} />
              <HeroStat label="Total Passed" value={totalPassed} />
              <HeroStat label="Total Failed" value={totalFailed} />
              <HeroStat label="Total Flaky" value={totalFlaky} />
            </div>
          )}
        </Container>
      </div>

      <Container size="xl" py="lg">
        {reports.length === 0 ? (
          <Paper p="xl" ta="center" shadow="xs" radius="md">
            <Text c="dimmed">No reports found for this project.</Text>
          </Paper>
        ) : (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
            <div className="section-header">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">Reports</Text>
                <Text size="xs" c="dimmed">{reports.length} total</Text>
              </Group>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>Report</th>
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
                      <td style={td}>{statusBadge(r)}</td>
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
