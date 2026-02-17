import { getDb, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Paper,
  Breadcrumbs,
  Anchor,
  Badge,
  Code,
  Group,
  Stack,
} from "@mantine/core";
import { TestHistoryCharts } from "@/app/components/TestHistoryCharts";

export const dynamic = "force-dynamic";

interface HistoryEntry {
  id: string;
  status: string;
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  createdAt: string;
  report: {
    id: string;
    title: string;
    branch: string | null;
    commitSha: string | null;
  };
}

async function getTestHistory(
  fullName: string,
  projectId: string
): Promise<HistoryEntry[]> {
  try {
    const db = getDb();
    const results = await db.query.testResults.findMany({
      where: and(
        eq(schema.testResults.fullName, fullName),
        eq(schema.testResults.projectId, projectId)
      ),
      with: { report: true },
      orderBy: [desc(schema.testResults.createdAt)],
      limit: 50,
    });
    return results.map((r: any) => ({
      id: r.id,
      status: r.status,
      durationMs: r.durationMs,
      retries: r.retries,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
      report: {
        id: r.report.id,
        title: r.report.title,
        branch: r.report.branch,
        commitSha: r.report.commitSha,
      },
    }));
  } catch (error) {
    console.error("Failed to load test history:", error);
    return [];
  }
}

const statusColors: Record<string, string> = {
  passed: "teal",
  failed: "red",
  skipped: "gray",
  flaky: "yellow",
};

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
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

export default async function TestHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ fullName?: string; projectId?: string }>;
}) {
  const { fullName, projectId } = await searchParams;

  if (!fullName || !projectId) {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Title order={2} mb="xs">Missing parameters</Title>
          <Text c="dimmed">fullName and projectId are required</Text>
          <Anchor href="/" mt="md">&larr; Back to dashboard</Anchor>
        </div>
      </div>
    );
  }

  const history = await getTestHistory(fullName, projectId);
  const testName = fullName.split(" > ").pop() || fullName;

  const totalRuns = history.length;
  const passCount = history.filter((h) => h.status === "passed").length;
  const flakyCount = history.filter((h) => h.status === "flaky").length;
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;
  const avgDuration =
    totalRuns > 0
      ? Math.round(history.reduce((s, h) => s + h.durationMs, 0) / totalRuns)
      : 0;
  const flakinessScore =
    totalRuns > 0 ? Math.round((flakyCount / totalRuns) * 100) : 0;

  const chartData = history
    .map((h) => ({
      date: new Date(h.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      durationMs: h.durationMs,
      status: h.status,
      reportTitle: h.report.title,
    }))
    .reverse();

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
            <Text size="sm" c="white">Test History</Text>
          </Breadcrumbs>

          <Title order={2} c="white" mb={4}>{testName}</Title>
          <Text size="sm" style={{ opacity: 0.7 }}>{fullName}</Text>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            <HeroStat label="Total Runs" value={totalRuns} />
            <HeroStat label="Pass Rate" value={`${passRate}%`} />
            <HeroStat label="Flakiness" value={`${flakinessScore}%`} />
            <HeroStat label="Avg Duration" value={fmt(avgDuration)} />
          </div>
        </Container>
      </div>

      <Container size="xl" py="lg">
        {chartData.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <TestHistoryCharts data={chartData} />
          </div>
        )}

        <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
          <div className="section-header">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">Run History</Text>
              <Text size="xs" c="dimmed">{history.length} runs</Text>
            </Group>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Text c="dimmed">No history found</Text>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>Status</th>
                    <th style={th}>Report</th>
                    <th style={th}>Branch</th>
                    <th style={th}>Duration</th>
                    <th style={th}>Retries</th>
                    <th style={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="hoverable">
                      <td style={td}>
                        <Badge
                          color={statusColors[h.status] || "gray"}
                          variant="light"
                          size="sm"
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td style={td}>
                        <Anchor href={`/reports/${h.report.id}`} size="sm" fw={500}>
                          {h.report.title}
                        </Anchor>
                      </td>
                      <td style={td}>
                        {h.report.branch ? (
                          <Code style={{ fontSize: 11, padding: "2px 6px" }}>{h.report.branch}</Code>
                        ) : (
                          <Text size="xs" c="dimmed">-</Text>
                        )}
                      </td>
                      <td style={td}>
                        <Text size="sm" ff="monospace" c="dimmed">{fmt(h.durationMs)}</Text>
                      </td>
                      <td style={td}>
                        {h.retries > 0 ? (
                          <Badge color="orange" variant="light" size="sm">
                            {h.retries}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">0</Text>
                        )}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <Text size="xs" c="dimmed">
                          {new Date(h.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Paper>
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
