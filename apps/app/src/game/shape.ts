// spec/app/index.md, "Story: Play a level of a campaign"
// Shapes a hand-drawn level (Brief.map) before it is proved, in four passes, all from the level's own seed so a level
// is the same every time:
//   1. a gauntlet: three plain rooms side by side become the hero's three-room trial, its own traps first alone,
//      then with a pit, then together, a warning post at its start;
//   2. shafts: two plain rooms one above the other become one tall shaft, climbed on zigzag ledges with a crumbling
//      step, a wagon across to a perch with a crate, and an alcove behind a false wall;
//   3. hidden chambers: a hollow under a room's floor, behind a false floor that gives way, with a cache in it (its air
//      is ':', drawn as rock until someone is inside);
//   4. every other room its own outline: a ceiling of its own (a ragged cavern, a low corridor, a vault off its centre,
//      a lean, a great chamber), ground that rises and falls unevenly, and its enemies nudged off any even spacing.
// Passes 3 and 4 only ever add rock or carve sealed rock, and never within reach of what a room is for. `reach`
// proves the result, every level, every time.

/** The size of a room, in cells (rooms.ts COLS and ROWS; copied, as rooms.ts imports this file). */
const COLS = 26, ROWS = 14;
type Hero = "forbidden" | "ember" | "exile" | "hollow" | "architect";

const W = "#".repeat(COLS), O = `#${".".repeat(COLS - 2)}#`, B = ".".repeat(COLS);
/** A plain room with doors both sides at rows 6 to 9 and its floor at row 10, with some of its rows replaced. */
const room = (rows: Record<number, string>) => Array.from({ length: ROWS }, (_, y) => rows[y] ?? (y === 0 || y >= 10 ? W : y <= 5 ? O : B));
const PITS = (a: string, b: string, c: string) => ({ 10: a, 11: b, 12: c });

// The gauntlets, three rooms each: the hero's own trap alone, then with a pit, then two of its traps together.
const GAUNTLETS: Record<Hero, string[][]> = {
  forbidden: [
    room({ ...PITS("#####___####___####___####", "#####...####...####...####", "#####^^^####^^^####^^^####") }),
    room({ 5: "#.....T.......T.......T..#", ...PITS("####~~~~####~~~~####~~~###", "####....####....####...###", "####^^^^####^^^^####^^^###") }),
    room({ 2: "#......o..........o......#", ...PITS("###____#####____#####__###", "###....#####....#####..###", "###^^^^#####^^^^#####^^###") }),
  ],
  ember: [
    room({ 9: ".........ff......ff.......", ...PITS("#####....###....###....###", "#####....###....###....###", "#####^^^^###^^^^###^^^^###") }),
    room({ 2: "#.......o.......o........#", ...PITS("####~~~~~####~~~~~########", "####.....####.....########", "####^^^^^####^^^^^########") }),
    room({ 8: "......##.........##.......", 9: "......}#..ff.....#{..ff...", ...PITS("#############....#########", "#############....#########", "#############^^^^#########") }),
  ],
  exile: [
    room({ 9: ".....*********............", ...PITS("##############....########", "##############....########", "##############^^^^########") }),
    room({ 8: ".....#....................", 9: ".....(....................", ...PITS("##########....############", "##########....############", "##########^^^^############") }),
    room({ 9: ".....*******.......z......", ...PITS("#############....#########", "#############....#########", "#############^^^^#########") }),
  ],
  hollow: [
    room({ ...PITS("####aaaa##bbbb##aaaa######", "####....##....##....######", "####^^^^##^^^^##^^^^######") }),
    room({ 4: "#............E...........#", 9: "..hhh.....................", ...PITS("##########aaa##bbb########", "##########...##...########", "##########^^^##^^^########") }),
    room({ 9: "..G.....tttt..............", ...PITS("##################aaaa####", "##################....####", "##################^^^^####") }),
  ],
  architect: [
    room({ ...PITS("##kkkkkkkk....jjjjjjjj####", "##########....############", "##########^^^^############") }),
    room({ 5: "#.....T..................#", ...PITS("##wwwwwwww....wwwwwwww####", "##########....############", "##########^^^^############") }),
    room({ 7: "...............Y.......Y..", 9: ".....Y.....Y......M.......", 10: "##jjjjjjjjjjjjjjjj########" }),
  ],
};
for (const [hero, rooms] of Object.entries(GAUNTLETS)) for (const r of rooms) if (r.length !== ROWS || r.some((row) => row.length !== COLS)) throw new Error(`a ${hero} gauntlet room is not ${COLS} by ${ROWS}`);

/** A tall shaft, two rooms high, with doors where the two rooms had them. */
function shaft(rand: () => number, up: [boolean, boolean], down: [boolean, boolean]): string[][] {
  const H = 2 * ROWS, c = Array.from({ length: H }, (_, y) => Array.from({ length: COLS }, (_, x): string => (y === 0 || y >= H - 4 || x === 0 || x === COLS - 1 ? "#" : ".")));
  const free = (x0: number, x1: number, y: number) => { for (let x = x0; x <= x1; x++) if (c[y]?.[x] !== ".") return false; return true; };
  for (const [i, [l, r]] of [up, down].entries()) for (const y of [6, 7, 8, 9]) { if (l) c[i * ROWS + y][0] = "."; if (r) c[i * ROWS + y][COLS - 1] = "."; }
  // Ground by the upper doors.
  if (up[0]) for (let x = 1; x <= 5; x++) c[10][x] = "#";
  if (up[1]) for (let x = COLS - 6; x <= COLS - 2; x++) c[10][x] = "#";
  // An outcrop on a side with no upper door: high up (a chimney) or halfway (a waist), and an alcove in it.
  // (A chimney only where it blocks no door; halfway, it never can.)
  const open = !up[0] ? 0 : !up[1] ? 1 : -1, k = 4 + Math.floor(rand() * 3), high = open >= 0 && rand() < 0.5, side = open >= 0 ? open : rand() < 0.5 ? 0 : 1;
  const [y0, y1] = high ? [1, 8] : [13, 18];
  {
    const xs = side === 0 ? [1, k] : [COLS - 1 - k, COLS - 2];
    for (let y = y0; y <= y1; y++) for (let x = xs[0]; x <= xs[1]; x++) c[y][x] = "#";
    // The alcove: two cells high, sealed but for a false wall facing the shaft, with a cache at its back and a ledge
    // outside it to stand on.
    const back = side === 0 ? 1 : COLS - 2, face = side === 0 ? k : COLS - 1 - k, inward = side === 0 ? 1 : -1;
    for (const y of [y1 - 2, y1 - 1]) { for (let x = Math.min(back, face - inward); x <= Math.max(back, face - inward); x++) c[y][x] = ":"; c[y][face] = "&"; }
    c[y1 - 1][back + inward] = "$";
    for (let i = 1; i <= 3; i++) if (c[y1][face + inward * i] === ".") c[y1][face + inward * i] = "-";
  }
  // The way up: ledges every three rows, zigzagging, the last beside a door above; one of them crumbles.
  const doorX = up[0] ? 7 : COLS - 8;
  let x = 6 + Math.floor(rand() * 14);
  const ledges: [number, number, number][] = [];
  for (const y of [21, 18, 15, 12]) {
    const last = y === 12, w = 3 + Math.floor(rand() * 3);
    let nx = last ? doorX - 1 + Math.floor(rand() * 2) : Math.max(3, Math.min(COLS - 4 - w, x + (rand() < 0.5 ? -1 : 1) * (3 + Math.floor(rand() * 4))));
    for (let tries = 0; tries < 12 && !free(nx, nx + w - 1, y); tries++) nx = Math.max(2, Math.min(COLS - 3 - w, nx + (tries % 2 ? 3 : -3) * (1 + (tries >> 1))));
    if (!free(nx, nx + w - 1, y)) continue;
    for (let i = 0; i < w; i++) c[y][nx + i] = y === 18 ? "~" : "-";
    ledges.push([nx, nx + w - 1, y]);
    x = nx;
  }
  // A wagon across the far side to a perch with a crate on it.
  const mid = ledges.find((l) => l[2] === 15), trackX = mid && mid[0] < COLS / 2 ? 14 : 3;
  if (free(trackX, trackX + 7, 16) && free(trackX, trackX + 7, 15)) {
    for (let i = 0; i < 8; i++) c[16][trackX + i] = "=";
    const px = trackX < COLS / 2 ? trackX : trackX + 4;
    if (free(px, px + 3, 13) && free(px, px + 3, 12)) { for (let i = 0; i < 4; i++) c[13][px + i] = "-"; c[12][px + 1] = "c"; }
  }
  // Vents on the floor, clear of where the climb begins and of the doors.
  const first = ledges[0]?.[0] ?? 12, vx = first < COLS / 2 ? 15 + Math.floor(rand() * 5) : 4 + Math.floor(rand() * 5);
  if (free(vx, vx + 1, H - 5)) { c[H - 5][vx] = "f"; c[H - 5][vx + 1] = "f"; }
  return c.map((row) => [...row]);
}

type Ceiling = "cavern" | "corridor" | "vault" | "lean" | "chamber";
type Ground = "flat" | "terrace" | "humps" | "stair";
const pick = <T,>(rand: () => number, items: T[]) => items[Math.floor(rand() * items.length)];

/** The depth of a ceiling across a room, from its style. */
function ceiling(style: Ceiling, rand: () => number): number[] {
  const d: number[] = [];
  const apex = 5 + rand() * 16, flip = rand() < 0.5, dip = 4 + Math.floor(rand() * 14), dipW = 3 + Math.floor(rand() * 4);
  let walk = Math.floor(rand() * 4);
  for (let x = 0; x < COLS; x++) {
    walk = Math.max(0, Math.min(3, walk + (rand() < 0.35 ? (rand() < 0.5 ? -1 : 1) : 0)));
    const lean = Math.floor(((flip ? COLS - 1 - x : x) / COLS) * 4.4);
    d.push({ cavern: walk, corridor: x >= dip && x < dip + dipW ? 1 : 3, vault: Math.min(3, Math.floor(Math.abs(x - apex) / 3)), lean: Math.min(3, lean), chamber: x < 3 ? 3 - x : x > 22 ? Math.min(3, x - 22) : 0 }[style]);
  }
  return d;
}

/** The height of the ground across a room, from its style: never on the three columns at either side, by its doors. */
function ground(style: Ground, rand: () => number): number[] {
  const h = new Array<number>(COLS).fill(0);
  const run = (x0: number, len: number, f: (i: number) => number) => { for (let i = 0; i < len; i++) if (x0 + i >= 3 && x0 + i <= 22) h[x0 + i] = Math.max(h[x0 + i], f(i)); };
  if (style === "terrace") { const x0 = 3 + Math.floor(rand() * 10), len = 5 + Math.floor(rand() * 5), top = 1 + Math.floor(rand() * (len - 2)); run(x0, len, (i) => (i >= top && i < top + 2 + Math.floor(rand() * 2) ? 2 : 1)); }
  if (style === "humps") for (let k = 1 + Math.floor(rand() * 3); k > 0; k--) run(3 + Math.floor(rand() * 18), 2 + Math.floor(rand() * 3), () => 1);
  if (style === "stair") { const x0 = 3 + Math.floor(rand() * 9), up = 2 + Math.floor(rand() * 3), across = 2 + Math.floor(rand() * 3); run(x0, up + across + 2, (i) => (i < up ? 1 : i < up + across ? 2 : 1)); }
  return h;
}

/** A level's map, shaped. `rand` is the level's own stream; `hero` chooses its gauntlet. */
export function shape(map: string[], w: number, h: number, rand: () => number, hero: Hero): string[] {
  const cells = map.map((row) => [...row]);
  const fixed = new Set<number>();
  const cell = (rx: number, ry: number, x: number, y: number) => cells[ry * ROWS + y]?.[rx * COLS + x];
  const door = (rx: number, ry: number, x: number) => [6, 7, 8, 9].every((y) => cell(rx, ry, x, y) === ".");
  // A room that may be built over: shut above and below, and nothing in it a level needs where it is (no clue, enemy,
  // start, way out, boss, plant, lift or hidden thing); its traps, crates and ledges give way to what replaces it.
  const plain = (rx: number, ry: number) => {
    if (rx < 0 || ry < 0 || rx >= w || ry >= h || fixed.has(ry * w + rx)) return false;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = cell(rx, ry, x, y);
      if ("CePXBS|$%&;".includes(ch) || ((y === 0 || y === ROWS - 1) && ch !== "#")) return false;
    }
    return true;
  };
  const paste = (rx: number, ry: number, rows: (string | string[])[]) => rows.forEach((row, y) => [...row].forEach((ch, x) => { cells[ry * ROWS + y][rx * COLS + x] = ch; }));

  // 1. A gauntlet, where three rooms that may be built over, with doors both sides, stand in a row; or, if no three
  //    do, two (the trap alone, then two together).
  const passable = (rx: number, ry: number) => plain(rx, ry) && door(rx, ry, 0) && door(rx, ry, COLS - 1);
  for (const n of [3, 2]) {
    const runs: [number, number][] = [];
    for (let ry = 0; ry < h; ry++) for (let rx = 0; rx + n <= w; rx++) if (Array.from({ length: n }, (_, i) => i).every((i) => passable(rx + i, ry))) runs.push([rx, ry]);
    if (!runs.length) continue;
    const [gx, gy] = runs[Math.floor(rand() * runs.length)], trial = n === 3 ? GAUNTLETS[hero] : [GAUNTLETS[hero][0], GAUNTLETS[hero][2]];
    trial.forEach((r, i) => { paste(gx + i, gy, r); fixed.add(gy * w + gx + i); });
    cells[gy * ROWS + 9][gx * COLS + 2] = ";";
    break;
  }
  // 2. Shafts, where two plain rooms with a door each stand one above the other; one in a small level, two in a big one.
  const pairs: [number, number][] = [];
  for (let ry = 0; ry + 1 < h; ry++) for (let rx = 0; rx < w; rx++) {
    if (!plain(rx, ry) || !plain(rx, ry + 1)) continue;
    if ((door(rx, ry, 0) || door(rx, ry, COLS - 1)) && (door(rx, ry + 1, 0) || door(rx, ry + 1, COLS - 1))) pairs.push([rx, ry]);
  }
  for (let n = w * h > 30 ? 2 : 1; n > 0 && pairs.length; ) {
    const [sx, sy] = pairs.splice(Math.floor(rand() * pairs.length), 1)[0];
    if (fixed.has(sy * w + sx) || fixed.has((sy + 1) * w + sx)) continue;
    const tall = shaft(rand, [door(sx, sy, 0), door(sx, sy, COLS - 1)], [door(sx, sy + 1, 0), door(sx, sy + 1, COLS - 1)]);
    paste(sx, sy, tall.slice(0, ROWS)); paste(sx, sy + 1, tall.slice(ROWS));
    fixed.add(sy * w + sx); fixed.add((sy + 1) * w + sx);
    n--;
  }
  // 3. Hidden chambers under the floors of two rooms: four rows of sealed rock under any floor with clear air above it.
  const spots: [number, number, number, number][] = [];
  for (let ry = 0; ry < h; ry++) for (let rx = 0; rx < w; rx++) {
    if (fixed.has(ry * w + rx)) continue;
    let boss = false;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (cell(rx, ry, x, y) === "B") boss = true;
    if (boss) continue;
    search: for (let top = 10; top >= 4; top--) for (let x = 4; x <= 15; x++) {
      let ok = true;
      for (let i = -1; i <= 6 && ok; i++) for (let y = top; y <= top + 3; y++) if (cell(rx, ry, x + i, y) !== "#") ok = false;
      for (let i = -1; i <= 6 && ok; i++) for (let y = top - 4; y < top; y++) if (cell(rx, ry, x + i, y) !== ".") ok = false;
      if (ok) { spots.push([rx, ry, x, top]); break search; }
    }
  }
  for (let n = 2; n > 0 && spots.length; n--) {
    const [rx, ry, x, top] = spots.splice(Math.floor(rand() * spots.length), 1)[0];
    const put = (dx: number, y: number, ch: string) => { cells[ry * ROWS + y][rx * COLS + x + dx] = ch; };
    for (let i = 0; i < 6; i++) { put(i, top + 1, ":"); put(i, top + 2, ":"); }
    put(1, top, "%"); put(2, top, "%"); put(4, top + 2, "$");
  }

  // 4. Every other room its own outline.
  for (let ry = 0; ry < h; ry++) for (let rx = 0; rx < w; rx++) {
    const X0 = rx * COLS, Y0 = ry * ROWS;
    const at = (x: number, y: number) => cells[Y0 + y]?.[X0 + x];
    const put = (x: number, y: number, ch: string) => { cells[Y0 + y][X0 + x] = ch; };
    const has = (chars: string) => { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (chars.includes(at(x, y))) return true; return false; };
    // Air or rock only, across a box of the room: nothing a fighter needs is in it.
    const bare = (x0: number, x1: number, y0: number, y1: number) => {
      for (let y = Math.max(0, y0); y <= Math.min(ROWS - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(COLS - 1, x1); x++) if (at(x, y) !== "." && at(x, y) !== "#") return false;
      return true;
    };
    const style = { ceiling: pick<Ceiling>(rand, ["cavern", "cavern", "corridor", "vault", "lean", "chamber"]), ground: pick<Ground>(rand, ["flat", "terrace", "terrace", "humps", "stair"]) };
    const depth = ceiling(style.ceiling, rand), rise = ground(style.ground, rand);
    const nudges = Array.from({ length: COLS }, () => Math.floor(rand() * 5) - 2);
    if (fixed.has(ry * w + rx) || has("B")) continue;
    // Enemies off any even spacing: each moves a cell or two along its ground, where there is ground to stand on.
    for (let y = 1; y < ROWS - 1; y++) for (let x = 0; x < COLS; x++) {
      if (at(x, y) !== "e") continue;
      const to = x + nudges[x];
      if (to >= 2 && to <= 23 && at(to, y) === "." && at(to, y + 1) === "#") { put(x, y, "."); put(to, y, "e"); }
    }
    // The ceiling comes down, but never under a hole in it, beside a plant or a lift, by a doorway up high, or within
    // four cells above anything; nor in a room with a swinging blade or a mortar, whose arcs pass where rock would be.
    const highDoor = (x: number) => [1, 2, 3, 4, 5].some((y) => at(x, y) !== "#");
    const climbs: number[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (at(x, y) === "S" || at(x, y) === "|") climbs.push(x);
    if (!has("oM")) for (let x = 1; x < COLS - 1; x++) {
      if ([x - 1, x, x + 1].some((cx) => at(cx, 0) !== "#") || climbs.some((cx) => Math.abs(cx - x) <= 3)) continue;
      if ((x <= 2 && highDoor(0)) || (x >= COLS - 3 && highDoor(COLS - 1))) continue;
      for (let y = 1; y <= depth[x]; y++) { if (at(x, y) !== "." || !bare(x - 1, x + 1, y, y + 4)) break; put(x, y, "#"); }
    }
    // The ground rises, on a room's plain floor only (not on a pillar or a ledge of rock), with nothing within two cells
    // either side or three above.
    if (!has("tY")) for (let x = 3; x <= 22; x++) {
      if (!rise[x]) continue;
      let floor = -1;
      for (let y = 4; y < ROWS - 1; y++) if (at(x, y) === "#" && at(x, y - 1) === ".") { floor = y; break; }
      if (floor < 9 || [x - 1, x, x + 1].some((cx) => at(cx, floor) !== "#") || !bare(x - 2, x + 2, floor - rise[x] - 3, floor - 1)) continue;
      for (let k = 1; k <= rise[x]; k++) put(x, floor - k, "#");
    }
  }
  return cells.map((row) => row.join(""));
}
