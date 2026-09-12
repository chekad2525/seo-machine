CREATE TABLE "KeywordRankSnapshot" (
  "id" TEXT NOT NULL,
  "trackedKeywordId" TEXT NOT NULL,
  "checkDate" DATE NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'dataforseo',
  "device" TEXT NOT NULL,
  "locationCode" INTEGER NOT NULL,
  "rankAbsolute" INTEGER,
  "rankGroup" INTEGER,
  "resultUrl" TEXT,
  "serpFeatures" TEXT[] NOT NULL,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KeywordRankSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KeywordSerpTask" (
  "id" TEXT NOT NULL,
  "trackedKeywordId" TEXT NOT NULL,
  "externalTaskId" TEXT NOT NULL,
  "checkDate" DATE NOT NULL,
  "device" TEXT NOT NULL,
  "locationCode" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "KeywordSerpTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KeywordRankSnapshot_trackedKeywordId_checkDate_device_locationCode_key" ON "KeywordRankSnapshot"("trackedKeywordId", "checkDate", "device", "locationCode");
CREATE INDEX "KeywordRankSnapshot_trackedKeywordId_checkedAt_idx" ON "KeywordRankSnapshot"("trackedKeywordId", "checkedAt");
CREATE UNIQUE INDEX "KeywordSerpTask_externalTaskId_key" ON "KeywordSerpTask"("externalTaskId");
CREATE UNIQUE INDEX "KeywordSerpTask_trackedKeywordId_checkDate_device_locationCode_key" ON "KeywordSerpTask"("trackedKeywordId", "checkDate", "device", "locationCode");
CREATE INDEX "KeywordSerpTask_status_requestedAt_idx" ON "KeywordSerpTask"("status", "requestedAt");

ALTER TABLE "KeywordRankSnapshot" ADD CONSTRAINT "KeywordRankSnapshot_trackedKeywordId_fkey" FOREIGN KEY ("trackedKeywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KeywordSerpTask" ADD CONSTRAINT "KeywordSerpTask_trackedKeywordId_fkey" FOREIGN KEY ("trackedKeywordId") REFERENCES "TrackedKeyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
