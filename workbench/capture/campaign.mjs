// Plays the first level of a campaign (node campaign.mjs "The Hollow"; The Forbidden by default) of the running game
// (http://localhost:5199) with the keyboard, as a player would,
// and saves what it looks like along the way. Says whether the way out was reached.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const who = process.argv[2] ?? "The Forbidden", tag = who.split(" ").pop().toLowerCase();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5199/");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole("button", { name: "Campaign" }).click();
await page.getByRole("tab", { name: who }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}${tag}-10-campaign.png` });
await page.getByRole("button", { name: "Play", exact: true }).first().click();
// The opening, a card at a time, by the key a player would use.
for (let i = 0; i < 14 && (await page.getByRole("region", { name: "Before it begins" }).count()); i++) { await page.keyboard.press("Space"); await page.waitForTimeout(250); }
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}${tag}-11-level-start.png` });
const done = page.getByRole("button", { name: "Continue" });
let cleared = false;
await page.keyboard.down("KeyD"); await page.keyboard.down("ShiftLeft"); await page.keyboard.down("KeyO");
for (let t = 0; t < 300 && !cleared; t++) {
  await page.keyboard.press(t % 3 === 0 ? "Space" : t % 3 === 1 ? "KeyJ" : "KeyK");
  await page.waitForTimeout(170);
  if (t % 25 === 24) await page.screenshot({ path: `${out}${tag}-12-level-${String((t + 1) / 25).padStart(2, "0")}.png` });
  cleared = await done.isVisible();
}
for (const k of ["KeyD", "ShiftLeft", "KeyO"]) await page.keyboard.up(k);
await page.screenshot({ path: `${out}${tag}-13-level-end.png` });
const hud = await page.locator("header").first().innerText().catch(() => "");
if (cleared) { await done.click(); await page.waitForTimeout(600); await page.screenshot({ path: `${out}${tag}-14-after.png` }); }
console.log(JSON.stringify({ cleared, errors, hud: hud.split("\n").slice(4, 9).join(" "), saga: await page.evaluate(() => localStorage.getItem("saga")) }));
await browser.close();
