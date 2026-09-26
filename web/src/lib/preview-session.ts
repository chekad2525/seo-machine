export const PREVIEW_SESSION_KEY = "seo-machine-preview-session";
export const PREVIEW_RANKINGS_KEY = "seo-machine-preview-rankings";
export type PreviewSession = { name: string; email: string };
export type PreviewRanking = { id: string; keyword: string; domain: string; country: string; position: number };
export function savePreviewSession(session: PreviewSession) {
  localStorage.setItem(PREVIEW_SESSION_KEY, JSON.stringify(session));
}
export function loadPreviewSession(): PreviewSession | null {
  const raw = localStorage.getItem(PREVIEW_SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PreviewSession; }
  catch { localStorage.removeItem(PREVIEW_SESSION_KEY); return null; }
}