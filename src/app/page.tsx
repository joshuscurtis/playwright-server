import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Table,
  Badge,
  Code,
  Paper,
  Group,
  Stack,
  Anchor,
  Card,
} from "@mantine/core";

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

function statusBadge(passed: number, failed: number, total: number) {
  if (failed > 0) {
    return <Badge color="red" variant="light" size="sm">{failed} failed</Badge>;
  }
  if (passed === total && total > 0) {
    return <Badge color="green" variant="light" size="sm">All passed</Badge>;
  }
  return <Badge color="gray" variant="light" size="sm">{total} tests</Badge>;
}

export default async function DashboardPage() {
  const reports = await getReports();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--mantine-color-gray-0)" }}>
      <Paper shadow="0" radius={0} style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
        <Container size="xl" py="md">
          <Title order={2}>Playwright Reports</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Self-hosted test report dashboard
          </Text>
        </Container>
      </Paper>

      <Container size="xl" py="lg">
        {reports.length === 0 ? (
          <Paper p="xl" ta="center">
            <Title order={3} mb="xs">No reports yet</Title>
            <Text c="dimmed" mb="md">
              Upload your first Playwright report to get started.
            </Text>
            <Code block p="md">
{`// playwright.config.ts
reporter: [
  ['playwright-report-server-reporter', {
    serverUrl: '${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}',
    projectName: 'my-project'
  }]
]`}
            </Code>
          </Paper>
        ) : (
          <>
            {/* Desktop table */}
            <Paper shadow="xs" radius="md" visibleFrom="md" style={{ overflow: "hidden" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Report</Table.Th>
                    <Table.Th>Project</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Tests</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Branch</Table.Th>
                    <Table.Th>Date</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reports.map((report) => (
                    <Table.Tr key={report.id}>
                      <Table.Td>
                        <Anchor href={`/reports/${report.id}`} fw={500} size="sm">
                          {report.title}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Anchor href={`/projects/${report.project.slug}`} c="dimmed" size="sm">
                          {report.project.name}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        {statusBadge(report.passed, report.failed, report.totalTests)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          <Text span c="green" fw={500}>{report.passed}</Text>
                          {report.failed > 0 && (
                            <Text span c="red" fw={500}> / {report.failed}</Text>
                          )}
                          {report.skipped > 0 && (
                            <Text span c="dimmed"> / {report.skipped} skip</Text>
                          )}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{formatDuration(report.durationMs)}</Text>
                      </Table.Td>
                      <Table.Td>
                        {report.branch && <Code>{report.branch}</Code>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">{formatDate(report.createdAt)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Mobile card list */}
            <Stack gap="sm" hiddenFrom="md">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card shadow="xs" radius="md" padding="md">
                    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" fw={500} c="blue" truncate>
                          {report.title}
                        </Text>
                        <Text size="xs" c="dimmed" mt={2}>
                          {report.project.name}
                        </Text>
                      </div>
                      {statusBadge(report.passed, report.failed, report.totalTests)}
                    </Group>
                    <Group gap="md" mt="sm">
                      <Text size="xs" c="dimmed">
                        <Text span c="green" fw={500}>{report.passed}</Text>
                        {report.failed > 0 && (
                          <Text span c="red" fw={500}> / {report.failed} fail</Text>
                        )}
                        {report.skipped > 0 && (
                          <Text span c="dimmed"> / {report.skipped} skip</Text>
                        )}
                      </Text>
                      <Text size="xs" c="dimmed">{formatDuration(report.durationMs)}</Text>
                      {report.branch && <Code style={{ fontSize: "var(--mantine-font-size-xs)" }}>{report.branch}</Code>}
                      <Text size="xs" c="dimmed" ml="auto">{formatDate(report.createdAt)}</Text>
                    </Group>
                  </Card>
                </Link>
              ))}
            </Stack>
          </>
        )}
      </Container>
    </div>
  );
}
