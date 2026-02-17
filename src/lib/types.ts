/**
 * Shared TypeScript interfaces used across server pages, API routes,
 * and client components. Eliminates duplicated type definitions and
 * removes the need for `any` casts on Drizzle query results.
 */

/** A project as returned by Drizzle `with: { project: true }`. */
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
}

/** A report row with its joined project, used on dashboard & project pages. */
export interface ReportWithProject {
  id: string;
  title: string;
  project: ProjectSummary;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  branch: string | null;
  commitSha: string | null;
  ciProvider: string | null;
  createdAt: Date;
}

/** Extended report detail used on the report detail page. */
export interface ReportDetail extends ReportWithProject {
  storagePath: string;
  commitMessage: string | null;
  buildUrl: string | null;
  traces: TraceSummary[];
  testResults: TestResultRow[];
}

/** A trace record summary. */
export interface TraceSummary {
  id: string;
  testName: string;
  testFile: string;
  sizeBytes: number;
}

/** A single test result row. */
export interface TestResultRow {
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

/** A test history entry for the test history page. */
export interface HistoryEntry {
  id: string;
  status: string;
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  createdAt: string;
  report: {
    id: string;
    title: string;
    branch: string | null;
    commitSha: string | null;
  };
}

// ---------------------------------------------------------------------------
// Drizzle result shapes — these describe what Drizzle actually returns from
// queries that use `with:`. Using these avoids `any` casts.
// ---------------------------------------------------------------------------

/** Shape returned by `db.query.reports.findMany({ with: { project: true } })`. */
export interface DrizzleReportWithProject {
  id: string;
  title: string;
  storagePath: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  ciProvider: string | null;
  buildUrl: string | null;
  metadata: Record<string, string> | null;
  createdAt: Date;
  projectId: string;
  project: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/** Shape returned when including traces in query results. */
export interface DrizzleTrace {
  id: string;
  reportId: string;
  testName: string;
  testFile: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: Date;
}

/** Shape returned when including testResults in query results. */
export interface DrizzleTestResult {
  id: string;
  reportId: string;
  projectId: string;
  name: string;
  fullName: string;
  suiteName: string | null;
  fileName: string | null;
  status: string;
  durationMs: number;
  retries: number;
  errorMessage: string | null;
  errorStack: string | null;
  category: string | null;
  severity: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** Shape returned when including report in testResults queries. */
export interface DrizzleTestResultWithReport extends DrizzleTestResult {
  report: {
    id: string;
    title: string;
    branch: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    ciProvider: string | null;
    buildUrl: string | null;
    storagePath: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    durationMs: number;
    metadata: Record<string, string> | null;
    projectId: string;
    createdAt: Date;
  };
}

/** Full report with all relations loaded. */
export interface DrizzleReportFull extends DrizzleReportWithProject {
  traces: DrizzleTrace[];
  testResults: DrizzleTestResult[];
}
