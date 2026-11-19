# The twelve enemies that each belong to one level (src/game/cast.ts, `home`), and the spirits the Undead Executioner
# raises: cut from the packs unpacked into <packs folder>/foes into packs/cast/, and listed in packs/cast.json beside
# the others. Fire Worm is CC0; the rest came with no licence text and are treated as the other packs are.
#   python -I art/packs/foes.py <folder the packs were unpacked into>   (build.py runs it too)
import json, os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheets import OUT, cast, empty

def build(src):
    at = lambda *p: os.path.join(src, "foes", *p)
    load = lambda *p: Image.open(at(*p)).convert("RGBA")
    def grid(im, cw, ch):
        """Every cell of cw x ch that has anything in it, row by row."""
        cells = [im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(im.height // ch) for c in range(im.width // cw)]
        return [cell for cell in cells if not empty(cell)]
    down = lambda im, cw, ch: grid(im, cw, ch)  # a strip read top to bottom is a grid one cell wide
    made = {}
    n = load("NightBorne", "NightBorne.png")
    rows = [grid(n.crop((0, r * 80, n.width, (r + 1) * 80)), 80, 80) for r in range(5)]
    made["nightborne"] = cast("nightborne", {"idle": rows[0], "run": rows[1], "attack": rows[2], "special": rows[2], "hit": rows[3], "death": rows[4]}, {"attack": 16, "special": 22, "run": 12, "death": 14}, 104)
    w = lambda f: grid(load("Fire Worm", "Fire Worm", "Sprites", "Worm", f), 90, 90)
    made["fireworm"] = cast("fireworm", {"idle": w("Idle.png"), "run": w("Walk.png"), "attack": w("Attack.png"), "special": w("Attack.png"), "hit": w("Get Hit.png"), "death": w("Death.png")}, {"attack": 18, "special": 14, "death": 12}, 82)
    s = lambda f: down(load("stormhead", "stormhead", f), 119, 124)
    made["stormhead"] = cast("stormhead", {"idle": s("idle.png"), "run": s("run.png"), "attack": s("attack.png"), "special": s("attack.png"), "hit": s("damaged.png"), "death": s("death.png")}, {"attack": 20, "special": 14, "run": 12}, 112)
    m = lambda f: down(load("Mud Guard", "Mud Guard", f), 82, 23)
    hurt = m("damaged and death.png")
    made["mudguard"] = cast("mudguard", {"idle": m("idle.png"), "run": m("Run.png"), "attack": m("attack 1.png"), "attack2": m("attack 2.png"), "special": m("attack 2.png"), "hit": hurt[:2], "death": hurt[2:]}, {"attack": 14, "attack2": 14, "special": 10, "run": 12}, 54)
    p = lambda f: down(load("Small Monster", "Small Monster", f), 82, 39)
    hurt = p("small modeath and damagedt.png")
    made["sprout"] = cast("sprout", {"idle": p("small moidle.png"), "run": p("small morun.png"), "attack": p("attack.png"), "special": p("attack.png"), "hit": hurt[:2], "death": hurt[2:]}, {"attack": 18, "special": 12, "run": 12}, 62)
    t = lambda f: grid(load("Toaster Bot", "Toaster Bot", f), 106, 22)
    made["toaster"] = cast("toaster", {"idle": t("idle.png"), "run": t("run.png"), "attack": t("attack.png"), "special": t("attack.png"), "hit": t("damaged.png"), "death": t("death.png")}, {"attack": 16, "special": 8, "run": 14}, 46)
    d = lambda f: down(load("Droid Zapper", "Droid Zapper", f), 58, 41)
    hurt, wake = d("damaged and death.png"), d("wake.png")
    made["droid"] = cast("droid", {"idle": wake[-1:], "wake": wake, "run": d("run.png"), "attack": d("attack.png"), "special": d("attack.png"), "hit": hurt[:2], "death": hurt[2:]}, {"attack": 16, "special": 14, "run": 12}, 58)
    b = lambda f: down(load("Bot Wheel", "Bot Wheel", f), 117, 26)
    made["botwheel"] = cast("botwheel", {"idle": b("static idle.png"), "run": b("move with FX.png"), "attack": b("shoot with FX.png"), "attack2": b("charge.png"), "special": b("GAS dash with FX.png"), "hit": b("damaged.png"), "death": b("death.png")}, {"run": 14, "attack": 12, "special": 14}, 62)
    g = load("Mecha-stone Golem 0.1", "Mecha-stone Golem 0.1", "PNG sheet", "Character_sheet.png")
    rows = [grid(g.crop((0, r * 100, g.width, (r + 1) * 100)), 100, 100) for r in range(9)]
    made["golem"] = cast("golem", {"idle": rows[0], "run": rows[1], "attack": rows[4], "attack2": rows[2], "special": rows[5], "hit": rows[3][:2], "death": rows[7] + rows[8]}, {"attack": 12, "attack2": 12, "special": 8, "death": 10, "run": 8}, 132)
    e = lambda f: grid(load("Undead executioner (1)", "Undead executioner puppet", "png", f), 100, 100)
    made["executioner"] = cast("executioner", {"idle": e("idle.png"), "run": e("idle2.png"), "attack": e("attacking.png"), "attack2": e("skill1.png"), "special": e("summon.png"), "death": e("death.png")}, {"attack": 16, "attack2": 14, "special": 8, "death": 14}, 120)
    r = lambda f: grid(load("Undead executioner (1)", "Undead executioner puppet", "png", f), 50, 50)
    v = lambda f: grid(load("EVil Wizard 2", "EVil Wizard 2", "Sprites", f), 250, 250)
    made["wizard"] = cast("wizard", {"idle": v("Idle.png"), "run": v("Run.png"), "attack": v("Attack1.png"), "special": v("Attack2.png"), "jump": v("Jump.png"), "fall": v("Fall.png"), "hit": v("Take hit.png"), "death": v("Death.png")}, {"attack": 14, "special": 10, "run": 12, "death": 10}, 110)
    # Its licence: use in a game, never as an asset on its own, and never in an NFT.
    k = lambda f: grid(load("FREE_Samurai 2D Pixel Art v1.2", "FREE_Samurai 2D Pixel Art v1.2", "Sprites", f), 96, 96)
    made["ronin"] = cast("ronin", {"idle": k("IDLE.png"), "run": k("RUN.png"), "attack": k("ATTACK 1.png"), "special": k("ATTACK 1.png"), "hit": k("HURT.png")}, {"attack": 16, "special": 10, "run": 16}, 90)
    made["spirit"] = cast("spirit", {"idle": r("summonIdle.png"), "run": r("summonIdle.png"), "wake": r("summonAppear.png"), "death": r("summonDeath.png")}, {"idle": 10, "run": 12}, 40)
    return made

if __name__ == "__main__":
    # Alone: added to the cast build.py last wrote.
    path = os.path.join(OUT, "cast.json")
    with open(path) as f: listed = json.load(f)
    made = build(sys.argv[1]); listed.update(made)
    with open(path, "w", newline="\n") as f: json.dump(listed, f, indent=1); f.write("\n")
    print({k: (v["w"], v["h"], v["scale"], {a: n["frames"] for a, n in v["anims"].items()}) for k, v in made.items()})
