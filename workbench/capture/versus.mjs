// Two browsers in Versus on the running game (http://localhost:5199, or the address given), with the arena server
// running beside it (apps/app/arena/README.md): both press Versus and Quick match, and the arena should seat them at one
// table without a link, begin a round for both, and land a blow from one on the other. Saves what each sees.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const base = process.argv[2] ?? "http://localhost:5199/";
const browser = await chromium.launch();
const errors = [];
async function open(url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" || m.text().startsWith("versus:")) errors.push(m.text()); });
  await page.goto(url);
  return page;
}
const roster = (page) => page.getByRole("complementary", { name: "Versus" }).innerText();
/** Versus, Casual, a fighter, and the quick match the fighter select offers first. */
async function quick(page, right) {
  await page.getByRole("button", { name: "Versus" }).click();
  await page.getByRole("button", { name: /^Casual/i }).click();
  for (let i = 0; i < right; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
}
const a = await open(base), b = await open(base);
await quick(a, 1);
await a.waitForTimeout(1000);
await quick(b, 2);
// Matched, the round counted down and begun.
await a.waitForTimeout(6000);
const table = (text) => text.match(/table (\w+)/i)?.[1] ?? null;
console.log("A sees:", JSON.stringify(await roster(a)));
console.log("B sees:", JSON.stringify(await roster(b)));
const hp = (page) => page.getByRole("meter", { name: "HP" }).getAttribute("aria-valuenow");
const before = [await hp(a), await hp(b)];
for (let round = 0; round < 40; round++) {
  for (const [page, key] of [[a, "KeyJ"], [b, "KeyK"]]) await page.keyboard.press(key);
  await a.keyboard.down(round % 8 < 4 ? "KeyD" : "KeyA"); await b.keyboard.down(round % 8 < 4 ? "KeyA" : "KeyD");
  await a.waitForTimeout(180);
  for (const page of [a, b]) for (const key of ["KeyA", "KeyD"]) await page.keyboard.up(key);
}
// What one player's specials and Overdrive look like to the other: A charges to the full, then lets each special go,
// and B's screen is saved while each is under way.
await a.keyboard.down("KeyU"); await a.waitForTimeout(6000); await a.keyboard.up("KeyU");
await b.screenshot({ path: out + "versus-b-overdrive.png" });
for (const slot of [1, 2, 3]) {
  await a.keyboard.press("Digit" + slot); await a.waitForTimeout(350);
  await a.screenshot({ path: out + `versus-a-special-${slot}.png` }); await b.screenshot({ path: out + `versus-b-special-${slot}.png` });
  await a.waitForTimeout(2500);
}
await a.screenshot({ path: out + "versus-a.png" }); await b.screenshot({ path: out + "versus-b.png" });
const names = (text) => text.split("\n").filter((line) => /-\d{3}/.test(line)).length;
const [ra, rb] = [await roster(a), await roster(b)];
console.log(JSON.stringify({ sameTable: table(ra) !== null && table(ra) === table(rb), together: names(ra) === 2 && names(rb) === 2, before, after: [await hp(a), await hp(b)], errors }));
await browser.close();
