// Writes every campaign level's map as text (one character a cell) into the folder given, and prints how big each
// is: node --experimental-strip-types workbench/capture/maps.mjs <folder>. Paint them with maps.py.
import fs from "node:fs";
import { allLevels } from "../../apps/app/src/game/levels.ts";
const out = process.argv[2];
for (const L of allLevels()) {
  const g = L.grid, flat = g.cells.flat();
  fs.writeFileSync(`${out}/${L.id}.txt`, g.cells.map((row) => row.join("")).join("\n"));
  console.log(L.id.padEnd(13), `${L.rooms[0]}x${L.rooms[1]} rooms laid, ${new Set(L.ambushes.map((a) => a.zone.join())).size} with enemies`, `${g.w * 64}x${g.h * 64}px`,
    `foes ${L.ambushes.reduce((n, a) => n + a.foes.length, 0)}`, `spikes ${L.hazards.length}`, `plants ${L.springs.length}`, `finds ${L.clues.length}`, `air ${Math.round(100 * flat.filter((c) => c !== "#").length / flat.length)}%`);
}
