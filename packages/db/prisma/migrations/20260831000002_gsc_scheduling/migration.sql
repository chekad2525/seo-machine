ALTER TABLE "SearchConsoleConnection"
  ADD COLUMN "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "syncLeaseId" TEXT,
  ADD COLUMN "syncLeaseUntil" TIMESTAMP(3);

CREATE INDEX "SearchConsoleConnection_status_nextSyncAt_idx"
  ON "SearchConsoleConnection"("status", "nextSyncAt");
