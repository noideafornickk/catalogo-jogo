ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ModerationStrike" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "issuedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "ModerationStrike_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModerationStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ModerationStrike_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ModerationStrike_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ModerationStrike_reviewId_key"
ON "ModerationStrike"("reviewId");

CREATE INDEX IF NOT EXISTS "ModerationStrike_userId_revokedAt_idx"
ON "ModerationStrike"("userId", "revokedAt");

CREATE INDEX IF NOT EXISTS "ModerationStrike_issuedByUserId_idx"
ON "ModerationStrike"("issuedByUserId");
