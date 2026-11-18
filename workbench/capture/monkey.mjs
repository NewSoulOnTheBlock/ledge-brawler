// Mashes the keys at random for a while in the running game (http://localhost:5199), in a fight of waves and then in
// a campaign level, and reports anything the page complains of: node monkey.mjs [seconds in each, 40 by default].
import { chromium } from "playwright";
const secs = Number(process.argv[2] ?? 40);
const browser = await chromium.launch();
const KEYS = ["KeyA", "KeyD", "KeyW", "KeyS", "Space", "KeyJ", "KeyK", "KeyL", "KeyI", "KeyO", "KeyU", "KeyG", "KeyF", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "KeyT", "KeyR", "ShiftLeft"];
async function mash(page, ms) {
  const until = Date.now() + ms; let presses = 0;
  while (Date.now() < until) {
    const key = KEYS[Math.floor(Math.random() * KEYS.length)], hold = Math.random() < 0.5 ? 40 + Math.random() * 500 : 30;
    await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key); presses++;
    // Anything put up over the fight is answered, so that the mashing goes on: a talk skipped, a bargain refused, a fall tried again.
    if (presses % 12 === 0) for (const name of ["Skip", "Skip the coaching", "Try again", "Give him nothing", "Say nothing.", "Fight", "Resume", "Continue"]) { const b = page.getByRole("button", { name, exact: false }).first(); if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; } }
  }
  return presses;
}
const out = {};
for (const mode of ["survival", "campaign"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  const ours = (text) => !/privy|frame-ancestors|status of 403|Failed to load resource/i.test(text);
  page.on("pageerror", (e) => errors.push("page: " + String(e).slice(0, 220)));
  page.on("console", (m) => { if (m.type() === "error" && ours(m.text())) errors.push("console: " + m.text().slice(0, 220)); });
  await page.goto("http://localhost:5199/"); await page.waitForTimeout(1000);
  if (mode === "survival") { await page.getByRole("button", { name: "Survival" }).click(); await page.waitForTimeout(400); await page.keyboard.press("Enter"); }
  else { await page.getByRole("button", { name: "Campaign" }).click(); await page.getByRole("button", { name: /^Solo/ }).click(); await page.waitForTimeout(400); await page.getByRole("button", { name: "Play", exact: true }).first().click(); await page.getByRole("button", { name: "Skip" }).click(); }
  await page.waitForTimeout(2500);
  const presses = await mash(page, secs * 1000);
  const body = await page.locator("body").innerText().catch(() => "");
  out[mode] = { presses, broke: /something broke/i.test(body), stillPlaying: await page.getByRole("meter", { name: "HP" }).isVisible().catch(() => false), errors: [...new Set(errors)].slice(0, 5) };
  await page.screenshot({ path: `shots/latest/monkey-${mode}.png` });
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
