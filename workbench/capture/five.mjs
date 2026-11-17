// Five browsers in one Versus room of the running game (http://localhost:5199, or the address given), then a sixth:
// the five should each see all five, and the sixth should be told the room is full. Saves what the first sees.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const url = (process.argv[2] ?? "http://localhost:5199/") + "?room=five" + Math.random().toString(36).slice(2, 7);
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
const roster = (page) => page.getByRole("complementary", { name: "Versus" }).innerText();
const names = (text) => text.split("\n").filter((line) => /-\d{3}/.test(line)).length;
const pages = [];
for (let i = 0; i < 5; i++) pages.push(await open(i));
await pages[0].waitForTimeout(3000);
const seen = []; for (const page of pages) seen.push(names(await roster(page)));
// Everyone swings and wanders for a while.
for (let round = 0; round < 24; round++) {
  for (const [i, page] of pages.entries()) { await page.keyboard.press(i % 2 ? "KeyK" : "KeyJ"); await page.keyboard.down((round + i) % 6 < 3 ? "KeyD" : "KeyA"); }
  await pages[0].waitForTimeout(200);
  for (const page of pages) for (const key of ["KeyA", "KeyD"]) await page.keyboard.up(key);
}
await pages[0].screenshot({ path: out + "five.png" });
const sixth = await open(0);
await sixth.waitForTimeout(1500);
const told = await roster(sixth);
console.log(JSON.stringify({ eachSees: seen, sixthTold: /already has five/.test(told), sixthSees: names(told), stillFive: names(await roster(pages[0])), errors }));
await browser.close();
