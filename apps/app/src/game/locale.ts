// spec/app/index.md, "Story: Play a level of a campaign"
// What makes each level its own place over its theme: props drawn for it in Aseprite (art/locale/<level>.lua, packed
// as packs/locale and read as scenery by places.ts), stood about its rooms by the rules below. Only looked at.
//   top    on walkable ground, standing up from it              lip    draped over the end of a ledge
//   under  hanging from a ceiling                                face   on a face of rock beside open air
//   deep   inside solid rock, two cells from any air (painted over the rock, as fossils in a wall)
//   front  on the ground, in front of the fighters
import type { Decor } from "./levels.ts";
import type { Grid } from "./rooms.ts";

export type Spot = "top" | "lip" | "under" | "face" | "deep" | "front";
/** A piece (or one of several, chosen each time), where it goes, and the chance of it at each spot of that kind. */
export interface Rule { piece: string | string[]; spot: Spot; chance: number; k?: number }
/** Each level's own rules, and what its horizon has over its theme's (scenery.ts). */
export const LOCALE: Record<string, { rules: Rule[]; far?: string[]; weather?: "embers" | "snow" | "dust" | "spores" }> = {
  // Blackspire's cells and ossuary: the dead in the walls, chains, shackles, the condemned's candles, moonlit bars.
  "forbidden-1": { rules: [
    { piece: ["f1-ribs", "f1-skullFossil"], spot: "deep", chance: 0.035 },
    { piece: "f1-shackles", spot: "face", chance: 0.05 }, { piece: "f1-grate", spot: "face", chance: 0.025 }, { piece: "f1-tallies", spot: "face", chance: 0.03 },
    { piece: "f1-chain", spot: "under", chance: 0.06 }, { piece: "f1-moss", spot: "lip", chance: 0.35 },
    { piece: "f1-skulls", spot: "top", chance: 0.035 }, { piece: "f1-candles", spot: "top", chance: 0.025 },
    { piece: "f1-rubble", spot: "front", chance: 0.02 },
    // The executioner's own keep: the gallows and the block, cages of the dead, the cells' straw, the Crown's banners,
    // and the stone of its walls cracked and coursed.
    { piece: ["f1-gibbet", "f1-block"], spot: "top", chance: 0.012 }, { piece: "f1-straw", spot: "top", chance: 0.02 },
    { piece: "f1-cage", spot: "under", chance: 0.025 }, { piece: "f1-banner", spot: "face", chance: 0.03 },
    { piece: ["f1-crack", "f1-bricks", "f1-bricks"], spot: "deep", chance: 0.06 },
    // The floors' edges broken up with shards and pebbles, and broken pillars, dark, between the view and the fight.
    { piece: ["f1-shards", "f1-pebbles"], spot: "top", chance: 0.18 }, { piece: "f1-fgPillar", spot: "front", chance: 0.012 },
  ] },
  // The city's roofs by night: slate eaves, smoking chimneys, weathervanes, lanterns, lit shutters, timber in the walls.
  "forbidden-2": { rules: [
    { piece: "f2-eaves", spot: "lip", chance: 0.5 }, { piece: ["f2-chimney", "f2-chimney", "f2-vane"], spot: "top", chance: 0.03 },
    { piece: "f2-lantern", spot: "under", chance: 0.03 }, { piece: "f2-washing", spot: "under", chance: 0.02 },
    { piece: "f2-shutter", spot: "face", chance: 0.06 }, { piece: ["f2-timber", "f2-timber", "f2-bricks", "f2-crack"], spot: "deep", chance: 0.06 },
    { piece: "f2-slates", spot: "top", chance: 0.12 },
    // The hunt across them: ridges of slate so the floors read as roofs, dormers and gargoyles, the marked man's face on
    // every wall, the hunters' bolts in the plaster, crows, and grapnels left hanging.
    { piece: "f2-ridge", spot: "top", chance: 0.3 }, { piece: ["f2-dormer", "f2-gargoyle", "f2-crows"], spot: "top", chance: 0.035 },
    { piece: "f2-wanted", spot: "face", chance: 0.05 }, { piece: "f2-bolts", spot: "face", chance: 0.03 }, { piece: "f2-grapnel", spot: "under", chance: 0.025 },
    { piece: ["f2-fgChimneys", "f2-fgSpire"], spot: "front", chance: 0.015 },
  ] },
  // The undercroft of the spared: niches of skulls in the rock, sarcophagi, braziers, names, cobwebs, the city's roots.
  "forbidden-3": { rules: [
    { piece: ["f3-niche", "f3-niche", "f3-masonry", "f3-crack"], spot: "deep", chance: 0.07 },
    { piece: "f3-names", spot: "face", chance: 0.04 }, { piece: "f3-web", spot: "under", chance: 0.05 }, { piece: "f3-roots", spot: "lip", chance: 0.3 },
    { piece: "f3-roots", spot: "under", chance: 0.04 }, { piece: ["f3-sarcophagus", "f3-brazier"], spot: "top", chance: 0.03 }, { piece: "f3-rubble", spot: "top", chance: 0.14 },
    // The list kept down here: the scriptorium's shelves and scrolls, the apothecary's jars, vigil candles, censers, a reliquary.
    { piece: ["f3-shelf", "f3-scrolls", "f3-vigil", "f3-reliquary"], spot: "top", chance: 0.035 }, { piece: "f3-jars", spot: "face", chance: 0.035 },
    { piece: "f3-censer", spot: "under", chance: 0.02 },
    { piece: "f3-fgArch", spot: "front", chance: 0.012 },
  ], far: ["f3-farCrypt"] },
  // The archive built into the stone: books in the walls, ladders, books on chains, ledgers, lecterns, sigils, ink.
  "forbidden-4": { rules: [
    { piece: ["f4-wallBooks", "f4-wallBooks", "f4-crack"], spot: "deep", chance: 0.08 }, { piece: "f4-wallBooks", spot: "face", chance: 0.12 }, { piece: "f4-case", spot: "top", chance: 0.03 }, { piece: "f4-lamp", spot: "under", chance: 0.035 },
    { piece: "f4-ladder", spot: "face", chance: 0.025 }, { piece: "f4-sigil", spot: "face", chance: 0.025 }, { piece: "f4-chained", spot: "under", chance: 0.05 },
    { piece: ["f4-ledgers", "f4-ledgers", "f4-lectern", "f4-ink"], spot: "top", chance: 0.06 },
    { piece: "f4-pages", spot: "top", chance: 0.16 }, { piece: "f4-fgStacks", spot: "front", chance: 0.014 },
  ], far: ["f4-farStacks"] },
  // The convoy's road through the woods: lantern posts, milestones, wheels and manacles, a shrine, dead trees, roots, ivy.
  "forbidden-5": { rules: [
    { piece: ["f5-post", "f5-milestone", "f5-shrine", "f5-deadTree", "f5-deadTree", "f5-deadTree"], spot: "top", chance: 0.045 },
    { piece: ["f5-grass", "f5-grass", "f5-grassTall", "f5-roadStones"], spot: "top", chance: 0.3 },
    { piece: ["f5-wheel", "f5-manacles", "f5-gravel", "f5-gravel"], spot: "top", chance: 0.14 },
    { piece: "f5-ivy", spot: "lip", chance: 0.4 }, { piece: "f5-roots", spot: "under", chance: 0.06 },
    { piece: ["f5-cobble", "f5-roots"], spot: "deep", chance: 0.05 }, { piece: "f5-fgTrunk", spot: "front", chance: 0.012 },
  ], far: ["f5-farProcession"] },
  // The last night of the town: burning beams and fires in the street, seams of heat in the rock, ash, buckets, signs.
  "ember-1": { rules: [
    { piece: ["e1-beam", "e1-fire", "e1-fire"], spot: "top", chance: 0.035 }, { piece: ["e1-house", "e1-house", "e1-cart"], spot: "top", chance: 0.04 }, { piece: ["e1-scorched", "e1-scorched", "e1-debris"], spot: "top", chance: 0.25 }, { piece: ["e1-ash", "e1-ash", "e1-bucket"], spot: "top", chance: 0.12 },
    { piece: ["e1-seam", "e1-seam", "e1-crack"], spot: "deep", chance: 0.05 }, { piece: "e1-sign", spot: "under", chance: 0.03 },
    { piece: "e1-fgPosts", spot: "front", chance: 0.012 },
  ], far: ["e1-farTown"] },
  // Down into the burned ground: black glass, lava pools, the vast bones in the rock, the altar of the bargain, sulphur.
  "ember-2": { rules: [
    { piece: ["e2-spine", "e2-horn", "e2-skull", "e2-seam", "e2-seam", "e2-crack"], spot: "deep", chance: 0.07 }, { piece: ["e2-obsidian", "e2-obsidian", "e2-altar"], spot: "top", chance: 0.035 },
    { piece: ["e2-lava", "e2-vent"], spot: "top", chance: 0.07 }, { piece: "e2-grit", spot: "top", chance: 0.22 }, { piece: "e2-fgSpikes", spot: "front", chance: 0.014 },
  ] },
  // A garrison stormed: racks, shields, barricades, braziers, slits, shot, ladders, helmets; its towers far, a palisade near.
  "ember-3": { rules: [
    { piece: ["e3-rack", "e3-barricade", "e3-brazier", "e3-ladder", "e3-gate"], spot: "top", chance: 0.045 }, { piece: "e3-merlons", spot: "top", chance: 0.3 }, { piece: ["e3-shot", "e3-helms", "e3-arrows", "e3-arrows"], spot: "top", chance: 0.16 },
    { piece: "e3-shield", spot: "face", chance: 0.05 }, { piece: "e3-slit", spot: "face", chance: 0.04 }, { piece: "e3-blocks", spot: "deep", chance: 0.06 },
    { piece: "e3-fgPalisade", spot: "front", chance: 0.012 },
  ], far: ["e3-farFort"] },
  // The shrine town: the saint in stone, coloured glass, prayer flags, incense, icons; domes far, a statue near.
  "ember-4": { rules: [
    { piece: ["e4-saint", "e4-saint", "e4-incense", "e4-arch"], spot: "top", chance: 0.045 }, { piece: "e4-flags", spot: "lip", chance: 0.25 }, { piece: ["e4-petals", "e4-votives"], spot: "top", chance: 0.18 },
    { piece: "e4-window", spot: "face", chance: 0.05 }, { piece: "e4-icon", spot: "face", chance: 0.04 }, { piece: "e4-flags", spot: "under", chance: 0.03 },
    { piece: "e4-fgStatue", spot: "front", chance: 0.012 },
  ], far: ["e4-farDomes"] },
  // The host on the march: tents, campfires, spears with helmets, drums, barrels, pennants trodden into the dust.
  "ember-5": { rules: [
    { piece: ["e5-tent", "e5-tent", "e5-camp", "e5-spears", "e5-drum", "e5-barrels", "e5-catapult", "e5-standard", "e5-standard"], spot: "top", chance: 0.1 },
    { piece: ["e5-pennant", "e5-trampled", "e5-trampled"], spot: "top", chance: 0.2 }, { piece: "e5-blocks", spot: "deep", chance: 0.05 },
    { piece: "e5-fgSpears", spot: "front", chance: 0.022 },
  ], far: ["e5-farVillages"] },
  // The monastery of the nine bells: bells, prayer wheels, stone lanterns, monks in stone, the glyph, drifts, banners.
  "exile-1": { rules: [
    { piece: "x1-bell", spot: "under", chance: 0.04 }, { piece: ["x1-wheel", "x1-wheel", "x1-banner"], spot: "face", chance: 0.06 },
    { piece: ["x1-lantern", "x1-monk"], spot: "top", chance: 0.04 }, { piece: ["x1-drift", "x1-drift", "x1-cairn"], spot: "top", chance: 0.26 },
    { piece: ["x1-glyph", "x1-panel", "x1-panel"], spot: "deep", chance: 0.065 }, { piece: "x1-paper", spot: "under", chance: 0.04 }, { piece: "x1-fgPagoda", spot: "front", chance: 0.012 },
  ], far: ["x1-farRoofs"] },
  // The foothills the blades pull through: crossed swords, a grave of rusted ones, boulders, frosted grass, a gate, strata.
  "exile-2": { rules: [
    { piece: ["x2-crossed", "x2-graveSwords", "x2-boulder", "x2-boulder", "x2-gate"], spot: "top", chance: 0.045 },
    { piece: "x2-frostGrass", spot: "top", chance: 0.3 }, { piece: "x2-cornice", spot: "lip", chance: 0.5 }, { piece: ["x2-strata", "x2-strata", "x2-ore"], spot: "deep", chance: 0.06 },
    { piece: "x2-fgPine", spot: "front", chance: 0.026 }, { piece: "x2-ore", spot: "face", chance: 0.04 },
  ], far: ["x2-farRidge"] },
  // The winter road: signposts, a wrecked wagon, lantern posts, birches, field walls, a cold fire; shut villages far off.
  "exile-3": { rules: [
    { piece: ["x3-signpost", "x3-wagon", "x3-post", "x3-birch", "x3-birch", "x3-birch", "x3-wall", "x3-wall"], spot: "top", chance: 0.08 },
    { piece: "x3-coldfire", spot: "top", chance: 0.02 }, { piece: "x3-icicles", spot: "lip", chance: 0.4 }, { piece: "x3-icicles", spot: "under", chance: 0.06 },
    { piece: "x3-fgBirches", spot: "front", chance: 0.03 },
    // Winter over the ruins of the road: snow lying along every step, frost in the stone, and snow falling.
    { piece: "x3-snowline", spot: "top", chance: 0.55 }, { piece: "x3-frost", spot: "deep", chance: 0.05 },
  ], far: ["x3-farVillage"], weather: "snow" },
  // The battle under the ice: soldiers entombed in the rock, weapons jutting, banners stiff, crystal, ice hanging and cracked.
  "exile-4": { rules: [
    { piece: ["x4-entombed", "x4-spearman"], spot: "deep", chance: 0.07 }, { piece: ["x4-jutting", "x4-jutting", "x4-banner", "x4-crystals"], spot: "top", chance: 0.06 },
    { piece: ["x4-crackedIce", "x4-crackedIce", "x4-litter"], spot: "top", chance: 0.34 }, { piece: "x4-spikes", spot: "lip", chance: 0.4 }, { piece: "x4-spikes", spot: "under", chance: 0.06 },
    { piece: "x4-fgShards", spot: "front", chance: 0.02 },
  ] },
  // The monastery emptied: a fallen bell, benches overturned, robes with no one in them, dead candles, beads, the message.
  "exile-5": { rules: [
    { piece: ["x5-fallenBell", "x5-bench", "x5-bench", "x5-sheeted", "x5-sheeted"], spot: "top", chance: 0.06 }, { piece: "x5-web", spot: "under", chance: 0.06 }, { piece: "x5-web", spot: "lip", chance: 0.25 }, { piece: ["x5-deadCandles", "x5-beads"], spot: "top", chance: 0.14 },
    { piece: "x5-robe", spot: "face", chance: 0.07 }, { piece: "x5-message", spot: "face", chance: 0.07 }, { piece: "x5-ropes", spot: "under", chance: 0.05 }, { piece: "x1-bell", spot: "under", chance: 0.03 },
    { piece: "x5-masonry", spot: "deep", chance: 0.05 }, { piece: "x5-fgPillars", spot: "front", chance: 0.014 },
  ], weather: "dust" },
  // The healer's marsh: her satchel and herbs, bog pools and lilies, wisps of marsh-light, mud, roots; drowned trees far.
  "hollow-1": { rules: [
    { piece: ["h1-satchel", "h1-wisp", "h1-wisp", "h1-hut", "h1-lantern", "h1-lantern", "h1-log"], spot: "top", chance: 0.06 }, { piece: "h1-shelf", spot: "face", chance: 0.14 }, { piece: "h1-shelf", spot: "deep", chance: 0.02 }, { piece: ["h1-pool", "h1-mud", "h1-sedge", "h1-sedge"], spot: "top", chance: 0.24 },
    { piece: "h1-herbs", spot: "under", chance: 0.04 }, { piece: "h1-roots", spot: "lip", chance: 0.4 }, { piece: "h1-roots", spot: "under", chance: 0.05 },
    { piece: "h1-fgReeds", spot: "front", chance: 0.02 },
  ], far: ["h1-farDrowned"] },
  // Where the Witness watches from: eyes in the rock, effigies, bone charms, skull candles, the painted eye, a tree of eyes.
  "hollow-2": { rules: [
    { piece: ["h2-eyes", "h2-eyes", "h2-greatEye"], spot: "deep", chance: 0.06 }, { piece: "h2-eyes", spot: "face", chance: 0.04 }, { piece: "h2-sigil", spot: "face", chance: 0.05 },
    { piece: ["h2-effigy", "h2-effigy", "h2-skullCandle", "h2-eyeTree", "h2-eyeTree"], spot: "top", chance: 0.07 }, { piece: "h2-charms", spot: "under", chance: 0.08 }, { piece: "h2-charms", spot: "lip", chance: 0.2 },
    { piece: "h2-fgRoots", spot: "front", chance: 0.024 },
  ], far: ["h2-farWitness"] },
  // The old burial ground: headstones of names, mounds and candles, biers and coffins, lanterns, chimes of bone, tablets.
  "hollow-3": { rules: [
    { piece: ["h3-stones", "h3-stones", "h3-mound", "h3-bier", "h3-coffin", "h3-lantern", "h3-plot", "h3-plot"], spot: "top", chance: 0.1 },
    { piece: "h3-tablets", spot: "deep", chance: 0.06 }, { piece: ["h3-tablets", "h3-wreath"], spot: "face", chance: 0.06 }, { piece: "h3-chimes", spot: "under", chance: 0.05 },
    { piece: "h3-fgSteles", spot: "front", chance: 0.028 }, { piece: "h3-wreath", spot: "deep", chance: 0.02 },
  ], far: ["h3-farHill"] },
  // The drowned city: kelp, barnacles, weeping statues, coral, lamps glowing under water, anchors, fish bones, mosaics.
  "hollow-4": { rules: [
    { piece: "h4-kelpHang", spot: "lip", chance: 0.45 }, { piece: "h4-kelpHang", spot: "under", chance: 0.05 }, { piece: ["h4-kelp", "h4-kelp", "h4-coral"], spot: "top", chance: 0.16 },
    { piece: ["h4-weeping", "h4-lamp", "h4-lamp"], spot: "top", chance: 0.035 }, { piece: "h4-anchor", spot: "under", chance: 0.025 }, { piece: "h4-jelly", spot: "under", chance: 0.03 }, { piece: "h4-bubbles", spot: "top", chance: 0.04 },
    { piece: ["h4-barnacles", "h4-barnacles", "h4-fishBones"], spot: "deep", chance: 0.06 }, { piece: ["h4-mosaic", "h4-mosaic", "h4-barnacles"], spot: "face", chance: 0.1 }, { piece: "h4-mosaic", spot: "deep", chance: 0.02 },
    { piece: "h4-fgKelp", spot: "front", chance: 0.02 },
  ] },
  // The family homestead gone wild: willows, his camp, a doll, wildflowers, the old well, the fallen fence, fireflies.
  "hollow-5": { rules: [
    { piece: ["h5-willow", "h5-willow", "h5-willow", "h5-camp", "h5-well", "h5-fence"], spot: "top", chance: 0.07 }, { piece: "h5-fireflies", spot: "top", chance: 0.05 },
    { piece: ["h5-flowers", "h5-flowers", "h5-moss", "h5-moss", "h5-doll"], spot: "top", chance: 0.34 }, { piece: "h5-fronds", spot: "lip", chance: 0.35 }, { piece: "h5-fronds", spot: "under", chance: 0.05 },
  ], far: ["h5-farWillows"] },
  // His mother's house of machines: gears in the walls, orreries, telescopes, relic jars, her notes, tapestries, chandeliers.
  "architect-1": { rules: [
    { piece: ["a1-gears", "a1-gears", "a1-pipes", "a1-pipes", "a1-clock"], spot: "deep", chance: 0.08 }, { piece: "a1-steam", spot: "top", chance: 0.05 }, { piece: "a1-tools", spot: "top", chance: 0.16 }, { piece: ["a1-jars", "a1-notes", "a1-tapestry", "a1-portrait"], spot: "face", chance: 0.1 },
    { piece: ["a1-orrery", "a1-telescope"], spot: "top", chance: 0.03 }, { piece: "a1-chandelier", spot: "under", chance: 0.035 },
  ], far: ["a1-farPalace"] },
  // The order's observatory: constellations in the stone, star charts, armillary spheres, sextants, the meridian line.
  "architect-2": { rules: [
    { piece: ["a2-constellation", "a2-constellation", "a2-blocks"], spot: "deep", chance: 0.09 }, { piece: ["a2-chart", "a2-chart", "a2-sextant"], spot: "face", chance: 0.12 }, { piece: "a2-mobile", spot: "under", chance: 0.04 },
    { piece: "a2-armillary", spot: "top", chance: 0.045 }, { piece: "a2-meridian", spot: "top", chance: 0.2 },
  ], far: ["a2-farDome"] },
  // The free companies' camp: dice and coin, a grindstone, cages, motley flags, a stewpot, a loot wagon, the contract board.
  "architect-3": { rules: [
    { piece: ["a3-dice", "a3-grindstone", "a3-cage", "a3-flags", "a3-flags", "a3-stew", "a3-lootWagon", "a3-tent", "a3-tent", "a3-spoils"], spot: "top", chance: 0.12 }, { piece: "a3-mark", spot: "deep", chance: 0.04 }, { piece: "a3-mark", spot: "face", chance: 0.04 },
    { piece: "a3-dirt", spot: "top", chance: 0.16 }, { piece: "a3-board", spot: "face", chance: 0.05 }, { piece: "a3-lanterns", spot: "under", chance: 0.03 },
  ], far: ["a3-farStockade"] },
  // His city alight with his own green fire: flames, his firebombs, fallen scaffolds, shattered vials, green seams, windows.
  "architect-4": { rules: [
    { piece: ["a4-greenFire", "a4-greenFire", "a4-bombs", "a4-scaffold", "a4-house", "a4-house"], spot: "top", chance: 0.11 }, { piece: "a4-vials", spot: "top", chance: 0.14 },
    { piece: ["a4-seam", "a4-seam", "a4-crack"], spot: "deep", chance: 0.06 }, { piece: "a4-window", spot: "face", chance: 0.06 },
    { piece: "a4-fgRuin", spot: "front", chance: 0.024 },
  ], weather: "embers" },
  // The crater: shards of the binding, star-metal veins, stones floating in its pull, the Crown's dig, glassy pits.
  "architect-5": { rules: [
    { piece: ["a5-shard", "a5-shard", "a5-floating", "a5-floating", "a5-cart", "a5-stakes"], spot: "top", chance: 0.08 }, { piece: "a5-motes", spot: "top", chance: 0.05 }, { piece: ["a5-pit", "a5-picks"], spot: "top", chance: 0.14 },
    { piece: ["a5-vein", "a5-vein", "a5-crack"], spot: "deep", chance: 0.055 }, { piece: "a5-shard", spot: "face", chance: 0.02 },
  ], far: ["a5-farRim"] },
};

const CELL = 64;
/** Stands each level's own props about it: each spot taken once, each rule drawn in turn from `rnd`. */
export function dressLocale(id: string, g: Grid, rnd: () => number, decor: Decor[]) {
  const own = LOCALE[id];
  if (!own) return;
  const at = (x: number, y: number) => g.cells[y]?.[x], rock = (x: number, y: number) => at(x, y) === "#", air = (x: number, y: number) => at(x, y) === ".";
  const spots: Record<Spot, [number, number][]> = { top: [], lip: [], under: [], face: [], deep: [], front: [] };
  for (let y = 1; y < g.h - 1; y++) for (let x = 1; x < g.w - 1; x++) {
    // A thin ledge is ground to stand things on and drape over, though nothing hangs under it or is set into it.
    if (at(x, y) === "-") { if (air(x, y - 1) && air(x, y - 2)) { spots.top.push([x, y]); if (air(x - 1, y) || air(x + 1, y)) spots.lip.push([x, y]); } continue; }
    if (!rock(x, y)) continue;
    if (air(x, y - 1) && air(x, y - 2)) { spots.top.push([x, y]); spots.front.push([x, y]); if (air(x - 1, y) || air(x + 1, y)) spots.lip.push([x, y]); }
    if (air(x, y + 1) && air(x, y + 2)) spots.under.push([x, y]);
    if (rock(x, y - 1) && rock(x, y + 1) && (air(x - 1, y) || air(x + 1, y))) spots.face.push([x, y]);
    let solid = true;
    for (let dy = -2; dy <= 2 && solid; dy++) for (let dx = -2; dx <= 2; dx++) if (!rock(x + dx, y + dy)) { solid = false; break; }
    if (solid) spots.deep.push([x, y]);
  }
  const taken = new Set<string>();
  for (const rule of own.rules) for (const [x, y] of spots[rule.spot]) {
    if (rnd() >= rule.chance || taken.has(`${rule.spot},${x},${y}`)) continue;
    taken.add(`${rule.spot},${x},${y}`);
    const piece = typeof rule.piece === "string" ? rule.piece : rule.piece[Math.floor(rnd() * rule.piece.length)], flip = rnd() < 0.5;
    const k = rule.k !== undefined ? { k: rule.k } : {};
    switch (rule.spot) {
      case "top": decor.push({ piece, set: "scenery", x: (x + 0.2 + rnd() * 0.6) * CELL, y: y * CELL + 2, flip, ...k }); break;
      case "front": decor.push({ piece, set: "scenery", x: (x + 0.5) * CELL, y: y * CELL + 26, flip, front: true, ...k }); break;
      // A drape hangs from the top of the ledge's end, over its side.
      case "lip": { const side = air(x - 1, y) ? 0 : 1; decor.push({ piece, set: "scenery", x: (x + side) * CELL + (side ? -6 : 6), y: y * CELL - 4, flip: side === 0, ...k }); break; }
      case "under": decor.push({ piece, set: "scenery", x: (x + 0.5) * CELL, y: (y + 1) * CELL - 2, flip, ...k }); break;
      case "face": decor.push({ piece, set: "scenery", x: (x + 0.5) * CELL, y: (y + 0.85) * CELL, flip, ...k }); break;
      case "deep": decor.push({ piece, set: "scenery", x: (x + 0.5) * CELL, y: (y + 0.9) * CELL, flip, ...k }); break;
    }
  }
}
