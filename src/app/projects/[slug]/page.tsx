import Link from "next/link";
import { getDb, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Badge,
  Code,
  Anchor,
  Breadcrumbs,
  Paper,
} from "@mantine/core";

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

  const breadcrumbItems = [
    <Anchor href="/" key="dash" size="sm">Dashboard</Anchor>,
    <Text size="sm" key="proj">{projectName}</Text>,
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--mantine-color-gray-0)" }}>
      <Paper shadow="0" radius={0} style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
        <Container size="xl" py="md">
          <Breadcrumbs mb="xs">{breadcrumbItems}</Breadcrumbs>
          <Title order={2}>{projectName}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {reports.length} report{reports.length !== 1 ? "s" : ""}
          </Text>
        </Container>
      </Paper>

      <Container size="xl" py="lg">
        {reports.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No reports found for this project.
          </Text>
        ) : (
          <Stack gap="sm">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card shadow="xs" radius="md" padding="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text fw={500} truncate>{report.title}</Text>
                      <Group gap="sm" mt="xs">
                        {report.branch && (
                          <Code style={{ fontSize: "var(--mantine-font-size-xs)" }}>{report.branch}</Code>
                        )}
                        {report.commitSha && (
                          <Code style={{ fontSize: "var(--mantine-font-size-xs)" }}>{report.commitSha.slice(0, 8)}</Code>
                        )}
                        <Text size="xs" c="dimmed">
                          {new Date(report.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </Group>
                    </div>
                    <Group gap="sm" style={{ flexShrink: 0 }}>
                      <Badge color="green" variant="light" size="sm">
                        {report.passed} passed
                      </Badge>
                      {report.failed > 0 && (
                        <Badge color="red" variant="light" size="sm">
                          {report.failed} failed
                        </Badge>
                      )}
                      <Text size="xs" c="dimmed">
                        {formatDuration(report.durationMs)}
                      </Text>
                    </Group>
                  </Group>
                </Card>
              </Link>
            ))}
          </Stack>
        )}
      </Container>
    </div>
  );
}
