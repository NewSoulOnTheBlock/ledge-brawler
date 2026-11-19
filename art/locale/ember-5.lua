-- The Red Campaign (The Ember, chapter 5): the army's march on the garrison that burns its own villages. Tents of the
-- host, its campfires, spears planted with helmets on them, war drums, barrels of supply, red pennants trampled;
-- burned villages smoking on the horizon, a forest of spears in front.
local L = _G.L
local canvas = L.ramp(36, 0.3, 0.3, 0.68, 4)
local red = L.ramp(354, 0.62, 0.16, 0.48, 4)
local wood = L.ramp(24, 0.36, 0.08, 0.38, 5)
local iron = L.ramp(222, 0.12, 0.08, 0.5, 5)
local fire = { L.rgb(255, 110, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }
local stone = L.ramp(330, 0.12, 0.08, 0.42, 5)

L.piece("e5-tent", 34, 26, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(34, 26); L.poly(M, { 1, 26, 17, 2, 33, 26 }); L.paint(img, M, canvas, { dx = ox, flat = 0.45, grad = function(x, y) return x < 17 and 0.1 or -0.1 end })
  local D = L.mask(34, 26); L.poly(D, { 12, 26, 17, 12, 22, 26 }); L.fill(img, D, L.rgb(30, 18, 14), 255, ox)
  local S = L.mask(34, 26); L.rect(S, 1, 18, 32, 2); L.paint(img, S, red, { dx = ox, outline = false })
  local P = L.mask(34, 26); L.rect(P, 16, 0, 2, 4); L.poly(P, { 18, 0, 24, 1, 18, 3 }); L.paint(img, P, red, { dx = ox })
end)

L.piece("e5-camp", 18, 14, { k = 3.4, light = { 0, -20, 150, "255,140,50" }, flicker = true, smoke = true }, function(img, f, ox)
  local M = L.mask(18, 14); for i = 0, 5 do local a = i / 6 * math.pi; L.tube(M, 9 - 6 * math.cos(a), 13, 9 + 6 * math.cos(a), 13 - 1, 0.9) end
  for i = 0, 7 do local x = 3 + i * 1.6; L.ell(M, x, 13, 1, 1) end
  L.paint(img, M, wood, { dx = ox })
  for i = 0, 6 do local x = 5 + i; local h = math.floor(7 * math.sin((i + 0.5) / 7 * math.pi) * (0.6 + 0.4 * L.hash(i, 1, 110)))
    for y = 0, h do local u = y / math.max(1, h); L.put(img, ox + x, 11 - y, u < 0.35 and fire[3] or u < 0.7 and fire[2] or fire[1]) end end
end)

L.piece("e5-spears", 20, 34, { k = 3.4 }, function(img, f, ox)
  for i = 0, 2 do local x = 4 + i * 6; local lean = (i - 1) * 2
    local S = L.mask(20, 34); L.line(S, x, 34, x + lean, 6); L.paint(img, S, wood, { dx = ox, outline = false })
    local H = L.mask(20, 34); L.poly(H, { x + lean - 1, 6, x + lean, 0, x + lean + 1, 6 }); L.paint(img, H, iron, { dx = ox, flat = 0.7 })
    if i == 1 then local M = L.mask(20, 34); L.ell(M, x + lean, 10, 3, 2.6); L.rect(M, x + lean - 3, 11, 7, 1); L.paint(img, M, iron, { dx = ox, flat = 0.5 }) end
  end
end)

L.piece("e5-drum", 16, 14, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(16, 14); L.rect(M, 2, 3, 12, 10); L.ell(M, 8, 3, 6, 2); L.paint(img, M, red, { dx = ox, flat = 0.45 })
  local H = L.mask(16, 14); L.ell(H, 8, 3, 5, 1.4); L.paint(img, H, canvas, { dx = ox, flat = 0.75, outline = false })
  for x = 3, 13, 2 do L.put(img, ox + x, 6 + (x % 4) // 2 * 3, L.rgb(220, 190, 120)) end
  local S = L.mask(16, 14); L.tube(S, 4, 0, 9, 4, 0.6); L.paint(img, S, wood, { dx = ox, outline = false })
end)

L.piece("e5-barrels", 22, 14, { k = 3.2 }, function(img, f, ox)
  for i, b in ipairs({ { 6, 14 }, { 15, 14 } }) do local M = L.mask(22, 14); L.ell(M, b[1], 8, 4.5, 6); L.paint(img, M, wood, { dx = ox, flat = 0.5, seed = i })
    for _, y in ipairs({ 5, 11 }) do for x = b[1] - 4, b[1] + 4 do L.put(img, ox + x, y, iron[2]) end end end
end)

L.piece("e5-pennant", 14, 6, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(14, 6); L.poly(M, { 0, 3, 12, 1, 14, 5, 2, 6 }); L.paint(img, M, red, { dx = ox, flat = 0.4, noise = 0.3 })
  for x = 2, 10, 3 do L.put(img, ox + x, 4, L.rgb(60, 40, 30), 200) end
end)

L.kit.far("e5-farVillages", 120, 50, L.rgb(34, 12, 14), L.rgb(110, 40, 30), 0.3, function(M)
  L.rect(M, 0, 42, 120, 8)
  for i = 0, 5 do local x = 4 + i * 20; local h = 6 + math.floor(L.hash(i, 1, 111) * 10); L.rect(M, x, 42 - h, 12, h); for k = 0, 3 do if L.hash(i, k, 112) > 0.4 then L.rect(M, x + k * 3, 42 - h - 3, 2, 3) end end end
end)
L.kit.silhouette("e5-fgSpears", 40, 80, L.rgb(12, 5, 8), L.rgb(110, 40, 40), function(M)
  for i = 0, 5 do local x = 3 + i * 6.5; local lean = (L.hash(i, 1, 113) - 0.5) * 8; L.tube(M, x, 80, x + lean, 8 + i % 3 * 8, 1); L.poly(M, { x + lean - 2, 9 + i % 3 * 8, x + lean, i % 3 * 8, x + lean + 2, 9 + i % 3 * 8 }) end
end)
L.kit.bricks("e5-blocks", stone, { alpha = 160 })
L.kit.tuft("e5-trampled", L.ramp(40, 0.3, 0.15, 0.42, 4), 5, { seed = 44 })

-- ---- loop 2: the siege train and the host's standards ----
L.piece("e5-catapult", 40, 30, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(40, 30); L.rect(M, 4, 22, 32, 3); L.tube(M, 10, 22, 18, 8, 1.2); L.tube(M, 26, 22, 18, 8, 1.2); L.tube(M, 18, 18, 36, 2, 1.1)
  L.paint(img, M, wood, { dx = ox })
  local C = L.mask(40, 30); L.ell(C, 36, 3, 3, 2); L.paint(img, C, wood, { dx = ox, flat = 0.6 })
  for _, wx in ipairs({ 9, 31 }) do local W = L.mask(40, 30); for t = 0, 23 do local a = t / 24 * math.pi * 2; L.set(W, wx + 4 * math.cos(a), 25 + 4 * math.sin(a)) end; L.line(W, wx - 4, 25, wx + 4, 25); L.paint(img, W, wood, { dx = ox, flat = 0.6 }) end
end)
L.piece("e5-standard", 16, 50, { k = 3.4, sway = true }, function(img, f, ox)
  local P = L.mask(16, 50); L.rect(P, 2, 2, 2, 48); L.paint(img, P, wood, { dx = ox })
  local F = L.mask(16, 50); L.poly(F, { 4, 4, 15, 6, 13, 14, 15, 22, 4, 20 }); L.paint(img, F, red, { dx = ox, flat = 0.5 })
  local S = L.mask(16, 50); L.disc(S, 9, 12, 2.4); L.fill(img, S, L.rgb(230, 190, 90), 255, ox)
  L.put(img, ox + 3, 0, iron[5]); L.put(img, ox + 3, 1, iron[4])
end)
