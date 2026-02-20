DO $$
BEGIN
  CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'ACCEPTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW_REQUEST';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW_ACCEPTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FOLLOW_CREATED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Follow" (
  "id" TEXT NOT NULL,
  "followerUserId" TEXT NOT NULL,
  "followingUserId" TEXT NOT NULL,
  "status" "FollowStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerUserId_followingUserId_key"
  ON "Follow"("followerUserId", "followingUserId");

CREATE INDEX IF NOT EXISTS "Follow_followingUserId_status_idx"
  ON "Follow"("followingUserId", "status");

CREATE INDEX IF NOT EXISTS "Follow_followerUserId_status_idx"
  ON "Follow"("followerUserId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followerUserId_fkey'
  ) THEN
    ALTER TABLE "Follow"
      ADD CONSTRAINT "Follow_followerUserId_fkey"
      FOREIGN KEY ("followerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Follow_followingUserId_fkey'
  ) THEN
    ALTER TABLE "Follow"
      ADD CONSTRAINT "Follow_followingUserId_fkey"
      FOREIGN KEY ("followingUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "followId" TEXT;

CREATE INDEX IF NOT EXISTS "Notification_followId_idx"
  ON "Notification"("followId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_followId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_followId_fkey"
      FOREIGN KEY ("followId") REFERENCES "Follow"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;