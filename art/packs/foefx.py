# The enemies' own attack effects, cut from the VFX packs unpacked into <packs folder>/vfx (Holy, Thunder 1 and 2,
# Ice, Fire 2, Water 2, Dark): each a strip of equal frames in apps/app/src/game/packs/foefx/, listed in
# foefx.json with its frame size, its count, and where a loop starts. src/game/foefx.ts plays them; none of them is
# ever a fighter's, so an enemy's attack never looks like a player's special.
#   python -I art/packs/foefx.py <folder the packs were unpacked into>   (build.py runs it too)
import json, os, sys
from PIL import Image

def build(src):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "apps", "app", "src", "game", "packs", "foefx")
    os.makedirs(out, exist_ok=True)
    vfx = lambda *p: Image.open(os.path.join(src, "vfx", *p)).convert("RGBA")
    def cells(im, cw, ch, rows=None, first=0, count=None):
        """The frames of a sheet of cw x ch cells, row by row (only `rows`, if given), empty cells left out."""
        got = []
        for r in rows if rows is not None else range(im.height // ch):
            for c in range(im.width // cw):
                cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
                if cell.getchannel("A").getbbox(): got.append(cell)
        return got[first:first + count if count else None]
    dark1 = vfx("Dark VFX 01 - 02", "Dark VFX 1", "Dark VFX 1 (40x32).png")
    ice1, ice2 = ("Ice Effect 01", "Ice Effect 01", "Ice VFX 1"), ("Ice Effect 01", "Ice Effect 01", "Ice VFX 2")
    thunder1, thunder2 = ("Thunder Effect 01", "Thunder Effect 01"), ("Thunder Effect 02", "Thunder Effect 02")
    water = ("Water Effect 2",)
    # name: (frames, where its loop starts, if it loops)
    made = {
        "skull": (cells(dark1, 40, 32, rows=[0]), 0),
        "skullPop": (cells(dark1, 40, 32, rows=[1]), None),
        "ghost": (cells(vfx("Dark VFX 01 - 02", "Dark VFX 2", "Dark VFX 2 (48x64).png"), 48, 64), None),
        "dome": (cells(vfx("Fire Effect 2", "Fire Effect 2", "Explosion 2 SpriteSheet.png"), 48, 48, first=6), None),
        "blast": (cells(vfx("Fire Effect 2", "Fire Effect 2", "Explosion SpriteSheet.png"), 64, 64), None),
        "holyBall": (cells(vfx("Holy VFX 01-02", "Holy VFX 01", "Holy VFX 01 Repeatable.png"), 32, 32), 0),
        "holyPop": (cells(vfx("Holy VFX 01-02", "Holy VFX 01", "Holy VFX 01 Impact.png"), 32, 32), None),
        "shard": (cells(vfx(*ice1, "IceVFX 1 Repeatable.png"), 48, 32), 0),
        "shardPop": (cells(vfx(*ice1, "Ice VFX 1 Hit.png"), 48, 32), None),
        "spikes": (cells(vfx(*ice2, "Ice VFX 2 Start.png"), 32, 32) + cells(vfx(*ice2, "Ice VFX 2 Active.png"), 32, 32) + cells(vfx(*ice2, "Ice VFX 2 Ending.png"), 32, 32), None),
        "bolt": (cells(vfx(*thunder1, "Thunder Projectile 1", "Thunder projectile1 wo blur.png"), 32, 32), 0),
        "boltHit": (cells(vfx(*thunder1, "Thunder Hit", "Thunder hit wo blur.png"), 32, 32), None),
        "slash": (cells(vfx(*thunder1, "Projectile 2", "Projectile 2 wo blur.png"), 48, 48), None),
        "splash": (cells(vfx(*thunder2, "Thunder Splash", "Thunder splash wo blur.png"), 48, 48), None),
        "skyStrike": (cells(vfx(*thunder2, "Thunder Strike", "Thunderstrike wo blur.png"), 64, 64), None),
        "waterBall": (cells(vfx(*water, "Water Ball - Spritesheet", "WaterBall - Startup and Infinite.png"), 64, 64), 4),
        "waterPop": (cells(vfx(*water, "Water Ball - Spritesheet", "WaterBall - Impact.png"), 64, 64), None),
        "geyser": (cells(vfx(*water, "Water Blast - Spritesheet", "Water Blast - Startup and Infinite.png"), 128, 128) + cells(vfx(*water, "Water Blast - Spritesheet", "Water Blast - End.png"), 128, 128), None),
    }
    # The enemies' own shots, from their packs in <packs folder>/foes (foes.py): the Fire Worm's fireball, the
    # Mecha-stone Golem's fist (drawn pointing back, so turned) and its laser, which charges for seven frames.
    foe = lambda *p: Image.open(os.path.join(src, "foes", *p)).convert("RGBA")
    worm = ("Fire Worm", "Fire Worm", "Sprites", "Fire Ball")
    golem = ("Mecha-stone Golem 0.1", "Mecha-stone Golem 0.1", "weapon PNG")
    made["fireball"] = (cells(foe(*worm, "Move.png"), 46, 46), 0)
    made["fireBurst"] = (cells(foe(*worm, "Explosion.png"), 46, 46), None)
    made["fist"] = ([f.transpose(Image.FLIP_LEFT_RIGHT) for f in cells(foe(*golem, "arm_projectile_glowing.png"), 100, 100)], 0)
    made["laser"] = (cells(foe(*golem, "Laser_sheet.png"), 300, 100), None)
    listed = {}
    for name, (frames, loop) in made.items():
        w, h = frames[0].size
        sheet = Image.new("RGBA", (w * len(frames), h))
        for i, f in enumerate(frames): sheet.paste(f, (i * w, 0))
        sheet.save(os.path.join(out, name + ".png"), optimize=True)
        listed[name] = {"w": w, "h": h, "frames": len(frames), **({"loop": loop} if loop is not None else {})}
    with open(os.path.join(out, "..", "foefx.json"), "w", newline="\n") as f: json.dump(listed, f, indent=1); f.write("\n")
    return listed

if __name__ == "__main__":
    print({k: (v["w"], v["h"], v["frames"]) for k, v in build(sys.argv[1]).items()})
