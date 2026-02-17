CREATE TABLE "test_results" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"suite_name" text,
	"file_name" text,
	"status" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_stack" text,
	"category" text,
	"severity" text,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_results_report_id_idx" ON "test_results" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "test_results_project_id_idx" ON "test_results" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_results_full_name_idx" ON "test_results" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "test_results_status_idx" ON "test_results" USING btree ("status");
