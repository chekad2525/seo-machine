import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";
import { leanWorkerBundle } from "./vite-plugin-lean-worker-bundle";

export default defineConfig(({ mode }) => {
  const isVercel = mode === "vercel" || process.env.VERCEL === "1";
  const env = loadEnv(mode, process.cwd(), "");
  const port = process.env.PORT
    ? Number(process.env.PORT)
    : env.PORT
      ? Number(env.PORT)
      : 3001;
  const showDevtools = env.VITE_SHOW_DEVTOOLS !== "false";
  const allowedHosts = [
    env.ALLOWED_HOST,
    env.BETTER_AUTH_URL ? new URL(env.BETTER_AUTH_URL).hostname : undefined,
  ].filter((host): host is string => Boolean(host));
  const emitSourcemaps = env.POSTHOG_SOURCEMAPS === "true";

  return {
    // Vercel always serves the hosted sign-in UI; the server still validates
    // its own AUTH_MODE and secret configuration at request time.
    define: isVercel
      ? {
          "import.meta.env.AUTH_MODE": JSON.stringify("hosted"),
          "import.meta.env.VITE_GOOGLE_ONLY": "true",
          "import.meta.env.VITE_RANK_METRICS_AVAILABLE": "false",
        }
      : undefined,
    resolve: isVercel
      ? {
          alias: {
            "cloudflare:workers": fileURLToPath(
              new URL("./src/server/vercel/workers-compat.ts", import.meta.url),
            ),
            "cloudflare:workflows": fileURLToPath(
              new URL(
                "./src/server/vercel/workflows-compat.ts",
                import.meta.url,
              ),
            ),
          },
        }
      : undefined,
    envPrefix: [
      "VITE_",
      "AUTH_MODE",
      "BYPASS_EMAIL_VERIFICATION",
      "POSTHOG_PUBLIC_KEY",
      "POSTHOG_HOST",
      "TURNSTILE_SITE_KEY",
    ],
    server: {
      allowedHosts,
      port,
    },
    preview: {
      allowedHosts,
      port,
    },
    build: {
      sourcemap: emitSourcemaps,
      outDir: emitSourcemaps ? "dist-sourcemaps" : "dist",
    },
    plugins: [
      isVercel ? null : leanWorkerBundle(),
      showDevtools
        ? devtools({
            consolePiping: {
              enabled: true,
              levels: ["log", "warn", "error", "info", "debug"],
            },
          })
        : null,
      isVercel
        ? nitro({ preset: "vercel" })
        : cloudflare({
            inspectorPort: false,
            viteEnvironment: { name: "ssr" },
            // The site-audit aux worker builds to dist/open_seo_audit/ and runs
            // beside the main worker in dev and preview, with the app's
            // cross-script SITE_AUDIT_WORKFLOW / AUDIT_SCRATCHPAD bindings
            // resolved against it.
            auxiliaryWorkers: [{ configPath: "./wrangler.audit.jsonc" }],
          }),
      tsConfigPaths(),
      tanstackStart(
        isVercel ? { server: { entry: "./src/server.vercel.ts" } } : undefined,
      ),
      viteReact(),
      tailwindcss(),
    ],
  };
});
