"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Text,
  Group,
  Badge,
  Stack,
  Code,
  Anchor,
} from "@mantine/core";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface TrendData {
  reportId: string;
  title: string;
  date: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  passRate: number;
  durationMs: number;
}

interface SlowestTest {
  name: string;
  fullName: string;
  fileName: string | null;
  durationMs: number;
  status: string;
}

interface FlakyTest {
  fullName: string;
  fileName: string | null;
  count: number;
  lastSeen: string;
}

interface FailureCategory {
  category: string;
  count: number;
  tests: string[];
}

interface AnalyticsData {
  trend: TrendData[];
  slowestTests: SlowestTest[];
  flakyTests: FlakyTest[];
  failureCategories: FailureCategory[];
}

const STATUS_COLORS = {
  passed: "#40c057",
  failed: "#fa5252",
  skipped: "#868e96",
  flaky: "#fab005",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function DashboardCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Paper p="xl" ta="center">
        <Text c="dimmed">Loading analytics...</Text>
      </Paper>
    );
  }

  if (!data || data.trend.length === 0) {
    return null;
  }

  // Status distribution from latest report
  const latest = data.trend[data.trend.length - 1];
  const pieData = [
    { name: "Passed", value: latest.passed, color: STATUS_COLORS.passed },
    { name: "Failed", value: latest.failed, color: STATUS_COLORS.failed },
    { name: "Skipped", value: latest.skipped, color: STATUS_COLORS.skipped },
    { name: "Flaky", value: latest.flaky, color: STATUS_COLORS.flaky },
  ].filter((d) => d.value > 0);

  // Format trend dates for display
  const trendForChart = data.trend.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Stack gap="lg" mb="lg">
      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "var(--mantine-spacing-lg)",
        }}
      >
        {/* Status Distribution Pie Chart */}
        <Paper shadow="xs" radius="md" p="md">
          <Text fw={500} mb="sm">
            Latest Report Status
          </Text>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }: any) => `${name}: ${value}`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* Pass Rate Trend */}
        <Paper shadow="xs" radius="md" p="md">
          <Text fw={500} mb="sm">
            Pass Rate Trend
          </Text>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendForChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis domain={[0, 100]} fontSize={11} unit="%" />
              <Tooltip
                formatter={(val: number) => `${val}%`}
                labelFormatter={(l) => `Report: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke={STATUS_COLORS.passed}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        {/* Test Results Stacked Bar */}
        <Paper shadow="xs" radius="md" p="md">
          <Text fw={500} mb="sm">
            Test Results Over Time
          </Text>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendForChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="passed" stackId="a" fill={STATUS_COLORS.passed} />
              <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} />
              <Bar dataKey="skipped" stackId="a" fill={STATUS_COLORS.skipped} />
              <Bar dataKey="flaky" stackId="a" fill={STATUS_COLORS.flaky} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Duration Trend */}
        <Paper shadow="xs" radius="md" p="md">
          <Text fw={500} mb="sm">
            Total Duration Trend
          </Text>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendForChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis
                fontSize={11}
                tickFormatter={(v) => formatDuration(v)}
              />
              <Tooltip
                formatter={(val: number) => formatDuration(val)}
                labelFormatter={(l) => `Report: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="durationMs"
                stroke="#228be6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </div>

      {/* Lists Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--mantine-spacing-lg)",
        }}
      >
        {/* Slowest Tests */}
        {data.slowestTests.length > 0 && (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "var(--mantine-spacing-md)",
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                backgroundColor: "var(--mantine-color-gray-0)",
              }}
            >
              <Text fw={500}>Slowest Tests</Text>
            </div>
            <Stack gap={0}>
              {data.slowestTests.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding:
                      "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={500} truncate>
                        {t.name}
                      </Text>
                      {t.fileName && (
                        <Text size="xs" c="dimmed" truncate>
                          {t.fileName}
                        </Text>
                      )}
                    </div>
                    <Badge color="orange" variant="light" size="sm">
                      {formatDuration(t.durationMs)}
                    </Badge>
                  </Group>
                </div>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Flaky Tests */}
        {data.flakyTests.length > 0 && (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "var(--mantine-spacing-md)",
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                backgroundColor: "var(--mantine-color-gray-0)",
              }}
            >
              <Text fw={500}>Flaky Tests</Text>
            </div>
            <Stack gap={0}>
              {data.flakyTests.map((t, i) => (
                <div
                  key={i}
                  style={{
                    padding:
                      "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={500} truncate>
                        {t.fullName.split(" > ").pop()}
                      </Text>
                      {t.fileName && (
                        <Text size="xs" c="dimmed" truncate>
                          {t.fileName}
                        </Text>
                      )}
                    </div>
                    <Badge color="yellow" variant="light" size="sm">
                      {t.count}x flaky
                    </Badge>
                  </Group>
                </div>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Failure Categories */}
        {data.failureCategories.length > 0 && (
          <Paper shadow="xs" radius="md" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "var(--mantine-spacing-md)",
                borderBottom: "1px solid var(--mantine-color-gray-3)",
                backgroundColor: "var(--mantine-color-gray-0)",
              }}
            >
              <Text fw={500}>Failure Categories</Text>
            </div>
            <Stack gap={0}>
              {data.failureCategories.map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding:
                      "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {c.category}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {c.tests.join(", ")}
                      </Text>
                    </div>
                    <Badge color="red" variant="light" size="sm">
                      {c.count} failures
                    </Badge>
                  </Group>
                </div>
              ))}
            </Stack>
          </Paper>
        )}
      </div>
    </Stack>
  );
}
