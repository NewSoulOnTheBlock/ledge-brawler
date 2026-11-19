-- The Northern Road (The Exile, chapter 3): the winter road where no village will shelter a runaway. Signposts deep in
-- snow, a wagon wrecked and drifted over, lantern posts rimed with frost, bare birches, field walls broken, a cold
-- fire and a bedroll left by someone else; on the horizon villages whose windows are lit and whose doors are shut.
local L = _G.L
local wood = L.ramp(24, 0.3, 0.1, 0.4, 5)
local birch = L.ramp(40, 0.08, 0.5, 0.9, 4)
local stone = L.ramp(215, 0.08, 0.16, 0.56, 5)
local snow = L.ramp(205, 0.3, 0.72, 0.97, 3)
local iron = L.ramp(220, 0.1, 0.08, 0.42, 4)
local warm = L.rgb(255, 200, 120)

L.piece("x3-signpost", 22, 34, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(22, 34); L.rect(M, 10, 4, 2, 30); L.poly(M, { 1, 8, 18, 8, 21, 10, 18, 12, 1, 12 }); L.poly(M, { 3, 16, 20, 16, 20, 20, 3, 20, 0, 18 }); L.paint(img, M, wood, { dx = ox })
  for x = 4, 15, 2 do L.put(img, ox + x, 10, wood[1]); L.put(img, ox + x + 1, 18, wood[1]) end
  local S = L.mask(22, 34); L.rect(S, 1, 7, 17, 1); L.rect(S, 3, 15, 17, 1); L.ell(S, 11, 33, 9, 2); L.ell(S, 11, 3, 2, 1); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x3-wagon", 40, 20, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(40, 20); L.poly(M, { 3, 6, 36, 9, 34, 15, 2, 13 }); L.paint(img, M, wood, { dx = ox, flat = 0.4 })
  local W = L.mask(40, 20); for t = 0, 39 do local a = t / 40 * math.pi * 2; L.set(W, 9 + 5 * math.cos(a), 15 + 5 * math.sin(a)) end; L.line(W, 4, 15, 14, 15); L.line(W, 9, 10, 9, 20)
  L.paint(img, W, wood, { dx = ox, flat = 0.6 })
  local B = L.mask(40, 20); for i = 0, 3 do L.tube(B, 8 + i * 7, 7, 10 + i * 7, 0, 0.6) end; L.paint(img, B, wood, { dx = ox, flat = 0.45 })
  local S = L.mask(40, 20); L.ell(S, 20, 7, 17, 2.5); L.ell(S, 30, 18, 10, 3); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x3-post", 12, 40, { k = 3.2, light = { 2, -110, 100, "255,200,120" }, flicker = true }, function(img, f, ox)
  local M = L.mask(12, 40); L.rect(M, 4, 8, 2, 32); L.rect(M, 4, 8, 7, 2); L.paint(img, M, wood, { dx = ox })
  local H = L.mask(12, 40); L.rect(H, 8, 10, 4, 7); L.paint(img, H, iron, { dx = ox }); local G = L.mask(12, 40); L.rect(G, 9, 11, 2, 5); L.fill(img, G, warm, 255, ox)
  local S = L.mask(12, 40); L.rect(S, 4, 7, 7, 1); L.ell(S, 5, 39, 5, 1.5); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x3-birch", 22, 54, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(22, 54); L.tube(M, 11, 54, 10, 4, 2.2, 1); L.tube(M, 10, 22, 2, 10, 1, 0.4); L.tube(M, 11, 16, 20, 4, 1, 0.4); L.tube(M, 10, 34, 18, 26, 0.9, 0.3)
  L.paint(img, M, birch, { dx = ox, flat = 0.55 })
  for y = 10, 50, 5 do L.put(img, ox + 10, y, L.rgb(30, 28, 30)); L.put(img, ox + 11, y + 2, L.rgb(30, 28, 30)) end
end)

L.piece("x3-wall", 30, 12, { k = 3.4 }, function(img, f, ox)
  for r = 0, 2 do for c = 0, 4 - r do local M = L.mask(30, 12); L.ell(M, 4 + c * 5.5 + r * 2.5, 10 - r * 3.4, 2.8, 2); L.paint(img, M, stone, { dx = ox, flat = 0.5, seed = r * 7 + c }) end end
  local S = L.mask(30, 12); L.ell(S, 12, 3, 8, 1.4); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x3-coldfire", 24, 8, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(24, 8); for i = 0, 5 do local a = i / 6 * math.pi; L.tube(M, 6 - 4 * math.cos(a), 7, 6 + 4 * math.cos(a), 6, 0.7) end; L.paint(img, M, L.ramp(20, 0.12, 0.08, 0.3, 3), { dx = ox })
  local B = L.mask(24, 8); L.ell(B, 18, 6, 6, 2); L.paint(img, B, L.ramp(0, 0.35, 0.2, 0.5, 3), { dx = ox, flat = 0.5 })
end)

L.kit.far("x3-farVillage", 120, 46, L.rgb(18, 22, 34), L.rgb(70, 90, 120), 0.32, function(M)
  L.rect(M, 0, 38, 120, 8)
  for i = 0, 3 do local x = 8 + i * 30; L.rect(M, x, 26, 14, 12); L.poly(M, { x - 2, 27, x + 7, 18, x + 16, 27 }) end
end)
L.kit.silhouette("x3-fgBirches", 30, 90, L.rgb(10, 12, 18), L.rgb(150, 170, 200), function(M) L.tube(M, 8, 90, 7, 0, 3, 2); L.tube(M, 22, 90, 23, 10, 2.4, 1.6); L.tube(M, 7, 30, 1, 18, 1) end)
L.kit.drape("x3-icicles", L.ramp(195, 0.5, 0.55, 0.95, 3), 14, { taper = true, sway = false, seed = 11 })

-- ---- loop 2: snow lying on every step of the road, and frost in the stone ----
L.piece("x3-snowline", 24, 6, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(24, 6); L.rect(M, 0, 3, 24, 3); for x = 0, 23 do if L.hash(x, 1, 125) > 0.45 then L.set(M, x, 2) end end; L.ell(M, 7, 3, 5, 2); L.ell(M, 18, 3, 4, 1.6)
  L.paint(img, M, snow, { dx = ox, flat = 0.6, outline = false })
end)
L.piece("x3-frost", 20, 16, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 40 do local x, y = math.floor(L.hash(i, 1, 126) * 20), math.floor(L.hash(i, 2, 127) * 16); local d = math.sqrt((x - 10) ^ 2 + (y - 8) ^ 2); if d < 8 then L.put(img, ox + x, y, snow[2], math.floor(200 * (1 - d / 8))) end end
end)
