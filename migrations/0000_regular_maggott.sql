CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"manager" text,
	"employee_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"position" text NOT NULL,
	"department_id" integer,
	"department_name" text,
	"start_date" date NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"total_entitlement" integer DEFAULT 0 NOT NULL,
	"days_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "leave_balances_employee_id_leave_type_id_year_unique" UNIQUE("employee_id","leave_type_id","year")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"employee_name" text NOT NULL,
	"employee_position" text NOT NULL,
	"leave_type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_date" date NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_days" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "leave_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;