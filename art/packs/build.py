# Cuts the art packs the campaign uses into what the game loads: apps/app/src/game/packs/.
#   python -I art/packs/build.py <folder the ten packs were unpacked into> <the Platform Fighter Template's project folder> <the Lore project folder> <folder the background packs were unpacked into> <the Reaper pack's folder>
# The packs are other people's work (see art/packs/README.md) and are not redistributed with the source.
import glob, json, os, shutil, subprocess, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from components import components
import foefx, foes
from sheets import OUT, cast, empty, row, save, strip

SRC, FIGHTER, LORE, SKIES, REAPER = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
src = lambda *p: os.path.join(SRC, *p)
load = lambda *p: Image.open(src(*p)).convert("RGBA")
def write(name, data):
    with open(os.path.join(OUT, name), "w", newline="\n") as f: json.dump(data, f, indent=1); f.write("\n")

free = lambda *p: src("shadow-free", *p)
CAST = {}
s = load("dark-samurai", "DarkSamurai (64x64).png")
CAST["samurai"] = cast("samurai", {n: row(s, 64, 64, r) for r, n in enumerate(["idle", "run", "attack", "attack2", "jump", "fall", "hit", "death"])},
                       {"attack": 14, "attack2": 14, "death": 12, "run": 12}, 88)
s = load("knight", "knight.png")
CAST["knight"] = cast("knight", {n: row(s, 86, 49, r) for r, n in enumerate(["idle", "attack", "attack2", "run"])}, {"attack": 14, "attack2": 12, "idle": 8}, 96)
s = load("sicklezeep", "sickle_sheet.png")
CAST["sickle"] = cast("sickle", {n: row(s, 128, 64, r) for r, n in enumerate(["idle", "run", "jump", "attack", "attack2"])}, {"attack": 14, "attack2": 12}, 84)
s = Image.open(free("SHADOW Series - Hallokin (free)", "sprite sheet 9x12 (free).png")).convert("RGBA")
CAST["hallokin"] = cast("hallokin", {n: row(s, 192, 128, r) for r, n in enumerate(["idle", "run", "jump", "fall", "attack", "attack2", "attackUp", "hit", "death"])},
                        {"attack": 14, "attack2": 12, "death": 12}, 78)
s = Image.open(free("SHADOW Series - The Blind Huntress", "SHADOW Series - The Blind Huntress.png")).convert("RGBA")
rows = {"idle": 0, "run": 1, "jump": 2, "fall": 4, "dash": 5, "attackUp": 6, "attack": 9, "attack2": 10, "dashAttack": 11, "hit": 13, "death": 14}
CAST["huntress"] = cast("huntress", {n: row(s, 240, 128, r) for n, r in rows.items()}, {"attack": 14, "attack2": 14, "run": 12, "death": 10}, 96)
d = lambda f: Image.open(free("SHADOW Series - Shadeflit (Free)", f)).convert("RGBA")
CAST["shadeflit"] = cast("shadeflit", {"idle": strip(d("idle.png"), 277), "run": strip(d("run.png"), 277), "turn": strip(d("run-turn.png"), 277)}, {"run": 12}, 80)
b = lambda *f: Image.open(free("SHADOW Series - The Shadowed Wetlands Boss v1.1", "Sprite Sheet", *f)).convert("RGBA")
CAST["boss"] = cast("boss", {"idle": strip(b("idle.png"), 247), "run": strip(b("walk.png"), 247), "attack": strip(b("Attack 1.png"), 247), "attack2": strip(b("Attack 2.png"), 247),
                             "hit": strip(b("new", "hit.png"), 247), "death": strip(b("new", "death.png"), 247)}, {"attack": 12, "attack2": 12, "death": 14, "idle": 10, "run": 10}, 170)
CAST.update(foes.build(SRC))
write("cast.json", CAST)

# ---------- plants: every second frame, a quarter the size, cropped to what the animation ever touches ----------
PLANTS = {}
for folder in sorted(glob.glob(src("plants", "Plant Animations", "*"))):
    name = os.path.basename(folder).lower().replace(" ", "")
    files = sorted(glob.glob(os.path.join(folder, "*.png")))[::2]
    frames = [Image.open(f).convert("RGBA") for f in files]
    k = 128 / frames[0].width * (1 if frames[0].width == 512 else 1.5)
    frames = [f.resize((round(f.width * k), round(f.height * k)), Image.LANCZOS) for f in frames]
    box = None
    for f in frames:
        bb = f.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
        if bb: box = bb if box is None else (min(box[0], bb[0]), min(box[1], bb[1]), max(box[2], bb[2]), max(box[3], bb[3]))
    w, h = box[2] - box[0], box[3] - box[1]
    cols = min(len(frames), 8)
    sheet = Image.new("RGBA", (cols * w, -(-len(frames) // cols) * h))
    for i, f in enumerate(frames): sheet.paste(f.crop(box), ((i % cols) * w, (i // cols) * h))
    # Where it grows from: the middle of its lowest row in the first frame.
    a = frames[0].crop(box).getchannel("A").load()
    foot = [x for x in range(w) if any(a[x, y] > 60 for y in range(h - 4, h))] or [w // 2]
    PLANTS[name] = {"file": save(sheet, "plants/" + name, True), "w": w, "h": h, "cols": cols, "frames": len(frames), "fps": 15, "root": [foot[len(foot) // 2], h - 2]}
write("plants.json", PLANTS)

# ---------- places: the pieces of each tile sheet, by name ----------
def pieces(im, names, step, k, folder, lossy, gap=2, minarea=30):
    out = {}
    found = components(im, step, minarea, gap)
    for i, name in names.items():
        x0, y0, x1, y1 = found[i]
        cut = im.crop((x0, y0, x1, y1))
        if k != 1: cut = cut.resize((round(cut.width * k), round(cut.height * k)), Image.LANCZOS)
        out[name] = {"file": folder + "/" + save(cut, f"{folder}/{name}", lossy), "w": cut.width, "h": cut.height}
    return out
def rects(im, named, folder):
    out = {}
    for name, box in named.items():
        cut = im.crop(box)
        out[name] = {"file": folder + "/" + save(cut, f"{folder}/{name}"), "w": cut.width, "h": cut.height}
    return out
PLACES = {}
m = lambda n: load("mossy", "Mossy Tileset", f"Mossy - {n}.png")
PLACES["mossy"] = {
    **pieces(m("FloatingPlatforms"), {0: "tuft", 1: "plank", 2: "pillar", 3: "block", 4: "plankB", 5: "tuftB", 6: "long", 7: "longest"}, 8, 0.5, "mossy", True),
    **pieces(m("MossyHills"), {0: "moundS", 1: "hill", 3: "hillBig", 5: "hillLow", 6: "moundBig"}, 8, 0.5, "mossy", True),
    **pieces(m("Decorations&Hazards"), {0: "rock", 2: "rockFlat", 1: "rockTall", 3: "thorns", 4: "thornsHook", 5: "thornsArch", 8: "thornsS",
                                         10: "leafA", 11: "leafB", 12: "fiddle", 18: "sprig", 19: "leafC", 22: "grass", 24: "shoots", 27: "grassB",
                                         15: "trunkA", 16: "trunkB", 17: "trunkC", 9: "trunkD"}, 8, 0.25, "mossy", True, minarea=20),
    **pieces(m("BackgroundDecoration"), {0: "farColumn", 1: "farColumnB", 2: "farMound", 3: "farHill", 4: "farSlope", 5: "farDome"}, 16, 0.25, "mossy", True, gap=1),
    **pieces(m("Hanging Plants"), {0: "frond", 1: "frondB", 2: "frondC", 3: "frondD", 4: "frondEdge", 5: "curl", 6: "mossDrop", 7: "mossDropB", 8: "curlB", 9: "curlC"}, 8, 0.35, "mossy", True, minarea=20),
    **pieces(m("TileSet"), {0: "earth", 2: "earthTall", 3: "earthWide"}, 16, 0.25, "mossy", True, gap=1),
}
t = load("shadow-tiles3", "SHADOW Series - Pixel Tile Map Asset Pack 3", "tile map.png")
PLACES["shadow"] = pieces(t, {0: "blockA", 1: "blockB", 2: "blockS", 6: "plank", 7: "pillar", 10: "strip", 12: "frame",
                              3: "bareA", 4: "bareB", 5: "bareS", 8: "barePlank", 9: "barePillar", 11: "bareStrip", 13: "bareFrame"}, 1, 1, "shadow", False)
t = load("stringstar", "tileset.png")
PLACES["fields"] = {
    **rects(t, {"tree": (176, 8, 288, 144), "treeS": (4, 80, 58, 144), "ground": (0, 140, 160, 176), "mound": (74, 122, 138, 144),
                "lantern": (0, 32, 15, 61), "lanternLong": (35, 32, 45, 78), "vines": (0, 32, 48, 80), "rock": (48, 59, 80, 80), "plank": (80, 64, 160, 80),
                "bush": (116, 92, 157, 112), "sprout": (86, 84, 96, 96), "sproutB": (100, 81, 112, 96), "boulder": (64, 86, 80, 96)}, "fields"),
    **{f"sky{i}": {"file": "fields/" + save(load("stringstar", f"background_{i}.png"), f"fields/sky{i}"), "w": 288, "h": 180} for i in range(3)},
}
g = Image.open(free("SHADOW Series - Void Gate", "SHADOW Series - Abyssal Gate.png")).convert("RGBA")
PLACES["gate"] = {"gate": {"file": "gate/" + save(g, "gate/gate"), "w": g.width, "h": g.height}}
# The Platform Fighter Template's stage: its platform, its sea in five frames, and its sun in six. Its pirates are not used: the fighters are the Seeker's.
bg = lambda n: Image.open(os.path.join(FIGHTER, "assets", "Background", n)).convert("RGBA")
def row(frames):
    sheet = Image.new("RGBA", (sum(f.width for f in frames), frames[0].height))
    x = 0
    for f in frames: sheet.paste(f, (x, 0)); x += f.width
    return sheet
COVE = {"platform": bg("BigPlatform.png"), "clouds": bg("Clouds.png"), "trees": bg("Trees.png"),
        "sea": row([bg(f"BigSea{i}.png") for i in (7, 8, 9, 10, 11)]), "sun": row([bg(f"Sun{i}.png") for i in range(1, 7)])}
PLACES["cove"] = {name: {"file": "cove/" + save(im, f"cove/{name}"), "w": im.width, "h": im.height} for name, im in COVE.items()}
# The Lore project's village: its 8-pixel dirt and grass laid out as a block of ground, a wall and a row of spikes;
# its bridge, houses, trees and signs as they are. Its own character is not used: the fighters are the Seeker's.
lore = lambda n: Image.open(os.path.join(LORE, "assets", n)).convert("RGBA")
def laid(rows):
    sheet = Image.new("RGBA", (len(rows[0]) * 8, len(rows) * 8))
    for y, names in enumerate(rows):
        for x, name in enumerate(names): sheet.paste(lore(name), (x * 8, y * 8))
    return sheet
across = lambda left, mid, right, n: [left] + [mid] * (n - 2) + [right]
VILLAGE = {
    "ground": laid([across("Grass_Top_Left.png", "Grass_Top_Middle.png", "Grass_Top_Right.png", 12)] + [across("Dirt_Middle_Left.png", "Dirt_Middle_Middle.png", "Dirt_Middle_Right.png", 12)] * 4 + [across("Dirt_Bottom_Left.png", "Dirt_Bottom_Middle.png", "Dirt_Bottom_Right.png", 12)]),
    "wall": laid([across("Grass_Top_Left.png", "Grass_Top_Middle.png", "Grass_Top_Right.png", 3)] + [across("Dirt_Middle_Left.png", "Dirt_Middle_Middle.png", "Dirt_Middle_Right.png", 3)] * 10 + [across("Dirt_Bottom_Left.png", "Dirt_Bottom_Middle.png", "Dirt_Bottom_Right.png", 3)]),
    "spikes": laid([["Spike_Double.png"] * 8]),
    "bridge": lore("Bridge.png"), "house": lore("House.png"), "houseFlip": lore("House_flip.png"), "tree": lore("Tree.png.png"), "treeFlip": lore("Tree_flip.png"),
    "sign": lore("Sign_0.png"), "signGrass": lore("Sign_Grass_0.png"), "warning": lore("Wooden_Warning.png"), "boulder": lore("Boulder.png"), "rock": lore("BigRock.png"),
    "bones": lore("DeadGuy.png"), "bonesB": lore("DeadGuy2.png"),
}
PLACES["village"] = {name: {"file": "village/" + save(im, f"village/{name}"), "w": im.width, "h": im.height} for name, im in VILLAGE.items()}
write("places.json", PLACES)
os.makedirs(os.path.join(OUT, "sfx"), exist_ok=True)
for name, file in {"go": "go.ogg", "respawn": "Respawn.wav", "shield": "ShieldSoundEffect.wav", "shieldHit": "ShieldTakingDamageSoundEffect.wav", "over": "GameOver.ogg"}.items():
    shutil.copyfile(os.path.join(FIGHTER, "assets", "MusicAndSoundEffects", file), os.path.join(OUT, "sfx", name + os.path.splitext(file)[1]))

# Recorded sounds supplied for the game, from SRC/sounds, named as src/game/samples.ts plays them. The short ones are
# cut to the sound itself, since some begin with silence that would make them late, and evened out in loudness:
# name: (file, where the sound starts in seconds, how long is kept, how much louder in dB). Needs ffmpeg.
CUTS = {
    "slash1": ("54427377-sword-slash-476148.mp3", 0.567, 0.44, 3), "slash2": ("freesound_community-sword-sound-2-36274.mp3", 0.139, 0.34, 6), "slash3": ("u_xjrmmgxfru-sword-slash-01-266296.mp3", 0.03, 0.36, 8),
    "blast": ("freesound_community-beam-8-43831.mp3", 0.04, 0.82, -2), "bolt": ("freesound_community-laser-bolt-89300.mp3", 0.052, 0.26, 3.5), "start": ("freesound_community-game-start-6104.mp3", 0.04, 1.21, 10), "ui": ("floraphonic-90s-game-ui-2-185095.mp3", 0, 0.42, -3),
}
for name, (file, start, keep, gain) in CUTS.items():
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(start), "-t", str(keep), "-i", os.path.join(SRC, "sounds", file), "-af", f"volume={gain}dB,afade=t=out:st={keep - 0.06:.2f}:d=0.06",
                    "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", os.path.join(OUT, "sfx", name + ".wav")], check=True)
# The pieces of music are used whole: the end of a campaign's last life, and the two loops that
# play in the places that have their own music (src/game/audio.ts, TRACKS).
for name, file in {"lost": "lightyeartraxx-kl-peach-game-over-iii-142453.mp3", "moonlight": "freesound_community-8-bit-moonlight-sonata-music-loop-20436.mp3", "rocky": "sergequadrado-fast-rocky-loop-275535.mp3"}.items():
    shutil.copyfile(os.path.join(SRC, "sounds", file), os.path.join(OUT, "sfx", name + ".mp3"))
# The soundtrack (src/game/audio.ts, Track): mastered far louder than the loops above, so each is measured and set to
# -16 LUFS under a limiter, which at its gain in audio.ts plays as loud as the moonlit forest's.
SOUNDTRACK = {
    "throne": "alex-morgan-dark-trap-lazy-beat-instrumental-587390", "crown": "mondamusic-trap-trap-hype-589115", "crownB": "mondamusic-motivation-drill-trap-560145",
    "ash": "kiravale-phonk-music-593661", "drowned": "sub_clair-phonk-instrumental-610091", "north": "mondamusic-drill-drill-trap-597190",
    "fungal": "rovador-nightmare-circus-414856", "shrine": "moodmode-creepy-devil-dance-166764", "blackspire": "mondamusic-phonk-589113",
    "boss": "apalonbeats-trap-trap-hype-beat-491423", "firstborn": "solarflex-trap-instrumental-558263", "final": "dimmysad-mankind-vs-machines-action-electronic-dubstep-game-420650",
    "duelA": "jonasblakewood-trap-action-623046", "duelB": "alexzavesa-powerful-beat-trap-loop-635537", "duelC": "vaitsez-latin-latino-trap-beat-635218",
    "waves": "kulakovka-background-trap-304347", "wavesLate": "redoctopus-siren-police-trap-194629", "credits": "mondamusic-trap-trap-beat-beats-589144",
}
for name, file in SOUNDTRACK.items():
    path = os.path.join(SRC, "sounds", file + ".mp3")
    meter = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    loud = float(meter.rsplit("Integrated loudness:", 1)[1].split("I:", 1)[1].split("LUFS", 1)[0])
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-af", f"volume={-16 - loud:.2f}dB,alimiter=limit=0.84:level=false",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(OUT, "sfx", name + ".mp3")], check=True)

# ---------- skies: each a set of layers from the farthest to the nearest, drawn behind a level and slid at different rates ----------
sky = lambda *p: os.path.join(SKIES, *p)
dusk = lambda version, *names: [sky("mountaindusk", "Super Mountain Dusk Files", "Assets", version, "layers" if version == "Version C" else "Layers", n + ".png") for n in names]
street = lambda *p: sky("cyberstreet", "cyberpunk-street-files", "Assets", *p)
SKY_SETS = {
    "dawn": [sky("dawn", "The Dawn", "Layers", f"{i}.png") for i in range(1, 9)],
    "demonwoods": [sky("demonwoods", "parallax_demon_woods_pack", "layers", f"parallax-demon-woods-{n}.png") for n in ("bg", "far-trees", "mid-trees", "close-trees")],
    "nightforest": [sky("nightforest", "NightForest", "Layers", f"{i}.png") for i in range(1, 7)],
    "wastelands": [sky("wastelands", "Junk Wastelands Files", "layers", n + ".png") for n in ("back", "middle", "near")],
    "corridors": [sky("corridors", "Cold Corridors Files", "Assets", "Layers", n + ".png") for n in ("back", "far", "middle", "near")],
    "underwater": [sky("underwater", "underwater-fantasy-files", "Assets", "PNG", "layers", n + ".png") for n in ("far", "sand", "foreground-1", "foreground-2")],
    "street": [street("Version 1", "PNG", "layers", n + ".png") for n in ("far-buildings", "back-buildings", "foreground")],
    "skyline": [street("city skyline", "Layers", n + ".png") for n in ("back", "buildings", "front")],
    "synth": [street("Version 2", "Layers", n + ".png") for n in ("back", "middle", "foreground-empty")],
    "duskA": dusk("version A", "sky", "far-clouds", "far-mountains", "near-clouds", "mountains", "trees"),
    "duskB": dusk("version B", "sky", "far-mountains", "middle-mountains", "far-trees", "myst", "near-trees"),
    "duskC": dusk("Version C", "sky", "clouds", "far-mountains", "canyon", "front"),
    "forest": [sky("forest", "Free Pixel Art Forest", "PNG", "Background layers", n + ".png") for n in ("Layer_0011_0", "Layer_0010_1", "Layer_0009_2", "Layer_0008_3", "Layer_0007_Lights", "Layer_0006_4", "Layer_0005_5", "Layer_0004_Lights", "Layer_0003_6", "Layer_0002_7", "Layer_0001_8", "Layer_0000_9")],
    "hills": [sky("hills", "_PNG", f"background{i}.png") for i in range(1, 5)],
}
SKY = {}
for name, files in SKY_SETS.items():
    layers = []
    for i, path in enumerate(files):
        im = Image.open(path).convert("RGBA")
        painted = im.height > 800
        # The painted set is far larger than a screen needs.
        if painted: im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
        layers.append({"file": f"{name}/" + save(im, f"sky/{name}/{i}", painted), "w": im.width, "h": im.height})
    SKY[name] = {"pixel": layers[0]["h"] < 500, "layers": layers}
write("sky.json", SKY)

# ---------- the guide: the Reaper, standing with his scythe out and his eyes showing, as he is when he talks ----------
# (His other standing animation, PassiveIdle, is an empty hood with nothing in his hands.)
save(Image.open(os.path.join(REAPER, "Animation Sprite Sheets (PNG)", "HostileIdleReaper-Sheet.png")).convert("RGBA"), "guide/idle")

# ---------- the interface kit ----------
ui = lambda *p: load("shadow-ui", "SHADOW Series - Pixel UI", *p)
fui = lambda *p: load("shadow-free-ui", "SHADOW Series - Free Ui", *p)
bar = ui("Things", "UI - bar.png"); save(bar, "ui/bar")
buttons = ui("Button", "UI - button.png"); save(buttons.crop((2 * 93, 3 * 33, 3 * 93, 4 * 33)), "ui/button"); save(buttons, "ui/buttons")
save(ui("Icons", "UI - icons.png"), "ui/icons"); save(ui("Icons", "UI - icons2.png"), "ui/icons2")
save(ui("Things", "UI - border.png"), "ui/border")
for i in (1, 2, 3, 4): save(fui("borders", "Sprite", f"border {i}.png"), f"ui/frame{i}")
for i in (1, 2, 3, 5, 6, 7): save(fui("Loading Icons", "Sprite", f"Loading Icons {i}.png"), f"ui/loading{i}")
# ---------- the enemies' attack effects (foefx.py), from SRC/vfx ----------
foefx.build(SRC)
print("cast", {k: (v["w"], v["h"], v["feet"], v["scale"], {a: n["frames"] for a, n in v["anims"].items()}) for k, v in CAST.items()})
print("plants", {k: (v["w"], v["h"], v["frames"]) for k, v in PLANTS.items()})
print("places", {k: len(v) for k, v in PLACES.items()})
