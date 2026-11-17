// Two browsers in Versus on the running game (http://localhost:5199, or the address given): the first enters the open
// room and makes an invitation; the second opens that link. Both should then be in one room, see each other, and a
// blow from one should cost the other health. Saves what each sees.
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
// The inviter: Versus, a fighter, then the invitation, which moves them out of the open room.
const a = await open(base);
await a.getByRole("button", { name: "Versus" }).click();
// Casual or Pro is asked first (ProEntry.tsx): casual.
await a.getByRole("button", { name: /^Casual/i }).click();
await a.keyboard.press("ArrowRight"); await a.keyboard.press("Enter");
await a.waitForTimeout(2500);
await a.getByRole("button", { name: /private room/ }).click();
const link = await a.getByLabel("Invite link").inputValue();
await a.waitForTimeout(2500);
// The invited: the link alone brings them to the fighter select.
const b = await open(link);
await b.getByRole("heading", { name: /Choose your fighter/i }).waitFor();
await b.keyboard.press("ArrowRight"); await b.keyboard.press("ArrowRight"); await b.keyboard.press("Enter");
await b.waitForTimeout(4000);
console.log("link:", link.replace(/room=.*/, "room=…"));
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
console.log(JSON.stringify({ together: names(await roster(a)) === 2 && names(await roster(b)) === 2, before, after: [await hp(a), await hp(b)], errors }));
await browser.close();
