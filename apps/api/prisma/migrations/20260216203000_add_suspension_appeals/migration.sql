DO $$
BEGIN
  CREATE TYPE "SuspensionAppealStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SuspensionAppeal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT,
  "status" "SuspensionAppealStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,

  CONSTRAINT "SuspensionAppeal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SuspensionAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SuspensionAppeal_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SuspensionAppeal_status_createdAt_idx"
ON "SuspensionAppeal"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "SuspensionAppeal_userId_status_idx"
ON "SuspensionAppeal"("userId", "status");
