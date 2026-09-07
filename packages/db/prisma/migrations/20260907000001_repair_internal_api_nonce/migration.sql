CREATE TABLE IF NOT EXISTS "InternalApiNonce" (
  "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InternalApiNonce_pkey" PRIMARY KEY ("nonce")
);

CREATE INDEX IF NOT EXISTS "InternalApiNonce_expiresAt_idx"
  ON "InternalApiNonce"("expiresAt");
