# Paints the level maps maps.mjs wrote: python -I workbench/capture/maps.py <folder>. One PNG a level, 6 pixels a cell.
import glob, os, sys
from PIL import Image, ImageDraw
K = 6
INK = {"#": (28, 24, 34), ".": (86, 96, 116), "-": (214, 190, 120), "^": (220, 60, 50), "S": (90, 220, 120), "e": (240, 150, 60), "c": (150, 130, 110),
       "C": (250, 220, 60), "X": (90, 240, 220), "P": (255, 255, 255), "B": (255, 60, 200)}
for path in sorted(glob.glob(os.path.join(sys.argv[1], "*.txt"))):
    rows = open(path).read().split("\n")
    im = Image.new("RGB", (len(rows[0]) * K, len(rows) * K), INK["#"]); d = ImageDraw.Draw(im)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "#": continue
            d.rectangle((x * K, y * K, x * K + K - 1, y * K + K - 1), fill=INK["."])
            if ch == "-": d.rectangle((x * K, y * K, x * K + K - 1, y * K + 1), fill=INK["-"])
            elif ch == "^": d.polygon([(x * K, y * K + K - 1), (x * K + K // 2, y * K + 1), (x * K + K - 1, y * K + K - 1)], fill=INK["^"])
            elif ch != ".": d.rectangle((x * K + 1, y * K + 1, x * K + K - 2, y * K + K - 2), fill=INK[ch])
    im.save(path[:-4] + ".png")
