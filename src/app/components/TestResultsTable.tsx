"use client";

import { useState, useMemo } from "react";
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

interface TestResult {
  id: string;
  name: string;
  fullName: string;
  suiteName: string | null;
  fileName: string | null;
  status: string;
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  errorStack: string | null;
  tags: string[] | null;
  projectId: string;
}

interface Props {
  testResults: TestResult[];
  projectId: string;
}

type StatusFilter = "all" | "passed" | "failed" | "skipped" | "flaky";
type SortKey = "name" | "status" | "duration" | "file";
type SortDir = "asc" | "desc";

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

export function TestResultsTable({ testResults, projectId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
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
          cmp = a.status.localeCompare(b.status);
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
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const filterButtons: { key: StatusFilter; label: string; color: string }[] = [
    { key: "all", label: `All (${counts.all})`, color: "blue" },
    { key: "passed", label: `Passed (${counts.passed})`, color: "green" },
    { key: "failed", label: `Failed (${counts.failed})`, color: "red" },
    { key: "skipped", label: `Skipped (${counts.skipped})`, color: "gray" },
    { key: "flaky", label: `Flaky (${counts.flaky})`, color: "yellow" },
  ];

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
    cursor: "pointer",
    userSelect: "none",
  };

  const tdStyle: React.CSSProperties = {
    padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
    borderBottom: "1px solid var(--mantine-color-gray-2)",
    fontSize: "var(--mantine-font-size-sm)",
  };

  return (
    <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "var(--mantine-spacing-md)",
          borderBottom: "1px solid var(--mantine-color-gray-3)",
          backgroundColor: "var(--mantine-color-gray-0)",
        }}
      >
        <Group justify="space-between" align="center" mb="sm">
          <Text fw={500}>Test Results ({filtered.length})</Text>
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
        <div style={{ padding: "var(--mantine-spacing-xl)", textAlign: "center" }}>
          <Text c="dimmed">No test results found</Text>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--mantine-font-size-sm)",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort("status")}>
                  Status{sortIcon("status")}
                </th>
                <th style={thStyle} onClick={() => handleSort("name")}>
                  Test{sortIcon("name")}
                </th>
                <th style={thStyle} onClick={() => handleSort("file")}>
                  File{sortIcon("file")}
                </th>
                <th style={thStyle} onClick={() => handleSort("duration")}>
                  Duration{sortIcon("duration")}
                </th>
                <th style={thStyle}>Retries</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <>
                  <tr
                    key={t.id}
                    style={{ cursor: t.errorMessage ? "pointer" : "default" }}
                    onClick={() =>
                      t.errorMessage &&
                      setExpandedId(expandedId === t.id ? null : t.id)
                    }
                  >
                    <td style={tdStyle}>
                      <Badge
                        color={statusColors[t.status] || "gray"}
                        variant="light"
                        size="sm"
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td style={tdStyle}>
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
                    <td style={tdStyle}>
                      <Text size="xs" c="dimmed">
                        {t.fileName || "-"}
                      </Text>
                    </td>
                    <td style={tdStyle}>
                      <Text size="sm">{formatDuration(t.durationMs)}</Text>
                    </td>
                    <td style={tdStyle}>
                      {t.retries > 0 ? (
                        <Badge color="orange" variant="light" size="sm">
                          {t.retries}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">
                          0
                        </Text>
                      )}
                    </td>
                  </tr>
                  {expandedId === t.id && t.errorMessage && (
                    <tr key={`${t.id}-error`}>
                      <td
                        colSpan={5}
                        style={{
                          padding: "var(--mantine-spacing-md)",
                          backgroundColor: "var(--mantine-color-red-0)",
                          borderBottom:
                            "1px solid var(--mantine-color-gray-2)",
                        }}
                      >
                        <Stack gap="xs">
                          <Text size="sm" fw={500} c="red">
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
                                fontSize: "var(--mantine-font-size-xs)",
                              }}
                            >
                              {t.errorStack}
                            </Code>
                          )}
                        </Stack>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paper>
  );
}
