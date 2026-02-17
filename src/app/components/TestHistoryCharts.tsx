"use client";

import { Paper, Text, Group } from "@mantine/core";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface ChartEntry {
  date: string;
  durationMs: number;
  status: string;
  reportTitle: string;
}

const STATUS_COLORS: Record<string, string> = {
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

export function TestHistoryCharts({ data }: { data: ChartEntry[] }) {
  // Assign numeric values for status bar chart
  const statusData = data.map((d, i) => ({
    ...d,
    statusValue: 1,
    color: STATUS_COLORS[d.status] || STATUS_COLORS.passed,
    index: i,
  }));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "var(--mantine-spacing-lg)",
      }}
    >
      {/* Duration Trend */}
      <Paper shadow="xs" radius="md" p="md">
        <Text fw={500} mb="sm">
          Duration Over Time
        </Text>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} tickFormatter={(v) => formatDuration(v)} />
            <Tooltip
              formatter={(val: number) => formatDuration(val)}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Line
              type="monotone"
              dataKey="durationMs"
              stroke="#228be6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Duration"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Status Timeline */}
      <Paper shadow="xs" radius="md" p="md">
        <Text fw={500} mb="sm">
          Status Timeline
        </Text>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const d = payload[0].payload as ChartEntry;
                return (
                  <div
                    style={{
                      background: "white",
                      border: "1px solid #dee2e6",
                      borderRadius: 4,
                      padding: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{d.reportTitle}</div>
                    <div>Status: {d.status}</div>
                    <div>Duration: {formatDuration(d.durationMs)}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="statusValue" name="Status">
              {statusData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Group gap="md" mt="xs" justify="center">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <Group key={status} gap={4}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: color,
                }}
              />
              <Text size="xs" c="dimmed">
                {status}
              </Text>
            </Group>
          ))}
        </Group>
      </Paper>
    </div>
  );
}
