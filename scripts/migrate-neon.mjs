#!/usr/bin/env node
/**
 * Run migration against Neon via SQL-over-HTTP.
 * Usage: DATABASE_URL=postgresql://... node scripts/migrate-neon.mjs
 */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// Parse the connection string to get the host for the SQL API
const url = new URL(DATABASE_URL);
const host = url.hostname;
const sqlEndpoint = `https://${host}/sql`;

const statements = [
  `CREATE TABLE IF NOT EXISTS "projects" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "reports" ("id" text PRIMARY KEY NOT NULL, "project_id" text NOT NULL, "title" text NOT NULL, "storage_path" text NOT NULL, "total_tests" integer DEFAULT 0 NOT NULL, "passed" integer DEFAULT 0 NOT NULL, "failed" integer DEFAULT 0 NOT NULL, "skipped" integer DEFAULT 0 NOT NULL, "flaky" integer DEFAULT 0 NOT NULL, "duration_ms" integer DEFAULT 0 NOT NULL, "ci_provider" text, "branch" text, "commit_sha" text, "commit_message" text, "build_url" text, "metadata" jsonb, "created_at" timestamp with time zone DEFAULT now() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "traces" ("id" text PRIMARY KEY NOT NULL, "report_id" text NOT NULL, "test_name" text NOT NULL, "test_file" text NOT NULL, "storage_path" text NOT NULL, "size_bytes" integer DEFAULT 0 NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL)`,
  `DO $$ BEGIN ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "traces" ADD CONSTRAINT "traces_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_idx" ON "projects" USING btree ("slug")`,
  `CREATE INDEX IF NOT EXISTS "reports_project_id_idx" ON "reports" USING btree ("project_id")`,
  `CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "reports" USING btree ("created_at")`,
  `CREATE INDEX IF NOT EXISTS "reports_branch_idx" ON "reports" USING btree ("branch")`,
  `CREATE INDEX IF NOT EXISTS "traces_report_id_idx" ON "traces" USING btree ("report_id")`,
];

async function runSQL(query, label) {
  const res = await fetch(sqlEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": DATABASE_URL,
    },
    body: JSON.stringify({ query }),
  });

  const body = await res.json();
  if (body.command || body.rows !== undefined) {
    console.log(`  OK: ${label}`);
  } else {
    console.error(`  FAIL: ${label}`, body.message || body);
    process.exit(1);
  }
}

console.log("Running migration against Neon...\n");

for (let i = 0; i < statements.length; i++) {
  const labels = [
    "Create projects table",
    "Create reports table",
    "Create traces table",
    "Add reports FK",
    "Add traces FK",
    "Create projects_slug_idx",
    "Create reports_project_id_idx",
    "Create reports_created_at_idx",
    "Create reports_branch_idx",
    "Create traces_report_id_idx",
  ];
  await runSQL(statements[i], labels[i]);
}

// Verify
console.log("\nVerifying tables...");
const verifyRes = await fetch(sqlEndpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Neon-Connection-String": DATABASE_URL,
  },
  body: JSON.stringify({
    query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
  }),
});
const tables = await verifyRes.json();
console.log("Tables:", tables.rows?.map((r) => r[0]).join(", "));
console.log("\nMigration complete!");
