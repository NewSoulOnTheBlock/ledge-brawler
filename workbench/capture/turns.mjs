// Records, in apps/app/src/game/levels.ts, which try from its seed gives each campaign level a layout that can be
// crossed, so that opening a level lays it out once: node workbench/capture/turns.mjs. Run it again whenever the
// rooms (rooms.ts) or a level's seed or size change.
import fs from "node:fs";
import { BRIEFS } from "../../apps/app/src/game/levels.ts";
import { level } from "../../apps/app/src/game/rooms.ts";
const file = new URL("../../apps/app/src/game/levels.ts", import.meta.url);
let text = fs.readFileSync(file, "utf8");
for (const brief of BRIEFS) {
  // A level looks through six hundred layouts at a time from its hint; this looks through ten such stretches, and
  // says which levels have no layout that can be crossed in any of them, leaving those as they were.
  let made = null, why = "";
  for (let from = 0; from < 6000 && !made; from += 600) { try { made = level({ ...brief, turn: from }); } catch (error) { why = error.message; } }
  if (!made) { console.log("NO LAYOUT", why); continue; }
  const at = text.indexOf(`{ id: "${brief.id}"`), end = text.indexOf("\n", at);
  const line = text.slice(at, end).replace(/seed: (\d+),( turn: \d+,)?/, (_, seed) => `seed: ${seed},${made.turn > 0 ? ` turn: ${made.turn},` : ""}`);
  text = text.slice(0, at) + line + text.slice(end);
  if (made.turn > 0) console.log(brief.id, "turn", made.turn);
}
fs.writeFileSync(file, text);
