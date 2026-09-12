DROP INDEX "SearchConsoleConnection_projectId_property_key";

CREATE UNIQUE INDEX "SearchConsoleConnection_projectId_userId_property_key"
  ON "SearchConsoleConnection"("projectId", "userId", "property");
