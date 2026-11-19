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
| `the_mountain-dark-trap-129999` | under a protagonist's opening cutscene, looped until its last card |
| `freesound_community-8-bit-moonlight-sonata-music-loop-20436` | the music of the moonlit forest (sky `nightforest`), looped, wherever that is the place in play |
| `sergequadrado-fast-rocky-loop-275535` | the music of the canyon (sky `wastelands`), looped, wherever that is the place in play |
| `alex-morgan-dark-trap-lazy-beat-instrumental-587390` | the main menu, looped, from the moment it is come to (`throne`) |
| `mondamusic-trap-trap-beat-beats-589144` | the main menu while its credits are open (`credits`) |
| `mondamusic-trap-trap-hype-589115`, `mondamusic-motivation-drill-trap-560145` | the Crownlands: even chapters, odd chapters (`crown`, `crownB`) |
| `kiravale-phonk-music-593661`, `sub_clair-phonk-instrumental-610091`, `mondamusic-drill-drill-trap-597190` | the Ashen Reach, the Drowned Wilds, the Pale North (`ash`, `drowned`, `north`) |
| `rovador-nightmare-circus-414856`, `moodmode-creepy-devil-dance-166764` | any fungal place, any shrine (`fungal`, `shrine`) |
| `mondamusic-phonk-589113` | the Black Archive, over the seal beneath Blackspire, and the Hollow Below (`blackspire`) |
| `apalonbeats-trap-trap-hype-beat-491423`, `solarflex-trap-instrumental-558263`, `dimmysad-mankind-vs-machines-action-electronic-dubstep-game-420650` | a boss fought: before a hero's fourth chapter, in it, in the fifth (`boss`, `firstborn`, `final`) |
| `jonasblakewood-trap-action-623046`, `alexzavesa-powerful-beat-trap-loop-635537`, `vaitsez-latin-latino-trap-beat-635218` | a Versus match: one of the three, the same for the whole match (`duelA`, `duelB`, `duelC`) |
| `kulakovka-background-trap-304347`, `redoctopus-siren-police-trap-194629` | Survival: until wave 10, from it (`waves`, `wavesLate`) |

Which plays where is `musicFor` in `src/game/audio.ts`; a boss fight comes first, then the mode, then a campaign place's
own music, then its region's. The soundtrack is levelled to -16 LUFS by the build.

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

## Enemy attack effects

Cut by `foefx.py` (run by `build.py`, or alone: `python -I art/packs/foefx.py <packs folder>`) from the seven VFX
archives unpacked into `<packs folder>/vfx`, into `src/game/packs/foefx/`. Only enemies use them (`src/game/foefx.ts`),
so an enemy's attack never looks like a fighter's special.

| Pack | Strips | Licence |
|---|---|---|
| Holy VFX 01-02 | `holyBall`, `holyPop` | none in the archive |
| Thunder Effect 01, 02 | `bolt`, `boltHit`, `slash`, `splash`, `skyStrike` | none in the archive |
| Ice Effect 01 | `shard`, `shardPop`, `spikes` | none in the archive |
| Fire Effect 2 | `dome`, `blast` | none in the archive |
| Water Effect 2 | `waterBall`, `waterPop`, `geyser` | none in the archive |
| Dark VFX 01 - 02 | `skull`, `skullPop`, `ghost` | none in the archive |

## Enemies of one level each

Cut by `foes.py` (run by `build.py`, or alone: `python -I art/packs/foes.py <packs folder>`, which adds them to
`cast.json`) from the archives unpacked into `<packs folder>/foes`. Each is a brief's `own` enemy in
`src/game/levels.ts` and appears in no other level; its basic way of fighting and its special are in `src/game/cast.ts`.

| Pack | Cast | Level | Licence |
|---|---|---|---|
| Undead executioner (and its summons) | `executioner`, `spirit` | forbidden-3 | none in the archive |
| NightBorne | `nightborne` | forbidden-4 | none in the archive |
| Fire Worm | `fireworm` (+ `fireball`, `fireBurst` in foefx) | ember-2 | CC0 |
| stormhead | `stormhead` | exile-3 | none in the archive |
| Mud Guard | `mudguard` | hollow-1 | none in the archive |
| Small Monster | `sprout` | hollow-5 | none in the archive |
| Toaster Bot | `toaster` | architect-1 | none in the archive |
| Droid Zapper | `droid` | architect-2 | none in the archive |
| Bot Wheel | `botwheel` | architect-3 | none in the archive |
| Mecha-stone Golem 0.1 | `golem` (+ `fist`, `laser` in foefx) | architect-5 | none in the archive |
| EVil Wizard 2 | `wizard` | ember-4 | CC0 |
| FREE_Samurai 2D Pixel Art v1.2 | `ronin` | exile-2 | use in a game only; no resale as an asset; **never in an NFT** |
