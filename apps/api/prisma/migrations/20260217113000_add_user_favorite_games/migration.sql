CREATE TABLE IF NOT EXISTS "UserFavoriteGame" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserFavoriteGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserFavoriteGame_userId_gameId_key"
  ON "UserFavoriteGame"("userId", "gameId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserFavoriteGame_userId_position_key"
  ON "UserFavoriteGame"("userId", "position");

CREATE INDEX IF NOT EXISTS "UserFavoriteGame_userId_position_idx"
  ON "UserFavoriteGame"("userId", "position");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserFavoriteGame_userId_fkey'
  ) THEN
    ALTER TABLE "UserFavoriteGame"
      ADD CONSTRAINT "UserFavoriteGame_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserFavoriteGame_gameId_fkey'
  ) THEN
    ALTER TABLE "UserFavoriteGame"
      ADD CONSTRAINT "UserFavoriteGame_gameId_fkey"
      FOREIGN KEY ("gameId") REFERENCES "Game"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;