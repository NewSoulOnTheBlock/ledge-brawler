-- The Bastard Prince (The Architect, chapter 1): out of the household that stored him, the night it changes hands. His
-- mother's world of machines: gears turning in the walls, brass orreries and globes, a telescope at the window, jars of
-- relic fragments, her notes pinned up, tapestries, chandeliers, the family's portraits; the palace far, never his.
local L = _G.L
local brass = L.ramp(42, 0.75, 0.25, 0.8, 5)
local copper = L.ramp(20, 0.55, 0.2, 0.62, 4)
local wood = L.ramp(18, 0.4, 0.08, 0.36, 5)
local paper = L.ramp(44, 0.3, 0.5, 0.86, 4)
local cloth = L.ramp(230, 0.45, 0.15, 0.45, 4)
local gold = L.ramp(44, 0.85, 0.32, 0.82, 4)
local glassG = L.ramp(160, 0.4, 0.3, 0.75, 3)
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }

-- A gear of `teeth` teeth, radius r, centre (cx, cy), into mask M.
local function gear(M, cx, cy, r, teeth)
  L.disc(M, cx, cy, r)
  for t = 0, teeth - 1 do local a = t / teeth * math.pi * 2; L.disc(M, cx + (r + 1.2) * math.cos(a), cy + (r + 1.2) * math.sin(a), 1.1) end
end
L.piece("a1-gears", 30, 22, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(30, 22); gear(M, 9, 11, 7, 10); gear(M, 22, 8, 4.5, 8); gear(M, 23, 18, 3, 6); L.paint(img, M, brass, { dx = ox, flat = 0.5, alpha = 230 })
  for _, c in ipairs({ { 9, 11, 2.5 }, { 22, 8, 1.6 }, { 23, 18, 1 } }) do local H = L.mask(30, 22); L.disc(H, c[1], c[2], c[3]); L.fill(img, H, L.rgb(30, 20, 14), 255, ox) end
  for i = 0, 3 do local a = i / 4 * math.pi * 2 + 0.4; for r = 3, 6 do L.put(img, ox + 9 + math.floor(r * math.cos(a) + 0.5), 11 + math.floor(r * math.sin(a) + 0.5), brass[2]) end end
end)

L.piece("a1-orrery", 30, 34, { k = 3.4, light = { 0, -60, 80, "255,220,150" } }, function(img, f, ox)
  local B = L.mask(30, 34); L.rect(B, 12, 22, 6, 10); L.rect(B, 8, 31, 14, 3); L.paint(img, B, wood, { dx = ox })
  local R = L.mask(30, 34)
  for t = 0, 59 do local a = t / 60 * math.pi * 2; L.set(R, 15 + 13 * math.cos(a), 14 + 4 * math.sin(a)); L.set(R, 15 + 8 * math.cos(a), 14 + 7 * math.sin(a)) end
  L.rect(R, 14, 14, 2, 9); L.paint(img, R, brass, { dx = ox, flat = 0.6, outline = false })
  local S = L.mask(30, 34); L.disc(S, 15, 14, 3); L.fill(img, S, L.rgb(255, 220, 120), 255, ox); L.glow(img, ox + 15, 14, 5, L.rgb(255, 240, 180), 120)
  for _, p in ipairs({ { 2, 14, 1.6, L.rgb(120, 160, 230) }, { 23, 8, 1.4, L.rgb(220, 120, 90) }, { 21, 20, 1.2, L.rgb(160, 220, 160) } }) do local P = L.mask(30, 34); L.disc(P, p[1], p[2], p[3]); L.fill(img, P, p[4], 255, ox) end
end)

L.piece("a1-telescope", 28, 30, { k = 3.4 }, function(img, f, ox)
  local L1 = L.mask(28, 30); L.tube(L1, 9, 30, 13, 16, 0.8); L.tube(L1, 17, 30, 13, 16, 0.8); L.tube(L1, 13, 30, 13, 16, 0.7); L.paint(img, L1, wood, { dx = ox })
  local T = L.mask(28, 30); L.tube(T, 6, 20, 26, 6, 1.6, 2.6); L.paint(img, T, brass, { dx = ox, flat = 0.55 })
  local Lens = L.mask(28, 30); L.ell(Lens, 26, 6, 1.4, 2.6); L.fill(img, Lens, L.rgb(170, 220, 255), 255, ox)
end)

L.piece("a1-jars", 24, 14, { k = 3.2, wall = true }, function(img, f, ox)
  local S = L.mask(24, 14); L.rect(S, 0, 12, 24, 2); L.paint(img, S, wood, { dx = ox })
  for i = 0, 3 do local x = 2 + i * 6; local M = L.mask(24, 14); L.rect(M, x, 4, 4, 8); L.rect(M, x + 1, 3, 2, 1); L.paint(img, M, glassG, { dx = ox, flat = 0.55, alpha = 200 })
    local Fr = L.mask(24, 14); L.poly(Fr, { x + 1, 10, x + 2, 6, x + 3, 10 }); L.fill(img, Fr, i % 2 == 0 and L.rgb(220, 180, 255) or L.rgb(150, 240, 255), 255, ox); L.put(img, ox + x + 1, 5, L.rgb(255, 255, 255)) end
end)

L.piece("a1-notes", 26, 18, { k = 3.2, wall = true }, function(img, f, ox)
  for i, n in ipairs({ { 1, 2, 9, 11 }, { 9, 0, 10, 13 }, { 17, 4, 8, 11 } }) do local M = L.mask(26, 18); L.rect(M, n[1], n[2], n[3], n[4]); L.paint(img, M, paper, { dx = ox, flat = 0.6, seed = i, outline = false })
    for y = n[2] + 2, n[2] + n[4] - 2, 2 do for x = n[1] + 1, n[1] + n[3] - 2 do if L.hash(x, y, 180 + i) > 0.35 then L.put(img, ox + x, y, L.rgb(80, 60, 50), 170) end end end
    L.put(img, ox + n[1] + n[3] // 2, n[2], L.rgb(200, 40, 40)) end
  for t = 0, 15 do local a = t / 16 * math.pi * 2; L.put(img, ox + 14 + math.floor(3 * math.cos(a) + 0.5), 7 + math.floor(3 * math.sin(a) + 0.5), L.rgb(60, 80, 140)) end
end)

L.piece("a1-tapestry", 20, 32, { k = 3.2, wall = true, sway = true }, function(img, f, ox)
  local R = L.mask(20, 32); L.rect(R, 0, 0, 20, 2); L.paint(img, R, brass, { dx = ox })
  local M = L.mask(20, 32); L.rect(M, 1, 2, 18, 28); L.paint(img, M, cloth, { dx = ox, flat = 0.45 })
  local G = L.mask(20, 32); L.rect(G, 3, 4, 14, 1); L.rect(G, 3, 27, 14, 1); gear(G, 10, 15, 4, 8); L.paint(img, G, gold, { dx = ox, flat = 0.6, outline = false })
  for x = 1, 19, 2 do L.put(img, ox + x, 30, gold[3]); L.put(img, ox + x, 31, gold[2]) end
end)

L.piece("a1-chandelier", 24, 26, { k = 3, under = true, sway = true, light = { 0, 50, 140, "255,200,120" }, flicker = true }, function(img, f, ox)
  local M = L.mask(24, 26); L.rect(M, 11, 0, 2, 12); for t = 0, 30 do local a = t / 30 * math.pi; L.set(M, 12 - 10 * math.cos(a), 16 + 4 * math.sin(a)) end; L.rect(M, 2, 14, 2, 3); L.rect(M, 20, 14, 2, 3); L.rect(M, 11, 19, 2, 3)
  L.paint(img, M, brass, { dx = ox, flat = 0.55 })
  for _, x in ipairs({ 2, 11, 20 }) do L.kit.flame(img, ox, x, 12 + (x == 11 and 5 or 0), flame) end
end)

L.piece("a1-portrait", 16, 20, { k = 3.2, wall = true }, function(img, f, ox)
  local F = L.mask(16, 20); L.rect(F, 0, 0, 16, 20); L.paint(img, F, gold, { dx = ox, flat = 0.5 })
  local C = L.mask(16, 20); L.rect(C, 2, 2, 12, 16); L.fill(img, C, L.rgb(40, 30, 40), 255, ox)
  local P = L.mask(16, 20); L.disc(P, 8, 8, 3); L.poly(P, { 3, 18, 5, 12, 11, 12, 13, 18 }); L.paint(img, P, L.ramp(20, 0.3, 0.3, 0.65, 3), { dx = ox, outline = false })
  local Cr = L.mask(16, 20); L.rect(Cr, 6, 4, 4, 1); L.put(img, ox + 6, 3, gold[4]); L.put(img, ox + 8, 3, gold[4]); L.put(img, ox + 9, 3, gold[4]); L.fill(img, Cr, gold[4], 255, ox)
end)

L.kit.far("a1-farPalace", 120, 64, L.rgb(26, 24, 36), L.rgb(110, 100, 130), 0.25, function(M)
  L.rect(M, 0, 46, 120, 18); L.rect(M, 20, 26, 80, 20); for x = 20, 98, 6 do L.rect(M, x, 22, 4, 4) end
  for _, t in ipairs({ { 22, 8 }, { 56, 0 }, { 92, 8 } }) do L.rect(M, t[1], t[2] + 6, 8, 40); L.poly(M, { t[1] - 1, t[2] + 7, t[1] + 4, t[2], t[1] + 9, t[2] + 7 }) end
end)

-- ---- loop 2: the house is a machine: pipes through its stone, steam, a great clock in its wall ----
L.piece("a1-pipes", 34, 18, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(34, 18); L.rect(M, 0, 4, 22, 3); L.rect(M, 20, 4, 3, 12); L.rect(M, 20, 13, 14, 3); L.rect(M, 8, 0, 3, 5)
  for _, j in ipairs({ { 0, 3 }, { 19, 3 }, { 19, 12 }, { 31, 12 } }) do L.rect(M, j[1], j[2], 3, 5) end
  L.paint(img, M, copper, { dx = ox, flat = 0.55 })
  local V = L.mask(34, 18); L.disc(V, 9, 1, 2); L.paint(img, V, brass, { dx = ox, flat = 0.6 })
end)
L.piece("a1-steam", 12, 8, { k = 3.2, wall = true, smoke = true }, function(img, f, ox)
  local M = L.mask(12, 8); L.rect(M, 4, 3, 4, 5); L.rect(M, 2, 2, 8, 2); L.paint(img, M, copper, { dx = ox })
end)
L.piece("a1-clock", 30, 30, { k = 3.6, wall = true, light = { 0, -54, 70, "255,230,170" } }, function(img, f, ox)
  local R = L.mask(30, 30); L.disc(R, 15, 15, 14); L.paint(img, R, brass, { dx = ox, flat = 0.55 })
  local F = L.mask(30, 30); L.disc(F, 15, 15, 11); L.fill(img, F, L.rgb(240, 225, 190), 255, ox)
  for i = 0, 11 do local a = i / 12 * math.pi * 2; L.put(img, ox + 15 + math.floor(9.5 * math.cos(a) + 0.5), 15 + math.floor(9.5 * math.sin(a) + 0.5), L.rgb(60, 40, 30)) end
  local H = L.mask(30, 30); L.line(H, 15, 15, 15, 7); L.line(H, 15, 15, 20, 17); L.fill(img, H, L.rgb(40, 28, 20), 255, ox); L.put(img, ox + 15, 15, brass[1])
end)

-- ---- loop 3: the workshop's clutter underfoot ----
L.piece("a1-tools", 22, 6, { k = 3.2, wall = true }, function(img, f, ox)
  local W = L.mask(22, 6); L.tube(W, 1, 5, 8, 2, 0.6); L.disc(W, 8.5, 2, 1.4); L.paint(img, W, L.ramp(220, 0.12, 0.25, 0.7, 3), { dx = ox, flat = 0.6 })
  local G = L.mask(22, 6); L.disc(G, 14, 4, 2.2); L.paint(img, G, brass, { dx = ox, flat = 0.6 }); L.put(img, ox + 14, 4, L.rgb(30, 20, 14))
  for _, x in ipairs({ 18, 20 }) do L.put(img, ox + x, 5, brass[3]); L.put(img, ox + x, 4, brass[2]) end
end)
