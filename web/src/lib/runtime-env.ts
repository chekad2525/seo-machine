export type RuntimeEnv = Record<string, unknown>;

export async function getRuntimeEnv(): Promise<RuntimeEnv> {
  if (process.env.VERCEL === "1") return process.env;

  try {
    const cloudflareModule = "cloudflare:workers";
    const workers = (await import(/* @vite-ignore */ cloudflareModule)) as {
      env?: RuntimeEnv;
    };
    return workers.env ?? process.env;
  } catch {
    return process.env;
  }
}
