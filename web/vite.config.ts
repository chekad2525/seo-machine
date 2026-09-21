import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";

const mdxPlugin = mdx(await import("./source.config"));
const transformMdx = mdxPlugin.transform;
if (typeof transformMdx === "function") {
  mdxPlugin.transform = function (code, id, options) {
    // Leave raw prompt files to Vite instead of compiling them as MDX pages.
    if (new URLSearchParams(id.split("?")[1]).has("raw")) return;
    return transformMdx.call(this, code, id, options);
  };
}

export default defineConfig(({ mode }) => {
  const isVercel = mode === "vercel" || process.env.VERCEL === "1";

  return {
    server: {
      port: 4322,
    },
    ssr: {
      resolve: {
        conditions: ["worker", "import", "module", "default"],
      },
    },
    plugins: [
      mdxPlugin,
      tailwindcss(),
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      isVercel
        ? nitro({ preset: "vercel" })
        : cloudflare({
            viteEnvironment: { name: "ssr" },
          }),
      tanstackStart({
        prerender: {
          // The SEO Machine Worker renders routes on request. Its deployment
          // build does not need a local workerd prerender crawl.
          enabled: mode !== "seomachine" && mode !== "vercel",
          filter: ({ path }) => !/\.pdf(?:[?#]|$)/i.test(path),
        },
      }),
      react(),
    ],
  };
});
