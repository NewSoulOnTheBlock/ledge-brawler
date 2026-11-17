// Drives the running game (http://localhost:5199) through title, select and a short fight, and saves what it looks like.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5199/");
await page.getByRole("button", { name: "Survival" }).waitFor();
await page.waitForTimeout(800);
await page.screenshot({ path: out + "01-title.png" });
await page.getByRole("button", { name: "Survival" }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: out + "02-select.png" });
await page.keyboard.press("Enter");
await page.waitForTimeout(3500);
await page.screenshot({ path: out + "03-wave1.png" });
for (const k of ["KeyJ", "KeyJ", "KeyJ"]) { await page.keyboard.press(k); await page.waitForTimeout(160); }
await page.screenshot({ path: out + "04-combo.png" });
await page.keyboard.down("KeyU"); await page.waitForTimeout(2600); await page.screenshot({ path: out + "05-overdrive.png" }); await page.keyboard.up("KeyU");
await page.keyboard.press("Digit1"); await page.waitForTimeout(1100);
await page.screenshot({ path: out + "06-special.png" });
await page.keyboard.press("KeyH"); await page.waitForTimeout(400);
await page.screenshot({ path: out + "07-moves.png" });
console.log(JSON.stringify({ errors, hud: await page.locator("header").first().innerText().catch(() => "") }));
await browser.close();
