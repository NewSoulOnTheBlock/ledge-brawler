// Approved animations -> .aseprite (one tag per animation) + packed PNG sheet + bestiary.json entry (cast.json format)
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js");
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ASE = "C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe";
const ROOT = path.join(__dirname, ".."), GAME = path.join(ROOT, "../../apps/app/src/game/packs/bosses");
module.exports = (name, anims, { feet, faces = 1, scale = 3.5, cols = 10 }) => {
  const fdir = path.join(ROOT, "work/frames", name); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir, { recursive: true });
  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true }); fs.mkdirSync(GAME, { recursive: true });
  const all = [], man = [], meta = {};
  for (const [an, { frames, delay }] of Object.entries(anims)) {
    meta[an] = { start: all.length, frames: frames.length,
      fps: +(1000 / (Array.isArray(delay) ? delay.reduce((a, b) => a + b, 0) / delay.length : delay)).toFixed(1) };
    frames.forEach((f, i) => { const file = `${an}_${String(i).padStart(2, "0")}.png`; P.save(f, path.join(fdir, file));
      man.push(`${an} ${file} ${Array.isArray(delay) ? delay[i] : delay}`); all.push(f); });
  }
  fs.writeFileSync(path.join(fdir, "manifest.txt"), man.join("\n") + "\n");
  const sheet = P.pack(all, { cols, pad: 0 }); P.save(sheet, path.join(GAME, `${name}.png`));
  const jf = path.join(GAME, "bosses.json"), j = fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, "utf8")) : {};
  j[name] = { file: `${name}.png`, w: all[0].w, h: all[0].h, cols: sheet.frame.cols, feet, scale, faces, anims: meta };
  fs.writeFileSync(jf, JSON.stringify(j, null, 1) + "\n");
  const out = path.join(ROOT, "out", `${name}.aseprite`);
  execFileSync(ASE, ["-b", "--script-param", `dir=${fdir}`, "--script-param", `out=${out}`, "--script", path.join(__dirname, "export.lua")], { stdio: "pipe" });
  // round-trip check: Aseprite reports the frame count and tags it saved
  const info = execFileSync(ASE, ["-b", out, "--list-tags", "--data", path.join(fdir, "check.json"), "--format", "json-array", "--sheet", path.join(fdir, "check.png")]).toString();
  const d = JSON.parse(fs.readFileSync(path.join(fdir, "check.json"), "utf8"));
  return { out, frames: d.frames.length, tags: d.meta.frameTags.map(t => `${t.name}:${t.from}-${t.to}`), sheet: path.join(GAME, `${name}.png`) };
};
