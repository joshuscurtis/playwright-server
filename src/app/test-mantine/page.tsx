import { Container, Title, Text, Badge, Code, Paper, Group, Stack, Anchor, Card } from "@mantine/core";
import { getDb, schema } from "@/lib/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  let dbStatus = "not tested";
  let reportCount = 0;
  let error = "";

  try {
    const db = getDb();
    const reports = await db.query.reports.findMany({
      with: { project: true },
      orderBy: [desc(schema.reports.createdAt)],
      limit: 5,
    });
    reportCount = reports.length;
    dbStatus = "connected";
  } catch (e: any) {
    dbStatus = "error";
    error = e?.message || String(e);
  }

  return (
    <Container size="xl" py="lg">
      <Title order={2}>Mantine + DB Test</Title>
      <Text c="dimmed" mt="sm">DB: {dbStatus}</Text>
      <Text c="dimmed">Reports found: {reportCount}</Text>
      {error && <Text c="red">Error: {error}</Text>}

      <Paper shadow="xs" radius="md" mt="lg" p="md">
        <Group>
          <Badge color="green" variant="light">Green Badge</Badge>
          <Badge color="red" variant="light">Red Badge</Badge>
          <Code>code snippet</Code>
        </Group>
      </Paper>

      <Stack gap="sm" mt="lg">
        <Card shadow="xs" radius="md" padding="md">
          <Text fw={500}>Card 1</Text>
          <Text size="sm" c="dimmed">This is a test card</Text>
        </Card>
      </Stack>

      <Paper shadow="xs" radius="md" mt="lg" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 16px", textAlign: "left", borderBottom: "1px solid var(--mantine-color-gray-3)" }}>Name</th>
              <th style={{ padding: "8px 16px", textAlign: "left", borderBottom: "1px solid var(--mantine-color-gray-3)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
                <Anchor href="/">Dashboard Link</Anchor>
              </td>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
                <Badge color="green" variant="light" size="sm">OK</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </Paper>
    </Container>
  );
}
