import { existsSync, readFileSync } from "node:fs";

const file = ".env.seomachine";
if (!existsSync(file)) {
  console.error(
    `Create ${file} from .env.seomachine.example before deploying.`,
  );
  process.exit(1);
}

const values = Object.fromEntries(
  readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^(["'])(.*)\1$/, "$2")]),
);

const required = [
  "BETTER_AUTH_SECRET",
  "DATAFORSEO_API_KEY",
  "SERPAPI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LOOPS_API_KEY",
  "LOOPS_TRANSACTIONAL_VERIFY_EMAIL_ID",
  "LOOPS_TRANSACTIONAL_RESET_PASSWORD_ID",
  "LOOPS_TRANSACTIONAL_INVITATION_ID",
  "AUTUMN_SECRET_KEY",
  "AUTUMN_WEBHOOK_SECRET",
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "VITE_SUPPORT_EMAIL",
];
const missing = required.filter((name) => !values[name]);
if (missing.length > 0) {
  console.error(`Missing required values in ${file}: ${missing.join(", ")}`);
  process.exit(1);
}

if (values.BETTER_AUTH_SECRET.length < 32) {
  console.error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  process.exit(1);
}

if (values.BYPASS_EMAIL_VERIFICATION === "true") {
  console.error("Public signup cannot bypass email verification.");
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.VITE_SUPPORT_EMAIL)) {
  console.error("VITE_SUPPORT_EMAIL must be a valid support email address.");
  process.exit(1);
}

const webFile = "web/.env.seomachine";
if (!existsSync(webFile)) {
  console.error(`Create ${webFile} from web/.env.seomachine.example before deploying.`);
  process.exit(1);
}
const webValues = Object.fromEntries(
  readFileSync(webFile, "utf8")
    .split(/\r?\n/)
    .map((line) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^(["'])(.*)\1$/, "$2")]),
);
if (
  webValues.VITE_SITE_URL !== "https://seomachine.ir" ||
  webValues.VITE_APP_URL !== "https://app.seomachine.ir" ||
  webValues.VITE_TURNSTILE_SITE_KEY !== values.TURNSTILE_SITE_KEY ||
  webValues.VITE_SUPPORT_EMAIL !== values.VITE_SUPPORT_EMAIL
) {
  console.error(`${webFile} must match the SEO Machine domains, Turnstile site key, and support email in ${file}.`);
  process.exit(1);
}

if (
  values.AUTH_MODE !== "hosted" ||
  values.DATABASE_PROVIDER !== "d1" ||
  values.BETTER_AUTH_URL !== "https://app.seomachine.ir"
) {
  console.error(
    `${file} must set AUTH_MODE=hosted, DATABASE_PROVIDER=d1, and BETTER_AUTH_URL=https://app.seomachine.ir.`,
  );
  process.exit(1);
}

for (const legalFile of [
  "web/content/legal/terms-and-conditions.md",
  "web/content/legal/privacy.md",
]) {
  const legalText = readFileSync(legalFile, "utf8");
  if (/Every App, Inc|ben@openseo\.so|https:\/\/openseo\.so/i.test(legalText)) {
    console.error(
      `${legalFile} still contains OpenSEO's operator details. Replace and approve the SEO Machine legal text before public deployment.`,
    );
    process.exit(1);
  }
}
