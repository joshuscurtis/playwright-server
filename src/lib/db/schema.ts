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
    index("reports_project_created_idx").on(table.projectId, table.createdAt),
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

export const testResults = pgTable(
  "test_results",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    // Test identification
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    suiteName: text("suite_name"),
    fileName: text("file_name"),

    // Result
    status: text("status").notNull(), // passed, failed, skipped, flaky
    durationMs: integer("duration_ms").notNull().default(0),
    retries: integer("retries").notNull().default(0),

    // Error info
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),

    // Categorization
    category: text("category"),
    severity: text("severity"),

    // Extra data
    tags: jsonb("tags").$type<string[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_results_report_id_idx").on(table.reportId),
    index("test_results_project_id_idx").on(table.projectId),
    index("test_results_full_name_idx").on(table.fullName),
    index("test_results_status_idx").on(table.status),
    index("test_results_status_created_idx").on(table.status, table.createdAt),
    index("test_results_project_fullname_idx").on(table.projectId, table.fullName),
  ]
);

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  reports: many(reports),
  testResults: many(testResults),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
  traces: many(traces),
  testResults: many(testResults),
}));

export const tracesRelations = relations(traces, ({ one }) => ({
  report: one(reports, {
    fields: [traces.reportId],
    references: [reports.id],
  }),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  report: one(reports, {
    fields: [testResults.reportId],
    references: [reports.id],
  }),
  project: one(projects, {
    fields: [testResults.projectId],
    references: [projects.id],
  }),
}));
