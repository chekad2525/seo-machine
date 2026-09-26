export function appUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.MODE === "vercel") return normalizedPath;
  const configuredAppUrl = import.meta.env.VITE_APP_URL?.replace(/\/+$/, "");
  return configuredAppUrl
    ? new URL(normalizedPath, `${configuredAppUrl}/`).href
    : normalizedPath;
}