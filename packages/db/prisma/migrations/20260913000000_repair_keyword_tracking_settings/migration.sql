-- Repair databases where the original keyword tracking settings migration was
-- recorded without leaving the table behind. Every statement is idempotent.
CREATE TABLE IF NOT EXISTS "KeywordTrackingSetting" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL DEFAULT 'ir',
  "languageCode" TEXT NOT NULL DEFAULT 'fa',
  "locationName" TEXT NOT NULL DEFAULT 'Iran',
  "device" TEXT NOT NULL DEFAULT 'desktop',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KeywordTrackingSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KeywordTrackingSetting_projectId_key"
  ON "KeywordTrackingSetting"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'KeywordTrackingSetting_projectId_fkey'
      AND conrelid = '"KeywordTrackingSetting"'::regclass
  ) THEN
    ALTER TABLE "KeywordTrackingSetting"
      ADD CONSTRAINT "KeywordTrackingSetting_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
