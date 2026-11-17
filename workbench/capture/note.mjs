// Sends a note from a catalogue drawer the way the owner would, and reports what the page offered.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:8977/");
await page.waitForTimeout(1500);
await page.getByText("Fighters", { exact: false }).first().click();
await page.waitForTimeout(600);
await page.locator("main img, .view img").first().click();
await page.waitForTimeout(600);
const box = page.locator("textarea").last();
await box.fill("workbench self-test note");
const buttons = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.textContent.trim()).filter((t) => /send|note/i.test(t)));
console.log("buttons:", JSON.stringify(buttons));
await page.screenshot({ path: new URL("../../shots/workbench/drawer.png", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1") });
await page.getByRole("button", { name: /send/i }).last().click();
await page.waitForTimeout(800);
await browser.close();
