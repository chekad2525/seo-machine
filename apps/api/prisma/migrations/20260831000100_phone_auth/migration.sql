ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "phone_otp_challenges" (
  "id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID,
  CONSTRAINT "phone_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_otp_challenges_phone_createdAt_idx"
  ON "phone_otp_challenges"("phone", "createdAt");

CREATE INDEX "phone_otp_challenges_expiresAt_idx"
  ON "phone_otp_challenges"("expiresAt");

ALTER TABLE "phone_otp_challenges"
  ADD CONSTRAINT "phone_otp_challenges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
