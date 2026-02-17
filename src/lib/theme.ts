/**
 * Shared theme constants for consistent styling across components.
 */

/** Hex color values for test statuses (used in charts). */
export const STATUS_COLORS: Record<string, string> = {
  passed: "#12b886",
  failed: "#fa5252",
  skipped: "#868e96",
  flaky: "#fab005",
};

/** Mantine color names for test statuses (used in Badge components). */
export const STATUS_BADGE_COLORS: Record<string, string> = {
  passed: "teal",
  failed: "red",
  skipped: "gray",
  flaky: "yellow",
};

/** Standard table header cell style. */
export const tableHeaderStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 11,
  color: "#868e96",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "2px solid #e9ecef",
  background: "white",
  whiteSpace: "nowrap",
};

/** Standard table body cell style. */
export const tableCellStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f3f5",
  verticalAlign: "middle",
};

/** Sortable table header style (extends tableHeaderStyle with cursor). */
export const sortableHeaderStyle: React.CSSProperties = {
  ...tableHeaderStyle,
  cursor: "pointer",
  userSelect: "none",
};

/** The hero section gradient background. */
export const heroGradient =
  "linear-gradient(135deg, #087f5b 0%, #099268 50%, #0ca678 100%)";
