-- CreateTable
CREATE TABLE "GameDescriptionTranslation" (
    "id" TEXT NOT NULL,
    "rawgId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "descriptionText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameDescriptionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameDescriptionTranslation_rawgId_idx" ON "GameDescriptionTranslation"("rawgId");

-- CreateIndex
CREATE UNIQUE INDEX "GameDescriptionTranslation_rawgId_lang_key" ON "GameDescriptionTranslation"("rawgId", "lang");
