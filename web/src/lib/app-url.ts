// The Vercel deployment is currently the public preview for a locally run app.
// Keep production pointed at the real app domain, while making preview buttons
// open the local app for end-to-end testing on the same computer.
const APP_URL = (
  import.meta.env.MODE === "vercel"
    ? "http://localhost:3001"
    : (import.meta.env.VITE_APP_URL ?? "https://app.seomachine.ir")
).replace(/\/+$/, "");

export function appUrl(path: string): string {
  return new URL(path, `${APP_URL}/`).href;
}
