import { waitUntil } from "@vercel/functions";

// Preserve the Worker environment variable API while routes migrate to Vercel.
// Resource bindings are intentionally absent: callers must use a Vercel-backed
// implementation before those features can be enabled.
export const env = process.env;
export { waitUntil };

export class WorkflowEntrypoint {
  constructor(..._args: unknown[]) {
    throw new Error("Cloudflare Workflows require a Vercel implementation");
  }
}

export class DurableObject {
  constructor(..._args: unknown[]) {
    throw new Error(
      "Cloudflare Durable Objects require a Vercel implementation",
    );
  }
}

export class WorkerEntrypoint {
  constructor(..._args: unknown[]) {
    throw new Error(
      "Cloudflare Worker entrypoints require a Vercel implementation",
    );
  }
}
