-- The Black Archive (The Forbidden, chapter 4): spiralling in to the room the archive was built to hide. Books built
-- into the very walls, ladders, books on chains, ledgers piled, lecterns by candle, violet sigils that keep it shut,
-- ink spilt; shelves without end on the horizon.
local L = _G.L
local wood = L.ramp(18, 0.4, 0.06, 0.32, 5)
local iron = L.ramp(225, 0.1, 0.06, 0.42, 4)
local paper = L.ramp(44, 0.3, 0.5, 0.86, 4)
local sigil = L.rgb(190, 120, 255)
local books = { L.ramp(270, 0.45, 0.22, 0.55, 3), L.ramp(0, 0.5, 0.24, 0.55, 3), L.ramp(200, 0.4, 0.24, 0.55, 3), L.ramp(42, 0.5, 0.3, 0.65, 3) }
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }

-- Spines of books packed into the rock: the archive is built into Blackspire's stone.
L.piece("f4-wallBooks", 26, 14, { k = 4, wall = true }, function(img, f, ox)
  local F = L.mask(26, 14); L.rect(F, 0, 12, 26, 2); L.rect(F, 0, 0, 26, 1); L.paint(img, F, wood, { dx = ox, alpha = 230 })
  local x = 1
  while x < 25 do local w = 1 + math.floor(L.hash(x, 3, 40) * 2); local h = 7 + math.floor(L.hash(x, 4, 41) * 4)
    local M = L.mask(26, 14); L.rect(M, x, 12 - h, w, h); L.paint(img, M, books[x % 4 + 1], { dx = ox, flat = 0.45, outline = false, alpha = 220 })
    if L.hash(x, 5, 42) > 0.6 then L.put(img, ox + x, 12 - h + 2, L.rgb(220, 190, 110), 200) end
    x = x + w + (L.hash(x, 6, 43) > 0.85 and 2 or 0) end
end)

L.piece("f4-ladder", 10, 40, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(10, 40); L.rect(M, 1, 0, 2, 40); L.rect(M, 7, 0, 2, 40); for y = 3, 39, 5 do L.rect(M, 1, y, 8, 1) end
  L.paint(img, M, wood, { dx = ox, flat = 0.55 })
end)

L.piece("f4-chained", 12, 36, { k = 3, under = true, sway = true }, function(img, f, ox)
  local C = L.mask(12, 36); for i = 0, 6 do if i % 2 == 0 then L.ell(C, 6, 2 + i * 3.5, 1.2, 1.8) else L.rect(C, 6, i * 3.5, 1, 3) end end
  L.paint(img, C, iron, { dx = ox })
  local B = L.mask(12, 36); L.rect(B, 1, 26, 10, 9); L.paint(img, B, books[1], { dx = ox, flat = 0.5 })
  local P = L.mask(12, 36); L.rect(P, 2, 27, 8, 1); L.rect(P, 2, 33, 8, 1); L.fill(img, P, paper[3], 255, ox)
  L.put(img, ox + 6, 30, L.rgb(220, 190, 110)); L.put(img, ox + 6, 31, L.rgb(220, 190, 110))
end)

L.piece("f4-ledgers", 18, 12, { k = 3.2 }, function(img, f, ox)
  for i = 0, 4 do local M = L.mask(18, 12); local w = 12 - (i % 2) * 2; L.rect(M, 2 + (i % 3), 11 - i * 2 - 2, w, 2); L.paint(img, M, books[i % 4 + 1], { dx = ox, flat = 0.5 }) end
  for i = 0, 4 do L.put(img, ox + 2 + (i % 3) + 1, 11 - i * 2 - 1, paper[3]) end
end)

L.piece("f4-lectern", 16, 26, { k = 3.2, light = { 2, -40, 110, "255,180,90" }, flicker = true }, function(img, f, ox)
  local M = L.mask(16, 26); L.rect(M, 7, 10, 2, 14); L.rect(M, 4, 24, 8, 2); L.poly(M, { 2, 10, 14, 6, 14, 9, 2, 12 })
  L.paint(img, M, wood, { dx = ox })
  local B = L.mask(16, 26); L.poly(B, { 3, 9, 8, 7, 13, 5, 13, 7, 8, 9, 3, 11 }); L.paint(img, B, paper, { dx = ox, flat = 0.6 })
  local C = L.mask(16, 26); L.rect(C, 12, 1, 2, 5); L.paint(img, C, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox }); L.kit.flame(img, ox, 12, -1, flame)
end)

L.piece("f4-sigil", 18, 18, { k = 3, wall = true, light = { 0, -27, 90, "170,110,255" } }, function(img, f, ox)
  for t = 0, 47 do local a = t / 48 * math.pi * 2; L.put(img, ox + 9 + math.floor(7 * math.cos(a) + 0.5), 9 + math.floor(7 * math.sin(a) + 0.5), sigil, 230) end
  for i = 0, 2 do local a = i / 3 * math.pi * 2 - math.pi / 2; for r = 0, 6 do L.put(img, ox + 9 + math.floor(r * math.cos(a) + 0.5), 9 + math.floor(r * math.sin(a) + 0.5), sigil, 200) end end
  L.glow(img, ox + 9, 9, 9, sigil, 70)
end)

L.piece("f4-ink", 18, 4, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(18, 4); L.ell(M, 8, 2.5, 7, 1.6); L.ell(M, 15, 3, 2, 1); L.fill(img, M, L.rgb(16, 12, 30), 255, ox)
  L.put(img, ox + 5, 2, L.rgb(90, 80, 140)); L.put(img, ox + 6, 2, L.rgb(70, 60, 120))
end)

L.kit.far("f4-farStacks", 100, 70, L.rgb(22, 18, 34), L.rgb(46, 38, 66), 0.28, function(M)
  for i = 0, 4 do local x = i * 20; local h = 40 + math.floor(L.hash(i, 1, 50) * 26); L.rect(M, x + 2, 70 - h, 16, h); for y = 70 - h + 4, 69, 6 do L.rect(M, x, y, 20, 1) end end
end)
L.kit.crack("f4-crack", L.rgb(20, 16, 30), L.rgb(80, 70, 110))

-- ---- loop 2: whole cases of it standing in the halls, and lamps over the stacks ----
L.piece("f4-case", 30, 48, { k = 3.6 }, function(img, f, ox)
  local F = L.mask(30, 48); L.rect(F, 0, 2, 30, 2); L.rect(F, 0, 2, 2, 46); L.rect(F, 28, 2, 2, 46); L.poly(F, { 0, 3, 15, 0, 30, 3 })
  for y = 13, 46, 11 do L.rect(F, 0, y, 30, 2) end
  L.paint(img, F, wood, { dx = ox })
  local B = L.mask(30, 48); L.rect(B, 2, 4, 26, 42); L.fill(img, B, L.rgb(18, 12, 20), 255, ox)
  for sh = 0, 2 do local x = 2
    while x < 27 do local w = 1 + math.floor(L.hash(x, sh, 60) * 2); local h = 6 + math.floor(L.hash(x, sh, 61) * 3)
      if L.hash(x, sh, 62) > 0.08 then local M = L.mask(30, 48); L.rect(M, x, sh * 11 + 13 - h, w, h); L.paint(img, M, books[(x + sh) % 4 + 1], { dx = ox, flat = 0.5, outline = false }) end
      x = x + w end
  end
end)
L.piece("f4-lamp", 12, 30, { k = 3, under = true, sway = true, light = { 0, 70, 140, "190,140,255" } }, function(img, f, ox)
  local M = L.mask(12, 30); L.rect(M, 6, 0, 1, 18); L.poly(M, { 2, 22, 6, 17, 10, 22 }); L.rect(M, 3, 22, 7, 1); L.paint(img, M, iron, { dx = ox })
  local G = L.mask(12, 30); L.ell(G, 6, 25, 3, 3); L.fill(img, G, L.rgb(200, 160, 255), 255, ox); L.glow(img, ox + 6, 25, 5, L.rgb(230, 210, 255), 140)
end)

-- ---- loop 3: pages along the floors, toppled stacks dark in front ----
L.piece("f4-pages", 16, 4, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 2 do local M = L.mask(16, 4); local x = 1 + i * 5; L.poly(M, { x, 3, x + 4, 2, x + 5, 4, x + 1, 4 }); L.paint(img, M, paper, { dx = ox, flat = 0.55, outline = false }) end
end)
L.kit.silhouette("f4-fgStacks", 40, 40, L.rgb(10, 8, 18), L.rgb(60, 50, 90), function(M)
  for i = 0, 6 do local w = 12 + math.floor(L.hash(i, 2, 70) * 10); local x = 4 + math.floor(L.hash(i, 3, 71) * 12) - (i % 2) * 4; L.rect(M, x, 40 - (i + 1) * 5, w, 5) end
  L.poly(M, { 26, 40, 34, 20, 40, 22, 34, 40 })
end)
