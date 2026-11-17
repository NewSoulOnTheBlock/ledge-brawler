// Builds workbench/catalog from the running game (http://localhost:5199) and the spec:
//   node workbench/capture/build.mjs [catalog] [clips]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const root = path.resolve(here, "../..");
const catalogDir = path.join(root, "workbench/catalog"), clipDir = path.join(root, "workbench/clips");
const what = process.argv.slice(2);
const want = (name) => what.length === 0 || what.includes(name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5199/");
await page.getByRole("button", { name: "Survival" }).waitFor();
await page.evaluate(() => document.getElementById("root").remove());
const stageUrl = "/@fs/" + path.join(here, "stage.js").replaceAll("\\", "/");
const call = (fn, ...args) => page.evaluate(async ([url, fn, args]) => (await import(url))[fn](...args), [stageUrl, fn, args]);

/** Writes each row's picture under catalog/<dir>/ and returns the rows as the catalogue wants them. */
function save(dir, rows) {
  fs.mkdirSync(path.join(catalogDir, dir), { recursive: true });
  return rows.map(({ png, ok, ...row }) => {
    if (ok === false) console.log(`  not reached: ${dir}/${row.id}`);
    fs.writeFileSync(path.join(catalogDir, dir, row.id + ".png"), Buffer.from(png, "base64"));
    return { ...row, img: `${dir}/${row.id}.png` };
  });
}

/** Every rule of the spec, with its story and what kind of statement its Quint makes. */
function rules() {
  const text = fs.readFileSync(path.join(root, "spec/app/index.md"), "utf8").replaceAll("\r", "");
  const rows = [];
  let story = "";
  for (const block of text.split(/\n(?=##+ )/)) {
    const head = block.split("\n")[0];
    if (head.startsWith("## ")) { story = head.slice(3).replace("Story: ", ""); continue; }
    if (!head.startsWith("### ")) continue;
    const quint = (block.match(/```quint\n([\s\S]*?)```/) ?? ["", ""])[1];
    const prose = block.split("\n").slice(1).join("\n").split("```")[0].trim().replace(/\s+/g, " ");
    const names = [...quint.matchAll(/pure (?:def|val) (\w+)/g)].map((m) => m[1]);
    const kind = names.some((n) => /^always[A-Z]/.test(n)) ? "Always true" : names.some((n) => /^step[A-Z]/.test(n)) ? "Every step" : names.some((n) => /^sometimes[A-Z]/.test(n)) ? "Reachable" : names.some((n) => /^law[A-Z]/.test(n)) ? "Law" : names.some((n) => /^can[A-Z]/.test(n)) ? "Action" : "Definition";
    rows.push({ id: head.slice(4).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80), name: head.slice(4), sub: kind, text: prose || undefined, tags: names.filter((n) => /^can[A-Z]/.test(n)).map((n) => n[3].toLowerCase() + n.slice(4)), fields: { Story: story, Kind: kind } });
  }
  return rows;
}

await call("ready");

if (want("catalog")) {
  const sections = [];
  console.log("fighters"); sections.push({ id: "fighters", group: "People", label: "Fighters", title: "The five fighters", lede: "Each as it stands in the arena, charging its aura.", layout: "grid", keepOrder: true, rows: save("fighters", await call("fighters")) });
  console.log("enemies"); sections.push({ id: "enemies", group: "People", label: "Enemies", title: "Enemies", lede: "The two kinds that arrive in waves, photographed mid-fight.", layout: "wide", keepOrder: true, rows: save("enemies", await call("enemies")) });
  const combos = [], specials = [];
  for (let f = 0; f < 5; f++) { console.log("moves of fighter", f); combos.push(...await call("combos", f)); specials.push(...await call("specials", f)); }
  sections.push({ id: "combos", group: "Combat", label: "Combos", title: "Combos", lede: "All fifty, ten per fighter, each caught while its hit is live. Feet kick, light hands punch, heavy hands swing the blade.", layout: "grid", filter: "Fighter", keepOrder: true, rows: save("combos", combos) });
  sections.push({ id: "specials", group: "Combat", label: "Specials", title: "Specials", lede: "All fifteen, three per fighter, fired at a first wave.", layout: "wide", filter: "Fighter", keepOrder: true, rows: save("specials", specials) });
  console.log("powers"); sections.push({ id: "powers", group: "Combat", label: "Powers", title: "Powers", lede: "What every fighter can do with aura.", layout: "wide", keepOrder: true, rows: save("powers", await call("powers")) });
  console.log("islands"); sections.push({ id: "islands", group: "World", label: "Islands", title: "The fourteen islands", lede: "West to east, each from where a fighter stands on it.", layout: "wide", keepOrder: true, rows: save("islands", await call("islands")) });
  console.log("props"); sections.push({ id: "props", group: "World", label: "Props", title: "Props", lede: "What can be knocked around.", layout: "grid", rows: save("props", await call("props")) });
  sections.push({ id: "rules", group: "Systems", label: "Rules", title: "The rules of a match", lede: "Every rule in spec/app/index.md, each proved for all states and inputs.", layout: "list", filter: "Story", keepOrder: true, rows: rules() });
  fs.writeFileSync(path.join(catalogDir, "catalog.json"), JSON.stringify({ made: new Date().toISOString(), sections }, null, 1));
  console.log(sections.map((s) => `${s.id}: ${s.rows.length}`).join(", "));
}

if (want("clips")) {
  fs.mkdirSync(clipDir, { recursive: true });
  const full = [{ type: "charge", steps: 80 }], wave = [...full, { type: "advance" }];
  const mash = (from, until, key, every) => Array.from({ length: Math.floor((until - from) / every) }, (_, i) => [from + i * every, key, "tap"]);
  const clips = {
    "ink-first-wave": [0, wave, [[300, "right", "down"], [1500, "right", "up"], ...mash(2600, 6000, "punch", 190), ...mash(6000, 8500, "kick", 230), [8600, "s1", "tap"]], 11],
    "ember-inferno-pillars": [1, wave, [...mash(2600, 4600, "punch", 200), [4700, "s1", "tap"], [6500, "s3", "tap"]], 9],
    "moss-flight-and-thorn-rain": [4, wave, [[400, "fly", "tap"], [500, "jump", "down"], [1500, "jump", "up"], [1600, "right", "down"], [2800, "right", "up"], [3000, "s2", "tap"], [5200, "fly", "tap"], ...mash(6000, 8500, "kick", 230)], 9],
    "volt-overdrive": [3, full, [[100, "charge", "down"], [1400, "charge", "up"], ...mash(1700, 5000, "blast", 260), [5200, "s3", "tap"]], 8],
    "tide-dashes-and-jumps": [2, full, [[200, "right", "down"], [500, "jump", "tap"], [750, "dash", "tap"], [1500, "dash", "tap"], [1650, "jump", "tap"], [2600, "right", "up"], [2700, "left", "down"], [2900, "jump", "tap"], [3150, "up", "down"], [3200, "dash", "tap"], [3400, "up", "up"], [4300, "dash", "tap"], [4450, "jump", "tap"], [5200, "left", "up"]], 7],
    "tide-riptide-spin": [2, wave, [...mash(2600, 4200, "kick", 220), [4400, "s3", "tap"], [6800, "s2", "tap"]], 9],
  };
  for (const [name, [fighter, prep, script, seconds]] of Object.entries(clips)) {
    const { webm, summary } = await call("clip", fighter, prep, script.sort((a, b) => a[0] - b[0]), seconds);
    fs.writeFileSync(path.join(clipDir, name + ".webm"), Buffer.from(webm, "base64"));
    console.log(name, JSON.stringify(summary));
  }
}
if (errors.length) console.log("page errors:", errors);
await browser.close();
