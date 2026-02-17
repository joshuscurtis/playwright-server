import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Paper,
  SimpleGrid,
  Breadcrumbs,
  Anchor,
  Code,
  Group,
  Stack,
  Badge,
} from "@mantine/core";

interface ReportDetail {
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
  commitMessage: string | null;
  ciProvider: string | null;
  buildUrl: string | null;
  createdAt: Date;
  traces: { id: string; testName: string; testFile: string; sizeBytes: number }[];
}

async function getReport(id: string): Promise<ReportDetail | null> {
  try {
    const db = getDb();
    const report = await db.query.reports.findFirst({
      where: eq(schema.reports.id, id),
      with: { project: true, traces: true },
    });
    if (!report) return null;
    return {
      id: report.id,
      title: report.title,
      project: { id: report.project.id, name: report.project.name, slug: report.project.slug },
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
    };
  } catch (error) {
    console.error("Failed to load report:", error);
    return null;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Title order={2} mb="xs">Report not found</Title>
          <Anchor component={Link} href="/">&larr; Back to dashboard</Anchor>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    <Anchor component={Link} href="/" key="dash" size="sm">Dashboard</Anchor>,
    <Anchor component={Link} href={`/projects/${report.project.slug}`} key="proj" size="sm">
      {report.project.name}
    </Anchor>,
    <Text size="sm" key="title" truncate>{report.title}</Text>,
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--mantine-color-gray-0)" }}>
      <Paper shadow="0" radius={0} style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
        <Container size="xl" py="md">
          <Breadcrumbs mb="xs">{breadcrumbItems}</Breadcrumbs>
          <Title order={2}>{report.title}</Title>

          <Group gap="md" mt="sm">
            {report.branch && (
              <Text size="sm" c="dimmed">
                Branch: <Code>{report.branch}</Code>
              </Text>
            )}
            {report.commitSha && (
              <Text size="sm" c="dimmed">
                Commit: <Code>{report.commitSha.slice(0, 8)}</Code>
              </Text>
            )}
            {report.ciProvider && (
              <Text size="sm" c="dimmed">CI: {report.ciProvider}</Text>
            )}
            {report.buildUrl && (
              <Anchor href={report.buildUrl} target="_blank" rel="noopener noreferrer" size="sm">
                Build link &rarr;
              </Anchor>
            )}
          </Group>

          <SimpleGrid cols={{ base: 3, sm: 6 }} mt="md">
            <StatBox label="Total" value={report.totalTests} />
            <StatBox label="Passed" value={report.passed} color="green" />
            <StatBox label="Failed" value={report.failed} color="red" />
            <StatBox label="Skipped" value={report.skipped} color="gray" />
            <StatBox label="Flaky" value={report.flaky} color="yellow" />
            <StatBox label="Duration" value={formatDuration(report.durationMs)} />
          </SimpleGrid>
        </Container>
      </Paper>

      <Container size="xl" py="lg">
        <Paper shadow="xs" radius="md" mb="lg" style={{ overflow: "hidden" }}>
          <Group
            px="md"
            py="sm"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-3)", backgroundColor: "var(--mantine-color-gray-0)" }}
          >
            <Text fw={500}>HTML Report</Text>
          </Group>
          <iframe
            src={`/api/reports/${report.id}/files/index.html`}
            style={{ width: "100%", border: "none", minHeight: "50vh", height: "70vh" }}
            title="Playwright HTML Report"
          />
        </Paper>

        {report.traces.length > 0 && (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
            <Group
              px="md"
              py="sm"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-3)", backgroundColor: "var(--mantine-color-gray-0)" }}
            >
              <Text fw={500}>Traces ({report.traces.length})</Text>
            </Group>
            <Stack gap={0}>
              {report.traces.map((trace) => {
                const displayName = trace.testName.split("/").pop() || trace.testName;
                return (
                  <Anchor
                    key={trace.id}
                    component={Link}
                    href={`/traces/${trace.id}`}
                    underline="never"
                    px="md"
                    py="sm"
                    style={{ borderBottom: "1px solid var(--mantine-color-gray-2)", display: "block" }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} c="blue" truncate>
                          {displayName}
                        </Text>
                        <Text size="xs" c="dimmed">{trace.testFile}</Text>
                      </div>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {(trace.sizeBytes / 1024).toFixed(0)} KB
                      </Text>
                    </Group>
                  </Anchor>
                );
              })}
            </Stack>
          </Paper>
        )}
      </Container>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const mantineColor = color === "gray" ? "dimmed" : color;

  return (
    <div style={{ textAlign: "center" }}>
      <Text size="xl" fw={700} c={mantineColor}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </div>
  );
}
