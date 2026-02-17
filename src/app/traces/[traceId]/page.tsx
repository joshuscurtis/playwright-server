import { headers } from "next/headers";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { Anchor, Group, Text } from "@mantine/core";

async function getTrace(traceId: string) {
  try {
    const db = getDb();
    return await db.query.traces.findFirst({
      where: eq(schema.traces.id, traceId),
      with: { report: { with: { project: true } } },
    });
  } catch {
    return null;
  }
}

export default async function TraceViewerPage({
  params,
}: {
  params: Promise<{ traceId: string }>;
}) {
  const { traceId } = await params;
  const trace = await getTrace(traceId);

  const hdrs = await headers();
  const host = hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  const traceApiUrl = `${baseUrl}/api/traces/by-id/${traceId}`;
  const viewerUrl = `https://trace.playwright.dev/?trace=${encodeURIComponent(traceApiUrl)}`;

  const displayName = trace
    ? trace.testName.split("/").pop() || trace.testName
    : traceId;

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          backgroundColor: "#1a1b1e",
          flexShrink: 0,
          padding: "8px 16px",
          borderBottom: "1px solid #2c2e33",
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm">
            {trace?.report ? (
              <Anchor href={`/reports/${trace.report.id}`} size="sm" c="teal.4">
                &larr; Back to report
              </Anchor>
            ) : (
              <Anchor href="/" size="sm" c="teal.4">
                &larr; Back
              </Anchor>
            )}
            <Text c="dark.2" size="sm">|</Text>
            <Text c="white" size="sm" fw={500} truncate style={{ maxWidth: 500 }}>
              {displayName}
            </Text>
          </Group>
          <Anchor
            href={viewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="teal.4"
            style={{ flexShrink: 0 }}
          >
            Open in Playwright Trace Viewer &rarr;
          </Anchor>
        </Group>
      </div>
      <iframe
        src={viewerUrl}
        style={{ width: "100%", flex: 1, border: "none" }}
        title="Playwright Trace Viewer"
      />
    </div>
  );
}
