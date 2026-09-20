const APP_URL = (
  import.meta.env.VITE_APP_URL ?? "https://app.seomachine.ir"
).replace(/\/+$/, "");

export function appUrl(path: string): string {
  return new URL(path, `${APP_URL}/`).href;
}
