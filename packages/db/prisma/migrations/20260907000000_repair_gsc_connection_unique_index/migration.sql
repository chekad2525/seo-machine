-- Prisma upserts Search Console grants by project, canonical user, and property.
-- Recreate the exact unique index in case an earlier deployment recorded the
-- migration without leaving the expected database object behind.
DROP INDEX IF EXISTS "SearchConsoleConnection_projectId_property_key";
DROP INDEX IF EXISTS "SearchConsoleConnection_projectId_userId_property_key";

CREATE UNIQUE INDEX "SearchConsoleConnection_projectId_userId_property_key"
  ON "SearchConsoleConnection"("projectId", "userId", "property");
