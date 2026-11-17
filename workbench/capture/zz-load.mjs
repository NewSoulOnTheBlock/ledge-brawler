import { chromium } from "playwright";
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const got = []; page.on("response", async (r) => { try { const b = await r.body(); got.push({ url: r.url(), n: b.length }); } catch {} });
const sum = () => { const by = {}; for (const g of got) { const e = (g.url.split("?")[0].match(/\.(\w+)$/) || [, "other"])[1]; by[e] = (by[e] || 0) + g.n; } return Object.entries(by).map(([k, v]) => `${k} ${(v / 1048576).toFixed(2)}MB`).join(", "); };
const t0 = Date.now(); await page.goto("http://localhost:5299/"); await page.getByRole("button", { name: "Campaign" }).waitFor({ timeout: 120000 }); const t = Date.now() - t0; await page.waitForTimeout(1500);
console.log(`title ${t}ms, ${got.length} requests, ${(got.reduce((a, g) => a + g.n, 0) / 1048576).toFixed(2)}MB: ${sum()}`);
await browser.close();
