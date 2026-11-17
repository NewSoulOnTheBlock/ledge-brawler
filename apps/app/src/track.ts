// What a player does, sent to the operator's dashboard (server/api/track.js, src/Admin.tsx). A visitor is an anonymous
// id kept in this browser; when signed in, the token goes along and the account is stored beside it. Played from a
// development server, or on the dashboard itself, nothing is sent, so the live numbers are only real players'.
import { authHeaders, SITE } from "./scores.ts";

type Kind = "visit" | "signin" | "survival_start" | "survival_end" | "versus_start" | "versus_end" | "chapter_start" | "chapter_clear" | "game_over" | "ending";

const LOCAL = /^(localhost|127\.|192\.168\.)/.test(location.hostname) || location.pathname.startsWith("/admin");
const player = (() => {
  try {
    const kept = localStorage.getItem("player");
    if (kept) return kept;
    const made = crypto.randomUUID();
    localStorage.setItem("player", made);
    return made;
  } catch { return crypto.randomUUID(); }
})();

let queue: { kind: Kind; data: Record<string, unknown> }[] = [], timer = 0;

async function flush() {
  timer = 0;
  if (queue.length === 0) return;
  const events = queue.splice(0, 40);
  try {
    await fetch(`${SITE}/api/track`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ player, events }) });
  } catch { /* Offline: these few are let go rather than kept. */ }
  if (queue.length) timer = window.setTimeout(flush, 1000);
}

/** Keeps one thing the player did; they are sent a few seconds later, together, or as the page is left. */
export function track(kind: Kind, data: Record<string, unknown> = {}) {
  if (LOCAL) return;
  queue.push({ kind, data });
  if (!timer) timer = window.setTimeout(flush, 4000);
}

addEventListener("pagehide", () => { void flush(); });
track("visit", { device: matchMedia("(pointer: coarse)").matches ? "touch" : "desktop", referrer: document.referrer ? new URL(document.referrer).hostname : null });
