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
  passed: "green",
  failed: "red",
  skipped: "gray",
  flaky: "yellow",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default async function TestHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ fullName?: string; projectId?: string }>;
}) {
  const { fullName, projectId } = await searchParams;

  if (!fullName || !projectId) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

  // Calculate stats
  const totalRuns = history.length;
  const passCount = history.filter((h) => h.status === "passed").length;
  const failCount = history.filter((h) => h.status === "failed").length;
  const flakyCount = history.filter((h) => h.status === "flaky").length;
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0;
  const avgDuration =
    totalRuns > 0
      ? Math.round(history.reduce((s, h) => s + h.durationMs, 0) / totalRuns)
      : 0;
  const flakinessScore =
    totalRuns > 0 ? Math.round((flakyCount / totalRuns) * 100) : 0;

  const breadcrumbItems = [
    <Anchor href="/" key="dash" size="sm">Dashboard</Anchor>,
    <Text size="sm" key="title" truncate>Test History</Text>,
  ];

  // Data for charts (reversed for chronological order)
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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--mantine-color-gray-0)" }}>
      <Paper shadow="0" radius={0} style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
        <Container size="xl" py="md">
          <Breadcrumbs mb="xs">{breadcrumbItems}</Breadcrumbs>
          <Title order={2}>{testName}</Title>
          <Text size="sm" c="dimmed" mt={4}>{fullName}</Text>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "var(--mantine-spacing-md)",
              marginTop: "var(--mantine-spacing-md)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <Text size="xl" fw={700}>{totalRuns}</Text>
              <Text size="xs" c="dimmed">Total Runs</Text>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text size="xl" fw={700} c="green">{passRate}%</Text>
              <Text size="xs" c="dimmed">Pass Rate</Text>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text size="xl" fw={700} c="yellow">{flakinessScore}%</Text>
              <Text size="xs" c="dimmed">Flakiness</Text>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text size="xl" fw={700}>{formatDuration(avgDuration)}</Text>
              <Text size="xs" c="dimmed">Avg Duration</Text>
            </div>
          </div>
        </Container>
      </Paper>

      <Container size="xl" py="lg">
        {/* Duration & Status Charts */}
        {chartData.length > 1 && (
          <div style={{ marginBottom: "var(--mantine-spacing-lg)" }}>
            <TestHistoryCharts data={chartData} />
          </div>
        )}

        {/* History Table */}
        <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "var(--mantine-spacing-md)",
              borderBottom: "1px solid var(--mantine-color-gray-3)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Text fw={500}>Run History</Text>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: "var(--mantine-spacing-xl)", textAlign: "center" }}>
              <Text c="dimmed">No history found</Text>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "var(--mantine-font-size-sm)",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Report</th>
                  <th style={thStyle}>Branch</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Retries</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={tdStyle}>
                      <Badge
                        color={statusColors[h.status] || "gray"}
                        variant="light"
                        size="sm"
                      >
                        {h.status}
                      </Badge>
                    </td>
                    <td style={tdStyle}>
                      <Anchor href={`/reports/${h.report.id}`} size="sm">
                        {h.report.title}
                      </Anchor>
                    </td>
                    <td style={tdStyle}>
                      {h.report.branch ? (
                        <Code>{h.report.branch}</Code>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <Text size="sm">{formatDuration(h.durationMs)}</Text>
                    </td>
                    <td style={tdStyle}>
                      {h.retries > 0 ? (
                        <Badge color="orange" variant="light" size="sm">
                          {h.retries}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">0</Text>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <Text size="sm" c="dimmed">
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
          )}
        </Paper>
      </Container>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "var(--mantine-spacing-xs) var(--mantine-spacing-md)",
  textAlign: "left",
  fontWeight: 500,
  fontSize: "var(--mantine-font-size-xs)",
  color: "var(--mantine-color-dimmed)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid var(--mantine-color-gray-3)",
  backgroundColor: "var(--mantine-color-gray-0)",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
  borderBottom: "1px solid var(--mantine-color-gray-2)",
};
