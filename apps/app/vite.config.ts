import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vibelang from "vibelang-vite";
import { type Plugin, defineConfig } from "vite";

const stubs = new URL("src/stubs/", import.meta.url).pathname;

/**
 * The service worker that makes the game installable and playable offline (public/manifest.webmanifest). Written at
 * build time, because it must know the names the build gave the files: what the home screen needs is kept as it is
 * installed; everything else the first time it is used. A new build has a new name for its store, and the old one is
 * thrown away.
 */
function offline(): Plugin {
  return {
    name: "five-blades-offline",
    apply: "build",
    generateBundle(_, bundle) {
      const files = Object.values(bundle);
      const entry = files.find((file) => file.type === "chunk" && file.isEntry);
      const core = new Set<string>(["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/fonts/seven-swordsmen.woff2", "/fonts/lexend.woff2"]);
      // The first script, what it imports before it runs, its styles, and the faces and picture the home screen shows.
      const add = (name: string) => {
        const file = bundle[name];
        if (!file || core.has(`/${name}`)) return;
        core.add(`/${name}`);
        if (file.type === "chunk") file.imports.forEach(add);
      };
      if (entry) add(entry.fileName);
      for (const file of files) if (/\.css$|(home(-tiny)?|logo)-.*\.webp$/.test(file.fileName)) core.add(`/${file.fileName}`);
      const version = entry?.fileName.replace(/^.*-|\.js$/g, "") ?? String(Date.now());
      this.emitFile({ type: "asset", fileName: "sw.js", source: worker(version, [...core]) });
    },
  };
}

/** The worker itself: plain script, run by the browser apart from the page. */
const worker = (version: string, core: string[]) => `// Five Blades' service worker, written by vite.config.ts at build time.
const STORE = "five-blades-${version}", CORE = ${JSON.stringify(core)};
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STORE).then((store) => store.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("five-blades-") && name !== STORE).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request, url = new URL(request.url);
  // Only this site's own files: never the leaderboard, sign-in, the multiplayer relay or anything sent.
  if (request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // The page: fresh when there is a connection, so that a new version is seen at once; the kept one without.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(STORE).then((store) => store.put("/", copy)); return response; }).catch(() => caches.match("/")));
    return;
  }
  // Everything else is named by its contents and never changes: kept the first time, and from then on read from the store.
  event.respondWith(caches.match(request).then((kept) => kept ?? fetch(request).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(STORE).then((store) => store.put(request, copy)); }
    return response;
  })));
});
`;

/** Privy's Solana programs, which its main module imports and the game (paying on Robinhood Chain) never calls, stood in
 *  for by src/stubs/: for the build and the tests alike. */
export const solanaStubs: Plugin = {
  name: "five-blades-solana-stubs",
  config: () => ({
    resolve: {
      alias: {
        "@solana/kit/program-client-core": stubs + "solana-kit-program-client-core.ts",
        "@solana-program/system": stubs + "solana-program-system.ts",
        "@solana-program/token": stubs + "solana-program-token.ts",
        "@solana-program/memo": stubs + "solana-program-memo.ts",
      },
    },
  }),
};

export default defineConfig({ plugins: [vibelang(), react(), tailwindcss(), offline(), solanaStubs] });
