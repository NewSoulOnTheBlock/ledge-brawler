-- The Two Swords (The Exile, chapter 2): following the pull of the blades through the foothills. Pairs of blades
-- planted crossed in the snow, a grave of rusted swords, boulders capped with snow, frosted grass, a wayside gate,
-- the strata of the hills in their rock and ore glinting in it; ridges and a ruined watchtower far, pines near.
local L = _G.L
local steel = L.ramp(210, 0.12, 0.3, 0.86, 5)
local rust = L.ramp(18, 0.5, 0.16, 0.45, 4)
local hilt = L.ramp(0, 0.5, 0.12, 0.4, 3)
local stone = L.ramp(215, 0.1, 0.16, 0.6, 5)
local snow = L.ramp(205, 0.3, 0.72, 0.97, 3)
local wood = L.ramp(20, 0.35, 0.1, 0.38, 5)
local frost = L.ramp(170, 0.18, 0.4, 0.82, 4)

-- One blade planted at (x, 30), leaning `lean`, `len` long.
local function blade(img, ox, x, lean, len, ramp)
  local M = L.mask(24, 32); L.tube(M, x, 31, x + lean, 31 - len, 0.8, 0.3); L.paint(img, M, ramp, { dx = ox, flat = 0.6, rim = L.rgb(240, 248, 255) })
  local G = L.mask(24, 32); local gx, gy = x + lean * (len - 2) / len, 31 - len + 2
  L.rect(G, gx - 2, gy, 5, 1); L.tube(G, gx, gy, gx + lean * 0.2, gy - 4, 0.7); L.paint(img, G, hilt, { dx = ox })
end
L.piece("x2-crossed", 24, 32, { k = 3.4 }, function(img, f, ox)
  blade(img, ox, 9, 6, 26, steel); blade(img, ox, 15, -6, 26, steel)
  local S = L.mask(24, 32); L.ell(S, 12, 31, 8, 2); L.paint(img, S, snow, { dx = ox, outline = false })
end)
L.piece("x2-graveSwords", 24, 32, { k = 3.4 }, function(img, f, ox)
  for i = 0, 3 do blade(img, ox, 3 + i * 6, (L.hash(i, 1, 120) - 0.5) * 6, 14 + math.floor(L.hash(i, 2, 121) * 8), rust) end
  local S = L.mask(24, 32); L.ell(S, 12, 31, 11, 2); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x2-boulder", 22, 14, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(22, 14); L.ell(M, 11, 9, 10, 6); L.ell(M, 6, 10, 5, 4); L.paint(img, M, stone, { dx = ox, flat = 0.45 })
  local S = L.mask(22, 14); L.ell(S, 11, 4, 8, 2.2); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.kit.tuft("x2-frostGrass", frost, 8, { seed = 51 })

L.piece("x2-gate", 34, 40, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(34, 40); L.rect(M, 5, 6, 3, 34); L.rect(M, 26, 6, 3, 34); L.poly(M, { 0, 4, 34, 4, 32, 8, 2, 8 }); L.rect(M, 3, 12, 28, 2)
  L.paint(img, M, wood, { dx = ox })
  local S = L.mask(34, 40); L.rect(S, 1, 2, 32, 2); L.paint(img, S, snow, { dx = ox, outline = false })
  local T = L.mask(34, 40); L.rect(T, 15, 14, 4, 6); L.paint(img, T, L.ramp(44, 0.3, 0.5, 0.85, 3), { dx = ox })
end)

-- The strata of the hills, and ore glinting in them.
L.piece("x2-strata", 40, 14, { k = 3.4, wall = true }, function(img, f, ox)
  for i = 0, 2 do local y0 = 2 + i * 5; for x = 0, 39 do local y = y0 + math.floor(math.sin(x / 9 + i) * 1.5); L.put(img, ox + x, y, stone[i % 2 == 0 and 5 or 1], 220); L.put(img, ox + x, y + 1, stone[i % 2 == 0 and 4 or 2], 160) end end
end)
L.piece("x2-ore", 12, 10, { k = 3, wall = true }, function(img, f, ox)
  for i = 0, 4 do local x, y = 2 + math.floor(L.hash(i, 1, 122) * 8), 2 + math.floor(L.hash(i, 2, 123) * 6); L.put(img, ox + x, y, L.rgb(140, 220, 255)); L.put(img, ox + x + 1, y, L.rgb(80, 150, 210)); L.put(img, ox + x, y + 1, L.rgb(60, 110, 170)) end
end)

L.kit.far("x2-farRidge", 120, 60, L.rgb(70, 90, 120), L.rgb(220, 230, 245), 0.25, function(M)
  L.poly(M, { 0, 60, 0, 40, 20, 24, 40, 36, 64, 16, 90, 34, 108, 26, 120, 34, 120, 60 })
  L.rect(M, 60, 8, 6, 12); L.rect(M, 59, 6, 2, 3); L.rect(M, 64, 6, 2, 3)
end)
L.kit.silhouette("x2-fgPine", 30, 80, L.rgb(10, 16, 22), L.rgb(170, 200, 220), function(M)
  L.rect(M, 14, 50, 3, 30); for i = 0, 4 do local y = 6 + i * 11; L.poly(M, { 15, y - 6, 15 - (5 + i * 3), y + 8, 15 + (5 + i * 3), y + 8 }) end
end)

-- ---- loop 2: snow cornices over every ledge, icicles under them ----
L.piece("x2-cornice", 14, 16, { k = 3.2, under = true }, function(img, f, ox)
  local S = L.mask(14, 16); L.ell(S, 7, 2, 7, 3); L.paint(img, S, snow, { dx = ox, outline = false })
  for i = 0, 4 do local x = 2 + i * 2.5; local l = 4 + math.floor(L.hash(i, 1, 124) * 10); local M = L.mask(14, 16); L.poly(M, { x - 1, 3, x, 3 + l, x + 1, 3 }); L.paint(img, M, L.ramp(195, 0.5, 0.55, 0.95, 3), { dx = ox, outline = false }) end
end)
