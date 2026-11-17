# Art packs

The campaign's enemies, places and interface are cut from ten purchased or free art packs. They are other
people's work: the game may use them, but they are not ours to redistribute as assets, so keep this repository
private or strip `apps/app/src/game/packs/` before publishing the source. No licence file came with the archives;
check each pack's page before any commercial release.

| Pack | Used for |
|---|---|
| Dark Samurai (`DarkSamuraiAssets.zip`) | enemy: hired blade |
| Knight (`knight.zip`) | enemy: Crown knight |
| Sicklezeep (`Sicklezeep (1).zip`) | enemy: marsh reaper |
| SHADOW Series, The Free Assets: Hallokin, Shadeflit, The Blind Huntress, The Shadowed Wetlands Boss, Void Gate | enemies, a mini-boss, a boss, and every level's way out |
| SHADOW Series, Pixel Tile Map Asset Pack 3 | Blackspire's stone (theme `shadow`) |
| stringstar fields | the lantern fields (theme `fields`) |
| Mossy Assets | the Drowned Wilds (theme `mossy`), with thorn hazards |
| Plant Animations | moving plants, the poison plants and the two that throw |
| SHADOW Series, Pixel UI and Free Ui | the campaign's bars, frames, buttons, icons and loading mark (`src/kit.tsx`) |

Unpack each archive into a folder of its own (`dark-samurai`, `knight`, `sicklezeep`, `shadow-free`,
`shadow-tiles3`, `stringstar`, `mossy`, `plants`, `shadow-ui`, `shadow-free-ui`) under one directory, then:

    python -I art/packs/build.py <that directory>

It writes `apps/app/src/game/packs/`: one grid of frames per character (`cast.json`), every tile piece by name
(`places.json`), each plant animation as a sheet (`plants.json`), and the interface images.

## Platform Fighter Template (GDevelop project)

Versus mode takes three things from it, and not its pirates (the fighters are the Seeker's):

| From the template | Used for |
|---|---|
| The big platform, the animated sea, the sun, clouds and far shore | the duel's stage, The Cove (theme `cove`) |
| The shield | the guard move (G): takes most of a blow until it breaks |
| `go`, `Respawn`, the two shield sounds, `GameOver` | the duel's recorded sounds (`src/game/samples.ts`) |

Eleven more recordings were supplied for the game, and are kept as they were downloaded in a `sounds` folder
inside the packs folder (the build's first argument):

| Recording | Heard |
|---|---|
| `54427377-sword-slash-476148`, `freesound_community-sword-sound-2-36274`, `u_xjrmmgxfru-sword-slash-01-266296` | a fighter swinging: one of the three at random, at a pitch that wanders |
| `freesound_community-beam-8-43831` | an energy blast being shot, at a pitch that wanders |
| `freesound_community-laser-bolt-89300` | a blast landing on a fighter |
| `lightyeartraxx-kl-peach-game-over-iii-142453` | the last life of a campaign level going |
| `freesound_community-game-start-6104` | Campaign, Survival or Versus being chosen |
| `floraphonic-90s-game-ui-2-185095` | a choice being made in any menu but the main one |
| `kaazoom-by-the-rafters-glow-stinger-medieval-tavern-music-rpg-game-620394` | the main menu, once each time it is come to |
| `the_mountain-dark-trap-129999` | under a protagonist's opening cutscene, looped until its last card |
| `freesound_community-8-bit-moonlight-sonata-music-loop-20436` | the music of the moonlit forest (sky `nightforest`), looped, wherever that is the place in play |
| `sergequadrado-fast-rocky-loop-275535` | the music of the canyon (sky `wastelands`), looped, wherever that is the place in play |

The build cuts the short ones to the sound itself and evens out their loudness, which needs `ffmpeg`; the music is used whole.

Pass the project folder as the build's second argument.

## Skies (parallax backgrounds)

Each campaign level has a sky of several layers behind it (`src/game/sky.ts`), from these packs. Pass the folder
they were unpacked into as the build's fourth argument.

| Pack | Sky | Licence note found in the archive |
|---|---|---|
| The Dawn | `dawn` | none in the archive |
| Parallax Demon Woods (David Marah, @aethrall) | `demonwoods` | free for commercial work; credit appreciated |
| Background Hills | `hills` | use and modify allowed; no reselling the asset |
| NightForest | `nightforest` | none in the archive |
| Junk Wastelands, Cold Corridors, Underwater Fantasy, Cyberpunk Street, Super Mountain Dusk (ansimuz) | `wastelands`, `corridors`, `underwater`, `street` `skyline` `synth`, `duskA` `duskB` `duskC` | public licence (PDF in each archive) |
| Free Pixel Art Forest | `forest` | use and modify allowed; **credit required**; no redistribution as an asset |

SynthCitiesGodot and MountainDuskGodot hold the same layers as Cyberpunk Street (version 2) and Super Mountain Dusk
(version A). "Hurry up and run" is a music track, not a background, and is not used.

## The guide

Reaper (Animated Pixel Art): his standing animation with the scythe out and his eyes showing (`HostileIdleReaper`) is the guide who meets the fighter at the start of every level
(`src/game/guide.ts`); what he says is each level's `talk` in `levels.ts`. No licence file came in the archive. Pass
the pack's folder as the build's fifth argument.

## The home screen

`apps/app/src/home.webp` is the game's own menu picture, the five before the throne, supplied by its owner
("Hooded Warriors Before the Golden Throne.png", 1672 by 941). It fills the page, and the name is lettered over it.
