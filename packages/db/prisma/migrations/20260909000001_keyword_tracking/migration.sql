CREATE TABLE "TrackedKeyword" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "targetPage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackedKeyword_projectId_userId_query_key"
  ON "TrackedKeyword"("projectId", "userId", "query");
CREATE INDEX "TrackedKeyword_projectId_userId_idx"
  ON "TrackedKeyword"("projectId", "userId");

ALTER TABLE "TrackedKeyword"
  ADD CONSTRAINT "TrackedKeyword_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackedKeyword"
  ADD CONSTRAINT "TrackedKeyword_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
