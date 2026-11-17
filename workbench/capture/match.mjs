// A whole Versus match between two browsers on the running game (http://localhost:5199, or the address given): one
// keeps running off the ledges until its three lives are gone. The other should then be named the winner on both
// screens, and "Fight again" on one should start a new match for both. Saves the winner's screen.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const url = (process.argv[2] ?? "http://localhost:5199/") + "?room=end" + Math.random().toString(36).slice(2, 7);
const browser = await chromium.launch();
const errors = [];
async function open(pick) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url);
  await page.getByRole("heading", { name: /Choose your fighter/i }).waitFor();
  for (let i = 0; i < pick; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  return page;
}
const a = await open(1), b = await open(2);
await a.waitForTimeout(3000);
const over = (page) => page.getByRole("heading", { name: /wins|No one is left/ });
// B runs one way and then the other, off whatever it is standing on, until the match is called.
let side = 0, called = false;
for (let i = 0; i < 260 && !called; i++) {
  const key = side % 2 ? "KeyD" : "KeyA";
  await b.keyboard.down(key); await b.keyboard.down("ShiftLeft");
  await b.waitForTimeout(700);
  await b.keyboard.up(key); await b.keyboard.up("ShiftLeft");
  if (i % 6 === 5) side++;
  called = (await over(a).count()) > 0;
}
await a.waitForTimeout(800);
const [onA, onB] = [await over(a).innerText().catch(() => ""), await over(b).innerText().catch(() => "")];
await a.screenshot({ path: out + "match-over.png" });
// Ten seconds on, it is still over: nothing restarts by itself.
await a.waitForTimeout(6000);
const stays = (await over(a).count()) > 0;
await a.getByRole("button", { name: "Fight again" }).click();
await a.waitForTimeout(4000);
const lives = (page) => page.locator("header").innerText().then((t) => (t.match(/●/g) ?? []).length);
console.log(JSON.stringify({ called, onA, onB, stays, afterAgain: { overA: await over(a).count(), overB: await over(b).count(), livesA: await lives(a), livesB: await lives(b) }, errors }));
await browser.close();
