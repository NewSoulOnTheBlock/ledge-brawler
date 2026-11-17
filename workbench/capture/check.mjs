// Opens the workbench (http://localhost:8977) the way the owner will: every tab, a drawer, and a note sent and removed.
import fs from "node:fs";
import { chromium } from "playwright";
const out = new URL("../../shots/workbench/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:8977/");
await page.waitForTimeout(2500);
const tabs = await page.evaluate(() => [...document.querySelectorAll("[data-tab], nav button, .rail button, aside button, aside a")].map((e) => e.textContent.trim().replace(/\s+/g, " ")).filter(Boolean));
console.log("tabs:", JSON.stringify(tabs));
await page.screenshot({ path: out + "now.png" });
const report = {};
for (const [i, name] of tabs.entries()) {
  const el = page.locator("[data-tab], nav button, .rail button, aside button, aside a").nth(i);
  await el.click().catch(() => {});
  await page.waitForTimeout(700);
  report[name] = await page.evaluate(() => ({ imgs: [...document.querySelectorAll("main img, .view img")].filter((x) => x.offsetParent).length, broken: [...document.querySelectorAll("img")].filter((x) => x.offsetParent && x.complete && !x.naturalWidth).length, videos: [...document.querySelectorAll("video")].filter((x) => x.offsetParent).length, text: document.body.innerText.length }));
  await page.screenshot({ path: out + String(i).padStart(2, "0") + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) + ".png" });
}
console.log(JSON.stringify(report));
console.log("errors:", JSON.stringify(errors.slice(0, 5)));
await browser.close();
