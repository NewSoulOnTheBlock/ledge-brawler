-- Ashes and Iron (The Ember, chapter 3): storming a garrison of the Reach. Racks of spears, shields on the walls,
-- barricades of stakes, iron braziers, arrow slits lit from inside, shot piled, ladders left against the walls,
-- helmets in the dust; the fortress on the horizon, a palisade in front.
local L = _G.L
local iron = L.ramp(222, 0.12, 0.08, 0.5, 5)
local wood = L.ramp(24, 0.36, 0.08, 0.38, 5)
local red = L.ramp(354, 0.6, 0.15, 0.45, 4)
local brass = L.ramp(42, 0.7, 0.25, 0.7, 4)
local stone = L.ramp(330, 0.12, 0.08, 0.42, 5)
local fire = { L.rgb(255, 110, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }

L.piece("e3-rack", 24, 30, { k = 3.4 }, function(img, f, ox)
  local F = L.mask(24, 30); L.rect(F, 1, 8, 22, 2); L.rect(F, 1, 26, 22, 2); L.rect(F, 2, 8, 2, 22); L.rect(F, 20, 8, 2, 22); L.paint(img, F, wood, { dx = ox })
  for i = 0, 3 do local x = 6 + i * 4; local S = L.mask(24, 30); L.rect(S, x, 4, 1, 24); L.paint(img, S, wood, { dx = ox, flat = 0.6, outline = false })
    local H = L.mask(24, 30); L.poly(H, { x - 1, 4, x + 0.5, 0, x + 2, 4 }); L.paint(img, H, iron, { dx = ox, flat = 0.7 }) end
end)

L.piece("e3-shield", 14, 16, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(14, 16); L.poly(M, { 1, 1, 13, 1, 13, 8, 7, 15, 1, 8 }); L.paint(img, M, red, { dx = ox, flat = 0.5 })
  local B = L.mask(14, 16); L.rect(B, 6, 2, 2, 11); L.rect(B, 2, 5, 10, 2); L.paint(img, B, brass, { dx = ox, flat = 0.6, outline = false })
  for _, p in ipairs({ { 1, 1 }, { 13, 1 } }) do L.put(img, ox + p[1], p[2], brass[4]) end
end)

L.piece("e3-barricade", 30, 18, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 18); L.tube(M, 2, 17, 28, 17, 1.2)
  for i = 0, 4 do local x = 3 + i * 6; L.tube(M, x, 17, x + (i % 2 == 0 and 4 or -4), 2, 1.3, 0.5) end
  L.paint(img, M, wood, { dx = ox, flat = 0.45 })
  for i = 0, 4 do L.put(img, ox + 3 + i * 6 + (i % 2 == 0 and 4 or -4), 2, iron[5]) end
end)

L.piece("e3-brazier", 14, 22, { k = 3.2, light = { 0, -30, 130, "255,150,60" }, flicker = true, smoke = true }, function(img, f, ox)
  local M = L.mask(14, 22); L.tube(M, 3, 21, 7, 11, 0.8); L.tube(M, 11, 21, 7, 11, 0.8); L.ell(M, 7, 9, 6, 3); L.paint(img, M, iron, { dx = ox })
  for i = 0, 4 do L.kit.flame(img, ox, 3 + i * 2, 4 + (i % 2) * 2, fire) end
end)

L.piece("e3-slit", 8, 20, { k = 3.2, wall = true, light = { 0, -30, 70, "255,170,80" } }, function(img, f, ox)
  local M = L.mask(8, 20); L.rect(M, 3, 3, 2, 14); L.rect(M, 1, 8, 6, 2); L.fill(img, M, fire[1], 255, ox); L.glow(img, ox + 4, 10, 5, fire[2], 120)
end)

L.piece("e3-shot", 16, 9, { k = 3.2, wall = true }, function(img, f, ox)
  for _, p in ipairs({ { 3, 7 }, { 8, 7 }, { 13, 7 }, { 5.5, 3.5 }, { 10.5, 3.5 }, { 8, 0.5 } }) do local M = L.mask(16, 9); L.disc(M, p[1], p[2] + 1, 2.4); L.paint(img, M, iron, { dx = ox, flat = 0.5 }) end
end)

L.piece("e3-ladder", 12, 46, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(12, 46); L.tube(M, 2, 46, 4, 0, 0.9); L.tube(M, 9, 46, 11, 0, 0.9); for y = 4, 44, 5 do local u = y / 46; L.line(M, 2 + 2 * (1 - u), y, 9 + 2 * (1 - u), y) end
  L.paint(img, M, wood, { dx = ox, flat = 0.5 })
end)

L.piece("e3-helms", 16, 6, { k = 3.2, wall = true }, function(img, f, ox)
  for _, c in ipairs({ 4, 11 }) do local M = L.mask(16, 6); L.ell(M, c, 4, 3.2, 3); L.rect(M, c - 3, 5, 7, 1); L.paint(img, M, iron, { dx = ox, flat = 0.55 }) end
end)

L.kit.far("e3-farFort", 120, 60, L.rgb(32, 14, 26), L.rgb(80, 36, 60), 0.3, function(M)
  L.rect(M, 0, 34, 120, 26); for x = 0, 118, 6 do L.rect(M, x, 30, 4, 4) end
  for _, t in ipairs({ { 10, 14 }, { 56, 6 }, { 98, 16 } }) do L.rect(M, t[1], t[2], 14, 40); for x = t[1], t[1] + 12, 4 do L.rect(M, x, t[2] - 4, 3, 4) end end
  L.rect(M, 62, 0, 1, 6); L.poly(M, { 63, 0, 70, 2, 63, 4 })
end)
L.kit.silhouette("e3-fgPalisade", 36, 60, L.rgb(12, 5, 10), L.rgb(90, 40, 50), function(M)
  for i = 0, 4 do local x = 2 + i * 7; local h = 40 + math.floor(L.hash(i, 1, 100) * 18); L.rect(M, x, 60 - h, 5, h); L.poly(M, { x, 60 - h, x + 2.5, 54 - h, x + 5, 60 - h }) end
  L.rect(M, 0, 34, 36, 3)
end)
L.kit.bricks("e3-blocks", stone, { alpha = 170, w = 6 })

-- ---- loop 2: battlements, so the floors read as the garrison's walls, and its gate ----
L.piece("e3-merlons", 24, 8, { k = 3.4, wall = true }, function(img, f, ox)
  for i = 0, 2 do local M = L.mask(24, 8); L.rect(M, i * 8 + 1, 1, 6, 7); L.paint(img, M, stone, { dx = ox, flat = 0.6, seed = i }) end
end)
L.piece("e3-gate", 30, 40, { k = 3.4 }, function(img, f, ox)
  local A = L.mask(30, 40); L.rect(A, 0, 6, 30, 34); L.ell(A, 15, 8, 15, 8); L.paint(img, A, stone, { dx = ox, flat = 0.5 })
  local H = L.mask(30, 40); L.rect(H, 5, 14, 20, 26); L.ell(H, 15, 14, 10, 7); L.fill(img, H, L.rgb(20, 8, 14), 255, ox)
  local P = L.mask(30, 40); for x = 6, 24, 4 do L.rect(P, x, 9, 1, 26) end; for y = 14, 34, 5 do L.rect(P, 5, y, 20, 1) end
  for x = 6, 24, 4 do L.poly(P, { x - 1, 35, x + 0.5, 38, x + 2, 35 }) end
  L.paint(img, P, iron, { dx = ox, flat = 0.55 })
end)

-- ---- loop 3: the assault's arrows stuck in the ground ----
L.piece("e3-arrows", 16, 10, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 2 do local x = 3 + i * 5; local lean = (i - 1) * 2
    for d = 0, 8 do L.put(img, ox + x + math.floor(lean * d / 8), 9 - d, wood[4]) end
    L.put(img, ox + x + lean, 0, L.rgb(230, 225, 210)); L.put(img, ox + x + lean - 1, 1, L.rgb(200, 50, 50)); L.put(img, ox + x + lean + 1, 1, L.rgb(200, 50, 50))
  end
end)
