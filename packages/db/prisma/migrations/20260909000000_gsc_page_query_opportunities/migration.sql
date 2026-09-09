CREATE TABLE "SearchConsoleOpportunityMetric" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "query" TEXT NOT NULL,
  "page" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL,
  "impressions" INTEGER NOT NULL,
  "ctr" DOUBLE PRECISION NOT NULL,
  "position" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchConsoleOpportunityMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchConsoleOpportunityMetric_connectionId_date_query_page_key"
  ON "SearchConsoleOpportunityMetric"("connectionId", "date", "query", "page");
CREATE INDEX "SearchConsoleOpportunityMetric_connectionId_date_idx"
  ON "SearchConsoleOpportunityMetric"("connectionId", "date");
ALTER TABLE "SearchConsoleOpportunityMetric"
  ADD CONSTRAINT "SearchConsoleOpportunityMetric_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "SearchConsoleConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
