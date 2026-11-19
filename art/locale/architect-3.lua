-- A Necessary Monster (The Architect, chapter 3): into the mercenaries' camp alone, to leave with an army or not at
-- all. A ragged company, not a host: a table of dice and coin, a grindstone, cages, motley flags of the free companies,
-- a stewpot over the fire, a wagon of loot, the board of contracts, lanterns strung between poles; the stockade far.
local L = _G.L
local wood = L.ramp(26, 0.36, 0.1, 0.4, 5)
local iron = L.ramp(220, 0.1, 0.08, 0.45, 4)
local gold = L.ramp(46, 0.85, 0.35, 0.85, 4)
local paper = L.ramp(44, 0.3, 0.5, 0.86, 4)
local stone = L.ramp(35, 0.06, 0.2, 0.6, 5)
local motley = { L.ramp(120, 0.5, 0.25, 0.55, 3), L.ramp(280, 0.45, 0.25, 0.55, 3), L.ramp(30, 0.65, 0.35, 0.65, 3), L.ramp(190, 0.5, 0.25, 0.55, 3) }
local fire = { L.rgb(255, 110, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }

L.piece("a3-dice", 26, 16, { k = 3.4, light = { 0, -30, 70, "255,200,120" }, flicker = true }, function(img, f, ox)
  local T = L.mask(26, 16); L.rect(T, 1, 7, 24, 2); L.rect(T, 3, 9, 2, 7); L.rect(T, 21, 9, 2, 7); L.paint(img, T, wood, { dx = ox })
  for _, d in ipairs({ { 6, 5 }, { 9, 4 } }) do local D = L.mask(26, 16); L.rect(D, d[1], d[2], 2, 2); L.fill(img, D, L.rgb(235, 230, 215), 255, ox); L.put(img, ox + d[1], d[2], L.rgb(30, 20, 20)) end
  for i = 0, 5 do L.put(img, ox + 13 + (i % 3) * 2, 6 - i // 3, gold[3 + i % 2]) end
  local C = L.mask(26, 16); L.rect(C, 20, 3, 2, 4); L.paint(img, C, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox }); L.kit.flame(img, ox, 20, 1, fire)
end)

L.piece("a3-grindstone", 22, 20, { k = 3.4 }, function(img, f, ox)
  local F = L.mask(22, 20); L.tube(F, 3, 20, 7, 10, 0.8); L.tube(F, 19, 20, 15, 10, 0.8); L.rect(F, 5, 10, 12, 1); L.paint(img, F, wood, { dx = ox })
  local S = L.mask(22, 20); L.disc(S, 11, 9, 6); L.paint(img, S, stone, { dx = ox, flat = 0.5 })
  local H = L.mask(22, 20); L.tube(H, 11, 9, 17, 3, 0.6); L.paint(img, H, iron, { dx = ox, flat = 0.6 }); for i = 0, 3 do L.put(img, ox + 16 + i, 7 - i, L.rgb(255, 220, 140)) end
end)

L.piece("a3-cage", 22, 24, { k = 3.4 }, function(img, f, ox)
  local B = L.mask(22, 24); L.rect(B, 1, 21, 20, 3); L.rect(B, 1, 1, 20, 2); for x = 2, 20, 3 do L.rect(B, x, 3, 1, 18) end; L.paint(img, B, iron, { dx = ox, flat = 0.5 })
  local E = L.mask(22, 24); L.disc(E, 9, 14, 1); L.disc(E, 13, 14, 1); L.fill(img, E, L.rgb(255, 200, 80), 255, ox)
end)

L.piece("a3-flags", 30, 40, { k = 3.4, sway = true }, function(img, f, ox)
  for i, p in ipairs({ { 4, 2 }, { 15, 8 }, { 25, 4 } }) do
    local P = L.mask(30, 40); L.rect(P, p[1], p[2], 1, 40 - p[2]); L.paint(img, P, wood, { dx = ox, outline = false })
    local F = L.mask(30, 40); if i == 2 then L.poly(F, { p[1] + 1, p[2] + 1, p[1] + 9, p[2] + 4, p[1] + 1, p[2] + 8 }) else L.rect(F, p[1] + 1, p[2] + 1, 6, 6) end
    L.paint(img, F, motley[i % 4 + 1], { dx = ox, flat = 0.5 })
    local Sy = L.mask(30, 40); L.disc(Sy, p[1] + 4, p[2] + 4, 1); L.fill(img, Sy, motley[(i + 1) % 4 + 1][3], 255, ox)
  end
end)

L.piece("a3-stew", 18, 22, { k = 3.4, light = { 0, -20, 120, "255,140,50" }, flicker = true, smoke = true }, function(img, f, ox)
  local T = L.mask(18, 22); L.tube(T, 2, 22, 9, 2, 0.7); L.tube(T, 16, 22, 9, 2, 0.7); L.paint(img, T, wood, { dx = ox })
  local P = L.mask(18, 22); L.rect(P, 9, 2, 1, 8); L.ell(P, 9, 13, 5, 4); L.paint(img, P, iron, { dx = ox, flat = 0.45 })
  for i = 0, 6 do local x = 5 + i; local h = math.floor(4 * math.sin((i + 0.5) / 7 * math.pi)); for y = 0, h do L.put(img, ox + x, 21 - y, y > 2 and fire[1] or fire[2]) end end
end)

L.piece("a3-lootWagon", 40, 26, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(40, 26); L.rect(M, 2, 12, 34, 6); L.paint(img, M, wood, { dx = ox })
  for _, wx in ipairs({ 9, 30 }) do local W = L.mask(40, 26); for t = 0, 39 do local a = t / 40 * math.pi * 2; L.set(W, wx + 5 * math.cos(a), 20 + 5 * math.sin(a)) end; L.line(W, wx - 5, 20, wx + 5, 20); L.paint(img, W, wood, { dx = ox, flat = 0.6 }) end
  for i, c in ipairs({ { 5, 6, 8, 6 }, { 14, 4, 9, 8 }, { 24, 7, 8, 5 } }) do local C = L.mask(40, 26); L.rect(C, c[1], c[2], c[3], c[4]); L.paint(img, C, wood, { dx = ox, flat = 0.5, seed = i }) end
  for i = 0, 6 do L.put(img, ox + 16 + i, 3 - (i % 2), gold[3 + i % 2]) end
end)

L.piece("a3-board", 24, 22, { k = 3.2, wall = true }, function(img, f, ox)
  local B = L.mask(24, 22); L.rect(B, 0, 0, 24, 22); L.paint(img, B, wood, { dx = ox, flat = 0.45 })
  for i, n in ipairs({ { 2, 2, 7, 8 }, { 11, 3, 8, 7 }, { 4, 12, 8, 8 }, { 14, 12, 7, 7 } }) do local P = L.mask(24, 22); L.rect(P, n[1], n[2], n[3], n[4]); L.paint(img, P, paper, { dx = ox, flat = 0.6, seed = i, outline = false })
    for y = n[2] + 2, n[2] + n[4] - 2, 2 do for x = n[1] + 1, n[1] + n[3] - 2 do if L.hash(x, y, 200) > 0.4 then L.put(img, ox + x, y, L.rgb(80, 60, 50), 160) end end end
    L.put(img, ox + n[1] + 1, n[2] + 1, i % 2 == 0 and L.rgb(200, 40, 40) or gold[3]) end
end)

L.piece("a3-lanterns", 48, 18, { k = 3, under = true, sway = true, light = { 0, 30, 110, "255,190,110" } }, function(img, f, ox)
  local R = L.mask(48, 18); for x = 0, 47 do L.set(R, x, 1 + math.floor(5 * math.sin(x / 47 * math.pi))) end; L.paint(img, R, wood, { dx = ox, outline = false })
  for i = 0, 3 do local x = 6 + i * 12; local y = 2 + math.floor(5 * math.sin(x / 47 * math.pi)); local G = L.mask(48, 18); L.rect(G, x - 1, y + 1, 3, 4); L.fill(img, G, L.rgb(255, 200, 120), 255, ox); L.glow(img, ox + x, y + 3, 3, L.rgb(255, 230, 170), 140) end
end)

L.kit.far("a3-farStockade", 120, 50, L.rgb(40, 22, 30), L.rgb(130, 70, 70), 0.3, function(M)
  L.rect(M, 0, 40, 120, 10); for x = 0, 118, 4 do local h = 10 + math.floor(L.hash(x, 1, 201) * 4); L.rect(M, x, 40 - h, 3, h); L.poly(M, { x, 40 - h, x + 1.5, 37 - h, x + 3, 40 - h }) end
  L.rect(M, 52, 14, 14, 26); L.poly(M, { 50, 14, 59, 6, 68, 14 })
end)
L.kit.pebbles("a3-dirt", L.ramp(30, 0.25, 0.18, 0.45, 4))

-- ---- loop 2: each company's mark daubed on the rock, patchwork tents, heaps of spoils ----
L.piece("a3-mark", 20, 18, { k = 3.4, wall = true }, function(img, f, ox)
  local c = motley[math.floor(L.hash(1, 1, 202) * 4) + 1][2]
  local M = L.mask(20, 18); L.tube(M, 3, 15, 10, 2, 1); L.tube(M, 10, 2, 17, 15, 1); L.tube(M, 5, 10, 15, 10, 1); L.disc(M, 10, 2, 1.8)
  L.fill(img, M, c, 200, ox); for i = 0, 4 do L.put(img, ox + 4 + i * 3, 16 + (i % 2), c, 150) end
end)
L.piece("a3-tent", 34, 24, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(34, 24); L.poly(M, { 1, 24, 17, 3, 33, 24 })
  L.each(M, function(x, y) local p = motley[((x // 6) + (y // 6)) % 4 + 1]; L.put(img, ox + x, y, p[(x + y) % 3 == 0 and 1 or 2]) end)
  local D = L.mask(34, 24); L.poly(D, { 13, 24, 17, 12, 21, 24 }); L.fill(img, D, L.rgb(28, 18, 14), 255, ox)
  local P = L.mask(34, 24); L.rect(P, 16, 0, 2, 4); L.paint(img, P, wood, { dx = ox })
end)
L.piece("a3-spoils", 26, 12, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(26, 12); L.ell(M, 13, 12, 12, 6); L.paint(img, M, L.ramp(30, 0.3, 0.2, 0.5, 4), { dx = ox, flat = 0.5, noise = 0.4 })
  for i = 0, 9 do L.put(img, ox + 4 + math.floor(L.hash(i, 1, 203) * 18), 6 + math.floor(L.hash(i, 2, 204) * 4), gold[3 + i % 2]) end
  local S = L.mask(26, 12); L.tube(S, 6, 9, 14, 2, 0.6); L.paint(img, S, iron, { dx = ox, flat = 0.6 }); local Sh = L.mask(26, 12); L.ell(Sh, 19, 7, 3, 3.4); L.paint(img, Sh, motley[1], { dx = ox })
end)
