// The game on a phone (http://localhost:5199, or the address given): held upright it should ask to be turned; on its
// side, a thumb on the left should move the fighter and buttons on the right should act. Saves what the phone shows.
import { chromium } from "playwright";
const out = new URL("../../shots/latest/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const url = process.argv[2] ?? "http://localhost:5199/";
const browser = await chromium.launch();
const errors = [];
const phone = (width, height) => browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
// Upright.
let page = await (await phone(390, 844)).newPage();
await page.goto(url);
const asked = await page.getByRole("alert").waitFor({ timeout: 8000 }).then(() => true, () => false);
await page.waitForTimeout(300);
await page.screenshot({ path: out + "phone-upright.png" });
// On its side: into Survival, then the thumbs.
page = await (await phone(844, 390)).newPage();
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url);
const hidden = !(await page.getByRole("alert").isVisible());
await page.getByRole("button", { name: "Survival" }).tap();
// Casual or Pro is asked first (ProEntry.tsx): casual.
await page.getByRole("button", { name: /^Casual/i }).tap();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Fight" }).tap();
await page.waitForTimeout(2500);
await page.screenshot({ path: out + "phone-1.png" });
const cdp = await page.context().newCDPSession(page);
const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
// Left thumb down and pushed right; right thumb taps Punch three times while it is held, then Jump.
await touch("touchStart", [[150, 260]]);
for (let i = 1; i <= 8; i++) { await touch("touchMove", [[150 + i * 8, 260]]); await page.waitForTimeout(30); }
await page.waitForTimeout(700);
await page.screenshot({ path: out + "phone-2.png" });
const punch = await page.getByRole("button", { name: "Punch" }).boundingBox(), jump = await page.getByRole("button", { name: "Jump" }).boundingBox();
for (let i = 0; i < 3; i++) {
  await touch("touchStart", [[214, 260], [punch.x + punch.width / 2, punch.y + punch.height / 2]]); await page.waitForTimeout(90);
  await touch("touchEnd", [[214, 260]]); await page.waitForTimeout(120);
}
await touch("touchStart", [[214, 260], [jump.x + jump.width / 2, jump.y + jump.height / 2]]); await page.waitForTimeout(250);
await page.screenshot({ path: out + "phone-3.png" });
await touch("touchEnd", []);
const combo = await page.locator("header").innerText();
console.log(JSON.stringify({ uprightAsksToTurn: asked, sidewaysDoesNot: hidden, hud: combo.replace(/\s+/g, " ").slice(0, 90), errors }));
await browser.close();
