-- AlterTable: Add totalHoursWorked and totalScheduledHours to PayrollRecord
ALTER TABLE "PayrollRecord" ADD COLUMN "totalHoursWorked" REAL NOT NULL DEFAULT 0;
ALTER TABLE "PayrollRecord" ADD COLUMN "totalScheduledHours" REAL NOT NULL DEFAULT 0;
