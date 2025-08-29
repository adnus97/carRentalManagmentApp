CREATE TABLE "account" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"accountId" varchar(255),
	"providerId" varchar(255),
	"accessToken" varchar(255),
	"refreshToken" varchar(255),
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" varchar(255),
	"idToken" varchar(255),
	"password" varchar(255),
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "car_monthly_targets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"car_id" varchar(255) NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"target_rents" integer NOT NULL,
	"revenue_goal" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer NOT NULL,
	"purchase_price" integer NOT NULL,
	"price_per_day" integer NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"mileage" integer DEFAULT 0 NOT NULL,
	"monthly_lease_price" integer NOT NULL,
	"insurance_expiry_date" timestamp NOT NULL,
	"status" text DEFAULT 'active',
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_blacklist" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_ratings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" varchar(255),
	"phone" varchar(20) NOT NULL,
	"document_id" varchar(255),
	"document_type" text,
	"test_var" varchar(255),
	"rating" real DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"emailVerified" boolean,
	"image" text,
	"createdAt" timestamp,
	"updatedAt" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"token" varchar(255) NOT NULL,
	"userAgent" varchar(255),
	"expiresAt" timestamp,
	"ipAddress" varchar(255),
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" varchar(255),
	"value" varchar(255),
	"expiresAt" timestamp,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "organization_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "rents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"car_id" varchar(255) NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"customer_id" varchar(255) NOT NULL,
	"start_date" timestamp NOT NULL,
	"expected_end_date" timestamp,
	"is_open_contract" boolean DEFAULT false NOT NULL,
	"returned_at" timestamp,
	"total_price" integer,
	"deposit" integer DEFAULT 0 NOT NULL,
	"guarantee" integer DEFAULT 0 NOT NULL,
	"late_fee" integer DEFAULT 0,
	"total_paid" integer DEFAULT 0 NOT NULL,
	"is_fully_paid" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'reserved',
	"damage_report" text DEFAULT '',
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" varchar(255),
	"phone" varchar(20) NOT NULL,
	"document_id" varchar(255),
	"document_type" text,
	"test_var" varchar(255),
	"rating" real DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "test_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"car_id" varchar(255) NOT NULL,
	"org_id" varchar(255) NOT NULL,
	"type" text,
	"mileage" integer,
	"cost" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" ADD CONSTRAINT "car_monthly_targets_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" ADD CONSTRAINT "car_monthly_targets_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_blacklist" ADD CONSTRAINT "customer_blacklist_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ratings" ADD CONSTRAINT "customer_ratings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rents" ADD CONSTRAINT "rents_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rents" ADD CONSTRAINT "rents_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rents" ADD CONSTRAINT "rents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test" ADD CONSTRAINT "test_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;