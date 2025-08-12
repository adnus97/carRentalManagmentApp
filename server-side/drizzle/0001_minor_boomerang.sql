ALTER TABLE "maintenance_logs" ALTER COLUMN "mileage" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ALTER COLUMN "cost" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" ADD COLUMN "start_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" ADD COLUMN "end_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" ADD COLUMN "target_rents" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "car_monthly_targets" DROP COLUMN "month";