-- Internal request replay protection must exist in every deployed database.
-- IF NOT EXISTS makes this safe for databases where the original migration
-- was recorded but the table or its supporting index was not created.
CREATE TABLE IF NOT EXISTS "InternalApiNonce" (
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalApiNonce_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX IF NOT EXISTS "InternalApiNonce_expiresAt_idx"
  ON "InternalApiNonce"("expiresAt");
