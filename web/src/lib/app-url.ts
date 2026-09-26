const VERCEL_APP_URL = "https://seo-machine-api-lyart.vercel.app";

export function appUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (import.meta.env.MODE === "vercel") return normalizedPath;

  const appOrigin = (import.meta.env.VITE_APP_URL ?? VERCEL_APP_URL).replace(
    /\/+$/,
    "",
  );
  return new URL(normalizedPath, `${appOrigin}/`).href;
}