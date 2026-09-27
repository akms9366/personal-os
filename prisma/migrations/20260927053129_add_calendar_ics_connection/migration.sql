-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "calendarIcsUrl" TEXT;
ALTER TABLE "Settings" ADD COLUMN "calendarLastSyncAt" DATETIME;
ALTER TABLE "Settings" ADD COLUMN "calendarLastSyncError" TEXT;
