-- The Silent Procession (The Forbidden, chapter 5): the convoy's road through the woods, and what lies off it.
-- Lantern posts and milestones, cart wheels in the ditch, manacles dropped, a shrine at the roadside, dead trees and
-- their crows, roots in the rock and ivy over the edges; on the horizon the procession itself, hooded and silent.
local L = _G.L
local wood = L.ramp(26, 0.32, 0.08, 0.36, 5)
local dead = L.ramp(250, 0.08, 0.08, 0.34, 4)
local stone = L.ramp(35, 0.06, 0.12, 0.56, 5)
local iron = L.ramp(220, 0.08, 0.08, 0.42, 4)
local ivy = L.ramp(120, 0.35, 0.1, 0.38, 4)
local root = L.ramp(28, 0.3, 0.1, 0.34, 4)
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }

L.piece("f5-post", 14, 40, { k = 3.2, light = { 4, -100, 120, "255,180,90" }, flicker = true }, function(img, f, ox)
  local M = L.mask(14, 40); L.rect(M, 3, 4, 2, 36); L.rect(M, 3, 4, 9, 2); L.rect(M, 1, 38, 6, 2)
  L.paint(img, M, wood, { dx = ox })
  local H = L.mask(14, 40); L.rect(H, 9, 6, 4, 1); L.rect(H, 9, 13, 4, 1); L.rect(H, 9, 7, 1, 6); L.rect(H, 12, 7, 1, 6); L.paint(img, H, iron, { dx = ox })
  local G = L.mask(14, 40); L.rect(G, 10, 7, 2, 6); L.fill(img, G, L.rgb(255, 205, 120), 240, ox); L.kit.flame(img, ox, 10, 9, flame)
end)

L.piece("f5-milestone", 12, 14, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(12, 14); L.rect(M, 2, 5, 8, 9); L.ell(M, 6, 5, 4, 4); L.paint(img, M, stone, { dx = ox })
  for _, p in ipairs({ { 4, 6 }, { 5, 6 }, { 7, 6 }, { 5, 8 }, { 6, 8 }, { 7, 9 } }) do L.put(img, ox + p[1], p[2], stone[1]) end
  local V = L.mask(12, 14); L.rect(V, 1, 11, 10, 3); L.paint(img, V, ivy, { dx = ox, outline = false })
end)

L.piece("f5-wheel", 18, 18, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(18, 18)
  for t = 0, 59 do local a = t / 60 * math.pi * 2; L.set(M, 9 + 7.5 * math.cos(a), 9 + 7.5 * math.sin(a)); L.set(M, 9 + 6.8 * math.cos(a), 9 + 6.8 * math.sin(a)) end
  for i = 0, 5 do local a = i / 6 * math.pi; L.line(M, 9 - 7 * math.cos(a), 9 - 7 * math.sin(a), 9 + 7 * math.cos(a), 9 + 7 * math.sin(a)) end
  L.disc(M, 9, 9, 1.8); L.paint(img, M, wood, { dx = ox, flat = 0.5 })
end)

L.piece("f5-manacles", 14, 5, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(14, 5); L.ell(M, 3, 3, 2.2, 1.6); L.ell(M, 11, 3, 2.2, 1.6); for x = 5, 9 do L.set(M, x, 2 + (x % 2)) end
  L.paint(img, M, iron, { dx = ox, flat = 0.5 }); L.put(img, ox + 3, 3, L.rgb(0, 0, 0)); L.put(img, ox + 11, 3, L.rgb(0, 0, 0))
end)

L.piece("f5-shrine", 16, 28, { k = 3.2, light = { 0, -40, 80, "255,190,110" } }, function(img, f, ox)
  local M = L.mask(16, 28); L.rect(M, 7, 12, 2, 16); L.rect(M, 2, 4, 12, 9); L.poly(M, { 0, 5, 8, 0, 16, 5 })
  L.paint(img, M, wood, { dx = ox })
  local N = L.mask(16, 28); L.rect(N, 4, 6, 8, 6); L.fill(img, N, L.rgb(30, 20, 16), 255, ox)
  local C = L.mask(16, 28); L.rect(C, 7, 8, 2, 4); L.paint(img, C, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox }); L.kit.flame(img, ox, 7, 6, flame)
end)

L.piece("f5-deadTree", 30, 50, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 50)
  L.tube(M, 15, 50, 14, 16, 3, 1.5); L.tube(M, 14, 26, 5, 12, 1.4, 0.5); L.tube(M, 14, 20, 24, 6, 1.4, 0.4); L.tube(M, 15, 34, 25, 26, 1.2, 0.4); L.tube(M, 5, 12, 2, 4, 0.6, 0.3); L.tube(M, 24, 6, 27, 1, 0.5, 0.3)
  L.tube(M, 15, 49, 8, 50, 1.5); L.tube(M, 15, 49, 22, 50, 1.5)
  L.paint(img, M, dead, { dx = ox, flat = 0.4 })
  for _, c in ipairs({ { 6, 11 }, { 22, 5 } }) do local B = L.mask(30, 50); L.ell(B, c[1], c[2] - 1, 1.6, 1.3); L.disc(B, c[1] + 1.4, c[2] - 2.4, 1); L.fill(img, B, L.rgb(14, 12, 20), 255, ox) end
end)

L.kit.drape("f5-ivy", ivy, 22, { seed = 5 })
L.kit.drape("f5-roots", root, 18, { taper = true, seed = 8, sway = false })
L.kit.bricks("f5-cobble", stone, { alpha = 150, gaps = 0.45 })
L.kit.pebbles("f5-gravel", stone)
L.kit.far("f5-farProcession", 120, 40, L.rgb(16, 14, 24), L.rgb(40, 36, 56), 0.35, function(M)
  L.rect(M, 0, 34, 120, 6)
  for i = 0, 8 do local x = 6 + i * 13; L.poly(M, { x, 34, x + 2, 22, x + 4, 19, x + 6, 22, x + 8, 34 }); L.disc(M, x + 4, 20, 2.4) end
  L.rect(M, 58, 12, 1, 22); L.poly(M, { 59, 12, 66, 14, 59, 17 })
end)
L.kit.silhouette("f5-fgTrunk", 26, 90, L.rgb(8, 7, 14), L.rgb(40, 36, 56), function(M)
  L.tube(M, 13, 90, 12, 0, 7, 5); L.tube(M, 12, 30, 0, 14, 2.5, 1); L.tube(M, 13, 86, 3, 90, 3); L.tube(M, 13, 86, 24, 90, 3)
end)

-- ---- loop 2: the road itself, and the dry grass at its sides ----
L.kit.tuft("f5-grass", L.ramp(60, 0.3, 0.2, 0.55, 4), 7, { seed = 13 })
L.kit.tuft("f5-grassTall", L.ramp(70, 0.28, 0.18, 0.5, 4), 11, { seed = 17 })
L.piece("f5-roadStones", 24, 5, { k = 3.4, wall = true }, function(img, f, ox)
  for i = 0, 4 do local M = L.mask(24, 5); L.ell(M, 2.5 + i * 4.8, 3, 2.2, 1.6); L.paint(img, M, stone, { dx = ox, flat = 0.5, seed = i }) end
end)
