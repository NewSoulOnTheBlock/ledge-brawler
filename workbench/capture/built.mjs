// Plays the built game at the address given (default the local copy of the build) and reports what it saw.
import { chromium } from "playwright";
const url = process.argv[2] ?? "http://localhost:5198/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], failed = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
page.on("response", (r) => { if (r.status() >= 400) failed.push(r.status() + " " + r.url()); });
await page.goto(url);
await page.getByRole("button", { name: "Survival" }).click(); await page.waitForTimeout(600);
await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter"); await page.waitForTimeout(3200);
for (const k of ["KeyJ", "KeyK", "KeyI", "Digit1"]) { await page.keyboard.press(k); await page.waitForTimeout(350); }
await page.screenshot({ path: new URL("../../shots/built.png", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") });
console.log(JSON.stringify({ url, errors, failed, hud: (await page.locator("header").first().innerText()).split("\n").slice(4, 8) }));
// With a name given as the second argument: walk off the stage to be knocked out, keep the standing under that name, and
// report whether the board then shows it. This writes a real row to the live board.
const name = process.argv[3];
if (name) {
  // Off the edge is the quick way down: enemies leave a fighter who stands still alone for long stretches.
  await page.keyboard.down("KeyA");
  await page.getByText("Knocked out", { exact: true }).waitFor({ timeout: 120000 });
  await page.keyboard.up("KeyA");
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Keep my standing" }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: new URL("../../shots/built-board.png", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") });
  console.log(JSON.stringify({ kept: (await page.locator("body").innerText()).includes(name), errors, failed }));
  await page.getByRole("button", { name: "Try again" }).click(); await page.waitForTimeout(2500);
  console.log(JSON.stringify({ again: await page.getByRole("meter", { name: "HP" }).getAttribute("aria-valuenow") }));
}
await browser.close();
