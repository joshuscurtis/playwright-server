# Allure Feature Parity Plan

## Current State
We have a basic Playwright report server with:
- Summary-level stats per report (passed/failed/skipped/flaky counts)
- HTML report iframe embedding
- Trace file viewer
- Basic dashboard table listing reports

## Gap Analysis
Allure stores **individual test results** with rich metadata. We only store **aggregate counts**.
This is the foundational gap — everything else (history, trends, categories, filtering) depends on having per-test data.

---

## Implementation Plan

### Phase 1: Schema — Store Individual Test Results

**Add `test_results` table:**
```
id, reportId, name, fullName, suiteName, fileName,
status (passed|failed|skipped|flaky),
durationMs, retries,
errorMessage, errorStack,
tags (jsonb), metadata (jsonb),
createdAt
```

**Add `test_history` view/query:**
Track same test across runs via `fullName` + `projectId`

### Phase 2: Ingestion — Parse Playwright JSON Report

Update `ingest.ts` to:
- Parse `report.json` → extract every individual test result
- Extract: test name, suite/file, status, duration, error message, stack trace, retry count
- Playwright's JSON format has `suites[].specs[].tests[].results[]` structure
- Store each test result in the new table

### Phase 3: Report Detail Page — Individual Test Results

Replace/supplement the HTML iframe with a native test results view:
- **Sortable table** of all tests in the report
- Columns: Test Name, Suite/File, Status, Duration, Retries
- **Expandable rows** showing error message + stack trace for failures
- **Status filter buttons** (pass/fail/skip/flaky with counts)
- **Search** by test name
- Keep the HTML report iframe as an optional "Raw Report" tab

### Phase 4: Dashboard — Charts & Analytics

Add to dashboard:
- **Status pie chart** — pass/fail/skip/flaky distribution for latest reports
- **Trend line chart** — pass rate over last N reports per project
- **Slowest tests** — top 10 slowest tests across recent runs
- **Flaky tests** — tests that alternate pass/fail across runs
- Use a lightweight chart library (recharts or chart.js via a client component)

### Phase 5: Test History Page

New page: `/tests/[fullName]` or query-based
- Show a specific test's results across all reports
- **History timeline** — status + duration per run
- **Flakiness score** — pass/fail ratio over last N runs
- **Duration trend** — line chart of execution time
- **Error pattern grouping** — common failure reasons

### Phase 6: Suites & Categories Views

**Suites view** on report detail:
- Tree view: File → Describe Block → Test
- Collapsible with status counts per node
- Color-coded status indicators

**Categories view** (auto-generated):
- Group failures by error message similarity
- "Product defects" (assertion failures) vs "Test defects" (exceptions)
- Count of affected tests per category

### Phase 7: Enhanced Filtering & Search

Dashboard improvements:
- **Date range** filter
- **Status** filter buttons
- **Project** dropdown
- **Branch** filter
- **Sort by**: date, pass rate, duration, test count
- **Global test search** across all reports

### Phase 8: Duration Analytics

- **Duration distribution** histogram on report detail
- **Slowest tests** panel
- **Duration trend** per test over time
- **Total duration trend** per project over time

---

## Technical Decisions

- **Charts**: Use `recharts` (React-based, SSR-friendly, lightweight)
- **DB migration**: Add test_results table via Drizzle migration
- **No breaking changes**: Existing reports keep working; new data enriches the experience
- **Client components**: Charts and interactive filters will be "use client" components
- **API additions**: GET /api/reports/[id]/tests, GET /api/tests/history?name=...&project=...

## Priority Order
Phases 1-3 are foundational (must do first).
Phases 4-8 build on that foundation and can be done in parallel.
