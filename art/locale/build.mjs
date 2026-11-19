// Draws the levels' own props in Aseprite (build.lua, batch mode) and packs them for the game (pack.py).
//   node art/locale/build.mjs [name prefix]   (a prefix redraws only those pieces; all are packed)
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL(".", import.meta.url));
const ASEPRITE = process.env.ASEPRITE ?? "C:/Program Files (x86)/Steam/steamapps/common/Aseprite/Aseprite.exe";
const out = execFileSync(ASEPRITE, ["-b", "--script-param", `dir=${dir}`, "--script-param", `only=${process.argv[2] ?? ""}`, "--script", `${dir}build.lua`], { encoding: "utf8" });
process.stdout.write(out);
process.stdout.write(execFileSync("python", ["-I", `${dir}pack.py`], { encoding: "utf8" }));
