CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TABLE "users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memberships" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspaces" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "domain" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "country" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "memberships_userId_organizationId_key" ON "memberships"("userId","organizationId");
CREATE INDEX "memberships_organizationId_idx" ON "memberships"("organizationId");
CREATE UNIQUE INDEX "workspaces_organizationId_slug_key" ON "workspaces"("organizationId","slug");
CREATE INDEX "workspaces_organizationId_idx" ON "workspaces"("organizationId");
CREATE UNIQUE INDEX "projects_workspaceId_slug_key" ON "projects"("workspaceId","slug");
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");
CREATE INDEX "projects_domain_idx" ON "projects"("domain");

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memberships"
  ADD CONSTRAINT "memberships_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspaces"
  ADD CONSTRAINT "workspaces_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
