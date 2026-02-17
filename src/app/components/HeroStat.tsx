import { Text } from "@mantine/core";

/** A single stat card displayed in the hero gradient banner. */
export function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "14px 16px",
        textAlign: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <Text size="xl" fw={800} c="white" lh={1.1}>
        {value}
      </Text>
      <Text size="xs" c="white" style={{ opacity: 0.7 }} mt={4}>
        {label}
      </Text>
    </div>
  );
}
