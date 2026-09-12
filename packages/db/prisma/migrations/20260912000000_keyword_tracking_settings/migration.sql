CREATE TABLE "KeywordTrackingSetting" (
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

CREATE UNIQUE INDEX "KeywordTrackingSetting_projectId_key"
  ON "KeywordTrackingSetting"("projectId");

ALTER TABLE "KeywordTrackingSetting"
  ADD CONSTRAINT "KeywordTrackingSetting_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
