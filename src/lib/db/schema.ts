import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("projects_slug_idx").on(table.slug)]
);

export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    storagePath: text("storage_path").notNull(),

    // Test result summary
    totalTests: integer("total_tests").notNull().default(0),
    passed: integer("passed").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    flaky: integer("flaky").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),

    // CI metadata
    ciProvider: text("ci_provider"),
    branch: text("branch"),
    commitSha: text("commit_sha"),
    commitMessage: text("commit_message"),
    buildUrl: text("build_url"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reports_project_id_idx").on(table.projectId),
    index("reports_created_at_idx").on(table.createdAt),
    index("reports_branch_idx").on(table.branch),
  ]
);

export const traces = pgTable(
  "traces",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    testName: text("test_name").notNull(),
    testFile: text("test_file").notNull(),
    storagePath: text("storage_path").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("traces_report_id_idx").on(table.reportId)]
);

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  reports: many(reports),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
  traces: many(traces),
}));

export const tracesRelations = relations(traces, ({ one }) => ({
  report: one(reports, {
    fields: [traces.reportId],
    references: [reports.id],
  }),
}));
