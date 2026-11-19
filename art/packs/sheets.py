# What the pack builds share: where the game's art goes, saving into it, and cutting a character into one grid of
# equal cells (build.py, foes.py).
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "apps", "app", "src", "game", "packs")
os.makedirs(OUT, exist_ok=True)

def save(im, name, lossy=False):
    path = os.path.join(OUT, name + (".webp" if lossy else ".png"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, **({"quality": 88, "method": 6} if lossy else {"optimize": True}))
    return os.path.basename(path)
empty = lambda im: im.getchannel("A").getbbox() is None

def strip(im, cw):
    return [im.crop((i * cw, 0, (i + 1) * cw, im.height)) for i in range(im.width // cw)]
def row(sheet, cw, ch, r):
    out = []
    for i in range(sheet.width // cw):
        cell = sheet.crop((i * cw, r * ch, (i + 1) * cw, (r + 1) * ch))
        if empty(cell): break
        out.append(cell)
    return out
def cast(name, anims, fps, target, faces=1):
    """anims: {anim: [frames]}; target: how tall the character stands in the world."""
    cw, ch = anims["idle"][0].size
    frames, index = [], {}
    for anim, cells in anims.items():
        index[anim] = {"start": len(frames), "frames": len(cells), "fps": fps.get(anim, 10)}
        frames += cells
    cols = min(len(frames), max(1, 2048 // cw))
    sheet = Image.new("RGBA", (cols * cw, -(-len(frames) // cols) * ch))
    for i, cell in enumerate(frames): sheet.paste(cell, ((i % cols) * cw, (i // cols) * ch))
    x0, y0, x1, y1 = anims["idle"][0].getchannel("A").getbbox()
    a = anims["idle"][0].getchannel("A").load()
    low = sorted(x for y in range(y1 - max(2, (y1 - y0) // 4), y1) for x in range(x0, x1) if a[x, y] > 24)
    return {"file": save(sheet, "cast/" + name), "w": cw, "h": ch, "cols": cols, "feet": [low[len(low) // 2], y1],
            "scale": round(target / (y1 - y0), 2), "faces": faces, "anims": index}
