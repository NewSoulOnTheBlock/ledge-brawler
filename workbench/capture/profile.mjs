// Profiles the running game (http://localhost:5199) for a few seconds of a fight of waves and says where the time
// went: the functions with the most time of their own, and how long frames took. The browser it runs in has no
// graphics card, so drawing costs more here than on a player's machine; the order of things is what to read.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5199/"); await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Survival" }).click(); await page.waitForTimeout(500);
await page.keyboard.press("Enter"); await page.waitForTimeout(3000);
const cdp = await page.context().newCDPSession(page);
await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 500 }); await cdp.send("Profiler.start");
await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = (now) => { window.__frames.push(now - last); last = now; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
for (let i = 0; i < 20; i++) { await page.keyboard.press(i % 4 === 3 ? "KeyK" : "KeyJ"); await page.keyboard.down(i % 6 < 3 ? "KeyD" : "KeyA"); await page.waitForTimeout(240); await page.keyboard.up("KeyD"); await page.keyboard.up("KeyA"); }
const { profile } = await cdp.send("Profiler.stop");
const frames = (await page.evaluate(() => window.__frames.slice(5))).sort((a, b) => a - b);
const self = new Map(), total = profile.endTime - profile.startTime;
const dt = profile.timeDeltas, byId = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id), key = `${n.callFrame.functionName || "(anonymous)"} ${n.callFrame.url.split("/").pop().split("?")[0]}:${n.callFrame.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + dt[i]); });
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / total * 100).toFixed(1)}%  ${k}`);
console.log(JSON.stringify({ frames: frames.length, medianMs: +frames[Math.floor(frames.length / 2)].toFixed(1), p95Ms: +frames[Math.floor(frames.length * 0.95)].toFixed(1), over33ms: frames.filter((f) => f > 33).length }));
console.log(top.join("\n"));
await browser.close();
