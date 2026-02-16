DO $$
BEGIN
  CREATE TYPE "ReviewVisibilityStatus" AS ENUM ('ACTIVE', 'HIDDEN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReportReason" AS ENUM ('OFFENSIVE', 'HATE', 'SPAM', 'SEXUAL', 'PERSONAL_DATA', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "visibilityStatus" "ReviewVisibilityStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "hiddenReason" TEXT;

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "hiddenByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Review_hiddenByUserId_fkey'
  ) THEN
    ALTER TABLE "Review"
    ADD CONSTRAINT "Review_hiddenByUserId_fkey"
    FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Review_visibilityStatus_createdAt_idx"
ON "Review"("visibilityStatus", "createdAt");

CREATE TABLE IF NOT EXISTS "ReviewReport" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "reason" "ReportReason" NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,

  CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReviewReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReviewReport_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ReviewReport_status_createdAt_idx"
ON "ReviewReport"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ReviewReport_reviewId_status_idx"
ON "ReviewReport"("reviewId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewReport_reviewId_reporterUserId_status_key"
ON "ReviewReport"("reviewId", "reporterUserId", "status");
