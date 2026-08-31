CREATE TYPE "SearchConsoleSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "SearchConsoleSyncRun" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "status" "SearchConsoleSyncStatus" NOT NULL DEFAULT 'RUNNING',
  "rangeStart" DATE NOT NULL,
  "rangeEnd" DATE NOT NULL,
  "rowsUpserted" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "SearchConsoleSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchConsoleSyncRun_connectionId_startedAt_idx" ON "SearchConsoleSyncRun"("connectionId", "startedAt");

CREATE TABLE "SearchConsoleQueryMetric" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "query" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL,
  "impressions" INTEGER NOT NULL,
  "ctr" DOUBLE PRECISION NOT NULL,
  "position" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchConsoleQueryMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SearchConsoleQueryMetric_connectionId_date_query_key" ON "SearchConsoleQueryMetric"("connectionId", "date", "query");
CREATE INDEX "SearchConsoleQueryMetric_connectionId_date_idx" ON "SearchConsoleQueryMetric"("connectionId", "date");

CREATE TABLE "SearchConsolePageMetric" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "page" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL,
  "impressions" INTEGER NOT NULL,
  "ctr" DOUBLE PRECISION NOT NULL,
  "position" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchConsolePageMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SearchConsolePageMetric_connectionId_date_page_key" ON "SearchConsolePageMetric"("connectionId", "date", "page");
CREATE INDEX "SearchConsolePageMetric_connectionId_date_idx" ON "SearchConsolePageMetric"("connectionId", "date");

ALTER TABLE "SearchConsoleSyncRun" ADD CONSTRAINT "SearchConsoleSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SearchConsoleConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchConsoleQueryMetric" ADD CONSTRAINT "SearchConsoleQueryMetric_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SearchConsoleConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchConsolePageMetric" ADD CONSTRAINT "SearchConsolePageMetric_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "SearchConsoleConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
