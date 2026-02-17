import { Container, Title, Text, Table, Badge, Code, Paper, Group, Stack, Anchor, Card } from "@mantine/core";
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
        <Card shadow="xs" radius="md" padding="md">
          <Text fw={500}>Card 2</Text>
          <Text size="sm" c="dimmed">Another test card</Text>
        </Card>
      </Stack>

      <Paper shadow="xs" radius="md" mt="lg" style={{ overflow: "hidden" }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Count</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td><Anchor href="/">Dashboard Link</Anchor></Table.Td>
              <Table.Td><Badge color="green" variant="light" size="sm">OK</Badge></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">42</Text></Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper shadow="xs" radius="md" mt="lg" visibleFrom="md" p="md">
        <Text>This is visible only on md+ screens (visibleFrom test)</Text>
      </Paper>
      <Paper shadow="xs" radius="md" mt="lg" hiddenFrom="md" p="md">
        <Text>This is hidden on md+ screens (hiddenFrom test)</Text>
      </Paper>
    </Container>
  );
}
