// Takes a picture of the running game (http://localhost:5199) in a state named by the first argument, into
// shots/latest/<second argument>.png: "survival" (a fight of waves a few seconds in), "level" (the first campaign
// level, after the Reaper), "title". Reports page errors.
import { chromium } from "playwright";
const [state, name] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto("http://localhost:5199/"); await page.waitForTimeout(1200);
if (state === "survival") {
  await page.getByRole("button", { name: "Survival" }).click(); await page.waitForTimeout(500);
  await page.keyboard.press("Enter"); await page.waitForTimeout(3500);
  for (const key of ["KeyJ", "KeyK", "KeyJ"]) { await page.keyboard.press(key); await page.waitForTimeout(300); }
} else if (state === "level") {
  await page.getByRole("button", { name: "Campaign" }).click(); await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Play", exact: true }).first().click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("meter", { name: "HP" }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Skip" }).click().catch(() => {});
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: `shots/latest/${name}.png` });
console.log(JSON.stringify({ state, errors }));
await browser.close();
