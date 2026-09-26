import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { withPgClient } from "@/db";

const startHandler = createStartHandler(defaultStreamHandler);

// The original routes and server functions run here; only the Cloudflare
// Worker entrypoint is replaced for the Vercel deployment.
export default {
  fetch(request: Request): Promise<Response> {
    return withPgClient(async () => {
      const response = await startHandler(request);
      if (
        !response.headers.get("content-type")?.startsWith("text/html") ||
        response.headers.has("content-security-policy")
      ) {
        return response;
      }
      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", "frame-ancestors 'self'");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });
  },
};
