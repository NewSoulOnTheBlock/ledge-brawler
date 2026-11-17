// Plays the running game (http://localhost:5199) with a pretend controller: through the main menu and the fighter
// select into a fight, a few blows, the move list and back. Says what each press did.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.addInitScript(() => {
  window.__pad = { buttons: Array.from({ length: 16 }, () => false), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [{ connected: true, id: "pretend", index: 0, mapping: "standard", axes: window.__pad.axes, buttons: window.__pad.buttons.map((pressed) => ({ pressed, touched: pressed, value: pressed ? 1 : 0 })) }];
  window.__sounds = []; const Real = window.Audio;
  window.Audio = function (src) { const a = new Real(src), play = a.play.bind(a); a.play = () => { window.__sounds.push(String(src).split("/").pop().split(".")[0].replace(/-.*/, "")); return play(); }; return a; };
});
const press = async (n, ms = 90) => { await page.evaluate((n) => { window.__pad.buttons[n] = true; }, n); await page.waitForTimeout(ms); await page.evaluate((n) => { window.__pad.buttons[n] = false; }, n); await page.waitForTimeout(120); };
const stick = async (x, y, ms) => { await page.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]); await page.waitForTimeout(ms); await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; }); await page.waitForTimeout(120); };
const focused = () => page.evaluate(() => document.activeElement?.innerText?.trim().slice(0, 20) ?? "");
const out = {};
await page.goto("http://localhost:5199/"); await page.waitForTimeout(1500);
const seen = [];
for (let i = 0; i < 12 && (await focused()).toUpperCase() !== "SURVIVAL"; i++) { await stick(1, 0, 100); seen.push(await focused()); }
out.menuFocusWalk = seen.join(" > ");
await press(0); await page.waitForTimeout(600);
out.afterAOnSurvival = await page.getByRole("heading", { name: /Choose your fighter/i }).isVisible().catch(() => false) ? "fighter select" : "something else";
const name = () => page.locator("h2, h3").filter({ hasText: /./ }).allInnerTexts().then((t) => t.join("|").slice(0, 80));
const before = await page.locator("body").innerText();
await stick(1, 0, 100); await page.waitForTimeout(200);
out.selectChanged = (await page.locator("body").innerText()) !== before;
await press(0); await page.waitForTimeout(3200);
out.fightStarted = await page.getByRole("meter", { name: "HP" }).isVisible().catch(() => false);
await page.evaluate(() => { window.__sounds.length = 0; });
await press(2); await page.waitForTimeout(500); await press(3); await page.waitForTimeout(500); await press(0); await page.waitForTimeout(400);
await stick(1, 0, 700);
out.soundsFromXAndY = (await page.evaluate(() => window.__sounds.slice())).join(" ");
await press(9); await page.waitForTimeout(500);
out.startOpensMoveList = await page.getByRole("heading", { name: /move list/i }).isVisible().catch(() => false);
await press(1); await page.waitForTimeout(500);
out.bClosesIt = !(await page.getByRole("heading", { name: /move list/i }).isVisible().catch(() => false));
out.errors = errors;
console.log(JSON.stringify(out, null, 1));
await browser.close();
