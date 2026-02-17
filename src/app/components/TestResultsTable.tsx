"use client";

import { useState, useMemo, Fragment } from "react";
import {
  Badge,
  Text,
  Group,
  TextInput,
  Paper,
  Code,
  Stack,
  Anchor,
} from "@mantine/core";
import { formatDuration } from "@/lib/format";
import { STATUS_BADGE_COLORS, sortableHeaderStyle as th, tableCellStyle as td } from "@/lib/theme";
import type { TestResultRow } from "@/lib/types";

interface Props {
  testResults: TestResultRow[];
  projectId: string;
}

type StatusFilter = "all" | "passed" | "failed" | "skipped" | "flaky";
type SortKey = "name" | "status" | "duration" | "file";
type SortDir = "asc" | "desc";

const statusOrder: Record<string, number> = {
  failed: 0,
  flaky: 1,
  passed: 2,
  skipped: 3,
};

export function TestResultsTable({ testResults, projectId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: testResults.length, passed: 0, failed: 0, skipped: 0, flaky: 0 };
    for (const t of testResults) {
      if (t.status in c) c[t.status as keyof typeof c]++;
    }
    return c;
  }, [testResults]);

  const filtered = useMemo(() => {
    let items = testResults;
    if (statusFilter !== "all") {
      items = items.filter((t) => t.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.fullName.toLowerCase().includes(q) ||
          (t.fileName && t.fileName.toLowerCase().includes(q))
      );
    }
    items = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "status":
          cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
          break;
        case "duration":
          cmp = a.durationMs - b.durationMs;
          break;
        case "file":
          cmp = (a.fileName || "").localeCompare(b.fileName || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [testResults, statusFilter, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";

  const filterButtons: { key: StatusFilter; label: string; color: string }[] = [
    { key: "all", label: `All (${counts.all})`, color: "teal" },
    { key: "passed", label: `Passed (${counts.passed})`, color: "teal" },
    { key: "failed", label: `Failed (${counts.failed})`, color: "red" },
    { key: "skipped", label: `Skipped (${counts.skipped})`, color: "gray" },
    { key: "flaky", label: `Flaky (${counts.flaky})`, color: "yellow" },
  ];

  return (
    <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
      <div className="section-header">
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={600} size="sm">Test Results ({filtered.length})</Text>
        </Group>
        <Group gap="xs" mb="sm">
          {filterButtons.map((f) => (
            <Badge
              key={f.key}
              color={f.color}
              variant={statusFilter === f.key ? "filled" : "light"}
              style={{ cursor: "pointer" }}
              onClick={() => setStatusFilter(f.key)}
              size="lg"
            >
              {f.label}
            </Badge>
          ))}
        </Group>
        <TextInput
          placeholder="Search tests by name or file..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          size="sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Text c="dimmed">No test results found</Text>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th} onClick={() => handleSort("status")}>
                  Status{sortIcon("status")}
                </th>
                <th style={th} onClick={() => handleSort("name")}>
                  Test{sortIcon("name")}
                </th>
                <th style={th} onClick={() => handleSort("file")}>
                  File{sortIcon("file")}
                </th>
                <th style={th} onClick={() => handleSort("duration")}>
                  Duration{sortIcon("duration")}
                </th>
                <th style={th}>Retries</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <Fragment key={t.id}>
                  <tr
                    className="hoverable"
                    style={{ cursor: t.errorMessage ? "pointer" : "default" }}
                    onClick={() =>
                      t.errorMessage &&
                      setExpandedId(expandedId === t.id ? null : t.id)
                    }
                  >
                    <td style={td}>
                      <Badge
                        color={STATUS_BADGE_COLORS[t.status] || "gray"}
                        variant="light"
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td style={td}>
                      <Anchor
                        href={`/tests?fullName=${encodeURIComponent(t.fullName)}&projectId=${projectId}`}
                        size="sm"
                        fw={500}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        {t.name}
                      </Anchor>
                      {t.suiteName && (
                        <Text size="xs" c="dimmed">
                          {t.suiteName}
                        </Text>
                      )}
                    </td>
                    <td style={td}>
                      <Text size="xs" c="dimmed">
                        {t.fileName || "-"}
                      </Text>
                    </td>
                    <td style={td}>
                      <Text size="sm" ff="monospace" c="dimmed">
                        {formatDuration(t.durationMs)}
                      </Text>
                    </td>
                    <td style={td}>
                      {t.retries > 0 ? (
                        <Badge color="orange" variant="light" size="sm">
                          {t.retries}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">0</Text>
                      )}
                    </td>
                  </tr>
                  {expandedId === t.id && t.errorMessage && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: 16,
                          backgroundColor: "#fff5f5",
                          borderBottom: "1px solid #f1f3f5",
                        }}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={600} c="red">
                            Error
                          </Text>
                          <Text
                            size="sm"
                            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                          >
                            {t.errorMessage}
                          </Text>
                          {t.errorStack && (
                            <Code
                              block
                              style={{
                                maxHeight: 300,
                                overflow: "auto",
                                fontSize: 11,
                              }}
                            >
                              {t.errorStack}
                            </Code>
                          )}
                        </Stack>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paper>
  );
}
