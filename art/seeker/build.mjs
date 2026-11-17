// Runs art/seeker/moves.lua in Aseprite and writes the list of move animations the game loads:
//   node art/seeker/build.mjs            (from the repository root)
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ASEPRITE = process.env.ASEPRITE ?? "C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe";
const out = "apps/app/src/game/seeker/moves";
fs.rmSync(out, { recursive: true, force: true });
fs.rmSync("art/seeker/moves", { recursive: true, force: true });
for (const id of ["ink", "ember", "tide", "volt", "moss"]) { fs.mkdirSync(`${out}/${id}`, { recursive: true }); fs.mkdirSync(`art/seeker/moves/${id}`, { recursive: true }); }

const printed = execFileSync(ASEPRITE, ["-b", "--script", "art/seeker/moves.lua"], { encoding: "utf8", maxBuffer: 1 << 26 });
const moves = {};
for (const line of printed.split(/\r?\n/)) {
  const [tag, id, key, name, file, w, h, frames, fx, fy, ms] = line.split("\t");
  if (tag !== "MOVE") continue;
  moves[`${id}/${key}`] = { name, file, w: +w, h: +h, frames: +frames, feet: [+fx, +fy], ms: ms.split(",").map(Number) };
}
fs.writeFileSync(`${out}/moves.json`, JSON.stringify(moves, null, 1) + "\n");
console.log(`${Object.keys(moves).length} move animations`);
if (Object.keys(moves).length === 0) console.log(printed.slice(0, 2000));
