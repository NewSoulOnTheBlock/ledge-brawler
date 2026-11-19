# Puts the levels' own props (art/locale/png, drawn by build.lua in Aseprite) on one atlas for the game:
# apps/app/src/game/packs/locale/atlas.png, and locale.json beside it in the scenery's own form ({file, x, y, w, h, k,
# ...flags}), which places.ts adds to the scenery.
#   python -I art/locale/pack.py
import json, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PNG = os.path.join(HERE, "png")
OUT = os.path.join(HERE, "..", "..", "apps", "app", "src", "game", "packs", "locale")
os.makedirs(OUT, exist_ok=True)
meta = json.load(open(os.path.join(PNG, "meta.json")))
ims = {name: Image.open(os.path.join(PNG, name + ".png")).convert("RGBA") for name in meta}
# Shelves, tallest first, 2048 wide, a pixel apart so nothing bleeds into its neighbour.
W, x, y, row, at = 2048, 0, 0, 0, {}
for name in sorted(ims, key=lambda n: (-ims[n].height, n)):
    im = ims[name]
    if x + im.width > W: x, y, row = 0, y + row + 1, 0
    at[name] = (x, y); x += im.width + 1; row = max(row, im.height)
atlas = Image.new("RGBA", (W, y + row))
listed = {}
for name, (px, py) in at.items():
    atlas.paste(ims[name], (px, py))
    listed[name] = {"file": "locale/atlas.png", "x": px, "y": py, "w": ims[name].width, "h": ims[name].height, **meta[name]}
atlas.save(os.path.join(OUT, "atlas.png"), optimize=True)
with open(os.path.join(OUT, "locale.json"), "w", newline="\n") as f: json.dump(listed, f, indent=0); f.write("\n")
print(len(listed), "pieces,", atlas.size, os.path.getsize(os.path.join(OUT, "atlas.png")) // 1024, "KB")
