// spec/app/lobby.md, "Story: Find a match"; spec/app/bout.md, "Story: Fight for the pot"
// The arena server's sockets (main.vibe starts it): an HTTP server whose `/play` takes WebSockets, each fed to the
// arena (arena.ts), and whose `/health` says it is up. Time passes for the arena every TICK milliseconds.
import { createServer } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import { type Options, createArena } from "./arena.ts";

const TICK = 20;
/** A socket that has not answered a ping in this long is taken to be gone. */
const PING_EVERY = 10_000;

export interface Serving { port: number; close(): Promise<void> }

/** Serves the arena on `port` (0 for any free one) until closed. */
export function serve(port: number, options: Options = {}): Promise<Serving> {
  const arena = createArena(options);
  const http = createServer((req, res) => {
    if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify({ ok: true, ...arena.stats() })); return; }
    res.writeHead(404).end();
  });
  const sockets = new WebSocketServer({ server: http, path: "/play", maxPayload: 16 * 1024 });
  const alive = new WeakSet<WebSocket>();
  sockets.on("connection", (socket) => {
    alive.add(socket);
    socket.on("pong", () => alive.add(socket));
    const connection = arena.connect((said) => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(said)); });
    socket.on("message", (data, binary) => { if (!binary && Buffer.isBuffer(data)) connection.receive(data.toString("utf8")); });
    socket.on("close", () => connection.closed());
    socket.on("error", () => socket.terminate());
  });
  const ticking = setInterval(() => arena.tick(), TICK);
  const pinging = setInterval(() => {
    for (const socket of sockets.clients) { if (!alive.has(socket)) { socket.terminate(); continue; } alive.delete(socket); socket.ping(); }
  }, PING_EVERY);
  return new Promise((resolve) => http.listen(port, () => {
    const address = http.address();
    resolve({
      port: typeof address === "object" && address ? address.port : port,
      close: () => new Promise((done) => {
        clearInterval(ticking); clearInterval(pinging);
        for (const socket of sockets.clients) socket.terminate();
        sockets.close(); http.close(() => done());
      }),
    });
  }));
}
