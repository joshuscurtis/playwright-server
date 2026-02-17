"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Text,
  Group,
  Badge,
  Stack,
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
import { formatDuration } from "@/lib/format";
import { STATUS_COLORS } from "@/lib/theme";

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

interface PieLabelProps {
  name: string;
  value: number;
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 8,
        background: "linear-gradient(90deg, #f1f3f5 25%, #e9ecef 50%, #f1f3f5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function InsightPanel({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
      <div className="section-header">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">{title}</Text>
          {count !== undefined && (
            <Text size="xs" c="dimmed">{count} total</Text>
          )}
        </Group>
      </div>
      {children}
    </Paper>
  );
}

function InsightRow({
  label,
  sublabel,
  badge,
  badgeColor,
}: {
  label: string;
  sublabel?: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div
      className="list-item-hover"
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #f1f3f5",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} truncate>
            {label}
          </Text>
          {sublabel && (
            <Text size="xs" c="dimmed" truncate>
              {sublabel}
            </Text>
          )}
        </div>
        <Badge color={badgeColor} variant="light" size="sm" style={{ flexShrink: 0 }}>
          {badge}
        </Badge>
      </Group>
    </div>
  );
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
      <Stack gap="lg" mb="lg">
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 16,
          }}
        >
          <Paper shadow="xs" radius="md" p="md"><Skeleton height={220} /></Paper>
          <Paper shadow="xs" radius="md" p="md"><Skeleton height={220} /></Paper>
          <Paper shadow="xs" radius="md" p="md"><Skeleton height={220} /></Paper>
          <Paper shadow="xs" radius="md" p="md"><Skeleton height={220} /></Paper>
        </div>
      </Stack>
    );
  }

  if (!data || data.trend.length === 0) {
    return null;
  }

  const latest = data.trend[data.trend.length - 1];
  const pieData = [
    { name: "Passed", value: latest.passed, color: STATUS_COLORS.passed },
    { name: "Failed", value: latest.failed, color: STATUS_COLORS.failed },
    { name: "Skipped", value: latest.skipped, color: STATUS_COLORS.skipped },
    { name: "Flaky", value: latest.flaky, color: STATUS_COLORS.flaky },
  ].filter((d) => d.value > 0);

  const trendForChart = data.trend.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <Stack gap="lg" mb="lg">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: 16,
        }}
      >
        {/* Pie Chart */}
        <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
          <div className="section-header">
            <Text fw={600} size="sm">Latest Report Status</Text>
          </div>
          <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }: PieLabelProps) => `${name}: ${value}`}
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
        <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
          <div className="section-header">
            <Text fw={600} size="sm">Pass Rate Trend</Text>
          </div>
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendForChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="label" fontSize={11} tick={{ fill: "#868e96" }} />
                <YAxis domain={[0, 100]} fontSize={11} unit="%" tick={{ fill: "#868e96" }} />
                <Tooltip
                  formatter={(val: number) => `${val}%`}
                  labelFormatter={(l) => `Report: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  stroke={STATUS_COLORS.passed}
                  strokeWidth={2}
                  dot={{ r: 3, fill: STATUS_COLORS.passed }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* Stacked Bar */}
        <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
          <div className="section-header">
            <Text fw={600} size="sm">Test Results Over Time</Text>
          </div>
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendForChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="label" fontSize={11} tick={{ fill: "#868e96" }} />
                <YAxis fontSize={11} tick={{ fill: "#868e96" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" stackId="a" fill={STATUS_COLORS.passed} />
                <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} />
                <Bar dataKey="skipped" stackId="a" fill={STATUS_COLORS.skipped} />
                <Bar dataKey="flaky" stackId="a" fill={STATUS_COLORS.flaky} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* Duration Trend */}
        <Paper shadow="xs" radius="md" style={{ overflow: "hidden", background: "white" }}>
          <div className="section-header">
            <Text fw={600} size="sm">Total Duration Trend</Text>
          </div>
          <div style={{ padding: 16 }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendForChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="label" fontSize={11} tick={{ fill: "#868e96" }} />
                <YAxis
                  fontSize={11}
                  tickFormatter={(v) => formatDuration(v)}
                  tick={{ fill: "#868e96" }}
                />
                <Tooltip
                  formatter={(val: number) => formatDuration(val)}
                  labelFormatter={(l) => `Report: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="durationMs"
                  stroke="#099268"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#099268" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      </div>

      {/* Insight Panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {data.slowestTests.length > 0 && (
          <InsightPanel title="Slowest Tests" count={data.slowestTests.length}>
            <Stack gap={0}>
              {data.slowestTests.map((t, i) => (
                <InsightRow
                  key={i}
                  label={t.name}
                  sublabel={t.fileName || undefined}
                  badge={formatDuration(t.durationMs)}
                  badgeColor="orange"
                />
              ))}
            </Stack>
          </InsightPanel>
        )}

        {data.flakyTests.length > 0 && (
          <InsightPanel title="Flaky Tests" count={data.flakyTests.length}>
            <Stack gap={0}>
              {data.flakyTests.map((t, i) => (
                <InsightRow
                  key={i}
                  label={t.fullName.split(" > ").pop() || t.fullName}
                  sublabel={t.fileName || undefined}
                  badge={`${t.count}x flaky`}
                  badgeColor="yellow"
                />
              ))}
            </Stack>
          </InsightPanel>
        )}

        {data.failureCategories.length > 0 && (
          <InsightPanel title="Failure Categories" count={data.failureCategories.length}>
            <Stack gap={0}>
              {data.failureCategories.map((c, i) => (
                <InsightRow
                  key={i}
                  label={c.category}
                  sublabel={c.tests.join(", ")}
                  badge={`${c.count} failures`}
                  badgeColor="red"
                />
              ))}
            </Stack>
          </InsightPanel>
        )}
      </div>
    </Stack>
  );
}
