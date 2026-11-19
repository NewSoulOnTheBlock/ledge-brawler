-- The Marked Man (The Forbidden, chapter 2): over the roofs of the city at night with the hunters behind. Slate
-- eaves and smoking chimneys, weathervanes, lanterns on brackets, shutters lit from inside, timber and plaster in the
-- walls, washing strung across the alleys.
local L = _G.L
local slate = L.ramp(245, 0.16, 0.08, 0.4, 5)
local brick = L.ramp(8, 0.32, 0.12, 0.42, 5)
local timber = L.ramp(24, 0.35, 0.08, 0.32, 4)
local plaster = L.ramp(40, 0.16, 0.32, 0.6, 4)
local iron = L.ramp(225, 0.1, 0.06, 0.42, 4)
local warm = L.rgb(255, 190, 100)
local cloth = { L.ramp(210, 0.3, 0.3, 0.7, 3), L.ramp(0, 0.35, 0.3, 0.6, 3), L.ramp(45, 0.3, 0.45, 0.8, 3) }
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }

-- Slates overhanging a ledge's end, in rows.
L.piece("f2-eaves", 14, 10, { k = 3.2, under = true }, function(img, f, ox)
  for r = 0, 2 do for c = 0, 3 do
    local M = L.mask(14, 10); L.rect(M, c * 4 - (r % 2) * 2 + 1, r * 3, 4, 4)
    L.paint(img, M, slate, { dx = ox, flat = 0.4 + r * 0.1, seed = r * 5 + c })
  end end
end)

L.piece("f2-chimney", 14, 26, { k = 3.2, smoke = true }, function(img, f, ox)
  local M = L.mask(14, 26); L.rect(M, 3, 6, 9, 20); L.rect(M, 2, 4, 11, 3)
  L.paint(img, M, brick, { dx = ox, flat = 0.45 })
  for y = 9, 24, 3 do for x = 3, 11 do if (x + (y // 3) % 2 * 2) % 4 == 0 then L.put(img, ox + x, y, brick[1], 200) end end; for x = 3, 11 do L.put(img, ox + x, y, brick[2], 120) end end
  local P = L.mask(14, 26); L.rect(P, 5, 1, 2, 4); L.rect(P, 8, 2, 2, 3); L.paint(img, P, iron, { dx = ox })
end)

L.piece("f2-vane", 16, 34, { k = 3 }, function(img, f, ox)
  local M = L.mask(16, 34); L.rect(M, 7, 8, 1, 26); L.rect(M, 4, 16, 8, 1); L.rect(M, 6, 33, 4, 1)
  L.poly(M, { 2, 6, 7, 3, 12, 5, 14, 2, 14, 8, 12, 7, 7, 9 })
  L.paint(img, M, iron, { dx = ox, flat = 0.5 })
end)

L.piece("f2-lantern", 16, 22, { k = 3, under = true, sway = true, light = { 4, 50, 120, "255,190,100" }, flicker = true }, function(img, f, ox)
  local M = L.mask(16, 22); L.rect(M, 7, 0, 2, 10); L.rect(M, 4, 10, 8, 1); L.rect(M, 5, 20, 6, 2); L.rect(M, 5, 11, 1, 9); L.rect(M, 10, 11, 1, 9); L.poly(M, { 4, 11, 8, 8, 12, 11 })
  L.paint(img, M, iron, { dx = ox, flat = 0.5 })
  local G = L.mask(16, 22); L.rect(G, 6, 12, 4, 8); L.fill(img, G, L.rgb(255, 205, 120), 230, ox)
  L.kit.flame(img, ox, 7, 15, flame)
end)

L.piece("f2-shutter", 16, 18, { k = 3, wall = true, light = { 0, -20, 90, "255,180,90" } }, function(img, f, ox)
  local W = L.mask(16, 18); L.rect(W, 4, 3, 8, 12); L.fill(img, W, warm, 255, ox)
  L.glow(img, ox + 8, 9, 6, L.rgb(255, 240, 200), 120)
  local B = L.mask(16, 18); L.rect(B, 7, 3, 2, 12); L.rect(B, 4, 8, 8, 2); L.rect(B, 3, 15, 10, 2); L.rect(B, 3, 1, 10, 2)
  L.paint(img, B, timber, { dx = ox, flat = 0.5 })
  for _, sx in ipairs({ 0, 12 }) do local S = L.mask(16, 18); L.rect(S, sx, 2, 4, 14); L.paint(img, S, timber, { dx = ox, flat = 0.4 }); for y = 4, 14, 3 do for x = sx, sx + 3 do L.put(img, ox + x, y, timber[1], 180) end end end
end)

-- Timber framing and plaster showing through the rock: the city is built into the stone.
L.piece("f2-timber", 30, 24, { k = 3.2, wall = true }, function(img, f, ox)
  local P = L.mask(30, 24); L.rect(P, 1, 1, 28, 22); L.paint(img, P, plaster, { dx = ox, flat = 0.35, noise = 0.25, alpha = 150 })
  local T = L.mask(30, 24); L.rect(T, 0, 0, 30, 2); L.rect(T, 0, 22, 30, 2); L.rect(T, 0, 0, 2, 24); L.rect(T, 14, 0, 2, 24); L.rect(T, 28, 0, 2, 24)
  L.tube(T, 2, 21, 13, 2, 0.8); L.tube(T, 17, 2, 27, 21, 0.8)
  L.paint(img, T, timber, { dx = ox, flat = 0.45, alpha = 210 })
end)

L.piece("f2-washing", 40, 16, { k = 3, under = true, sway = true }, function(img, f, ox)
  local R = L.mask(40, 16); for x = 0, 39 do L.set(R, x, 1 + math.floor(4 * math.sin(x / 39 * math.pi))) end
  L.paint(img, R, timber, { dx = ox, flat = 0.6, outline = false })
  for i = 0, 3 do
    local x = 4 + i * 9; local y = 2 + math.floor(4 * math.sin(x / 39 * math.pi)); local c = cloth[i % 3 + 1]
    local C = L.mask(40, 16); if i % 2 == 0 then L.rect(C, x, y, 6, 8 + i) else L.poly(C, { x, y, x + 6, y, x + 5, y + 9, x + 3, y + 7, x + 1, y + 9 }) end
    L.paint(img, C, c, { dx = ox, flat = 0.5 })
  end
end)

L.kit.bricks("f2-bricks", brick, { alpha = 170 })
L.kit.crack("f2-crack", slate[1], slate[5])
L.kit.pebbles("f2-slates", slate)

-- ---- loop 2: the hunt across the roofs ----
local paper = L.ramp(42, 0.3, 0.5, 0.86, 4)
local stoneG = L.ramp(250, 0.08, 0.12, 0.5, 5)

-- A run of slate along a roof's top: the floor reads as a roof.
L.piece("f2-ridge", 24, 9, { k = 4, wall = true }, function(img, f, ox)
  local B = L.mask(24, 9); L.rect(B, 0, 6, 24, 3); L.paint(img, B, slate, { dx = ox, flat = 0.3 })
  for c = 0, 5 do local M = L.mask(24, 9); L.poly(M, { c * 4, 7, c * 4 + 2, 1, c * 4 + 4, 7 }); L.paint(img, M, slate, { dx = ox, flat = 0.55, seed = c }) end
end)

L.piece("f2-dormer", 20, 22, { k = 3.2, light = { 0, -25, 80, "255,180,90" } }, function(img, f, ox)
  local R = L.mask(20, 22); L.poly(R, { 0, 10, 10, 0, 20, 10, 17, 10, 10, 4, 3, 10 }); L.paint(img, R, slate, { dx = ox })
  local W = L.mask(20, 22); L.rect(W, 4, 10, 12, 12); L.paint(img, W, plaster, { dx = ox, flat = 0.4 })
  local G = L.mask(20, 22); L.rect(G, 7, 12, 6, 7); L.fill(img, G, warm, 255, ox); L.glow(img, ox + 10, 15, 4, L.rgb(255, 240, 200), 140)
  for y = 12, 18 do L.put(img, ox + 10, y, timber[1]) end; for x = 7, 12 do L.put(img, ox + x, 15, timber[1]) end
end)

L.piece("f2-gargoyle", 18, 16, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(18, 16)
  L.ell(M, 9, 11, 6, 4); L.ell(M, 14, 7, 3.2, 3); L.poly(M, { 3, 9, 1, 3, 6, 7 }); L.poly(M, { 13, 4, 12, 1, 15, 4 }); L.rect(M, 4, 14, 10, 2)
  L.paint(img, M, stoneG, { dx = ox, flat = 0.45 })
  L.put(img, ox + 15, 7, L.rgb(255, 80, 60))
end)

L.piece("f2-wanted", 12, 15, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(12, 15); L.poly(M, { 1, 1, 11, 0, 11, 14, 1, 15 }); L.paint(img, M, paper, { dx = ox, flat = 0.6, noise = 0.25 })
  local H = L.mask(12, 15); L.ell(H, 6, 7, 2.5, 3); L.rect(H, 3, 9, 6, 3); L.fill(img, H, L.rgb(60, 40, 40), 220, ox)
  for x = 3, 8 do L.put(img, ox + x, 3, L.rgb(140, 30, 30)); L.put(img, ox + x, 13, L.rgb(70, 50, 40)) end
  L.put(img, ox + 6, 1, iron[2])
end)

L.piece("f2-bolts", 14, 12, { k = 3, wall = true }, function(img, f, ox)
  for i = 0, 2 do
    local y = 2 + i * 4; local x = 2 + i * 3
    for d = 0, 6 do L.put(img, ox + x + d, y + d // 3, timber[3]) end
    L.put(img, ox + x, y, L.rgb(230, 230, 230)); L.put(img, ox + x, y + 1, L.rgb(200, 60, 60)); L.put(img, ox + x + 7, y + 2, iron[1])
  end
end)

L.piece("f2-crows", 18, 8, { k = 3 }, function(img, f, ox)
  for _, c in ipairs({ { 4, 0 }, { 12, 1 } }) do
    local M = L.mask(18, 8); L.ell(M, c[1], 4 + c[2], 2.5, 2); L.disc(M, c[1] + 2, 2 + c[2], 1.4); L.poly(M, { c[1] - 2, 4 + c[2], c[1] - 5, 3 + c[2], c[1] - 2, 6 + c[2] })
    L.fill(img, M, L.rgb(18, 16, 26), 255, ox); L.put(img, ox + c[1] + 4, 2 + c[2], L.rgb(200, 160, 60)); L.put(img, ox + c[1] + 2, 1 + c[2], L.rgb(230, 200, 120))
    L.put(img, ox + c[1], 6 + c[2] + 1, L.rgb(120, 100, 60)); L.put(img, ox + c[1] + 1, 6 + c[2] + 1, L.rgb(120, 100, 60))
  end
end)

L.piece("f2-grapnel", 9, 40, { k = 3, under = true, sway = true }, function(img, f, ox)
  local R = L.mask(9, 40); for y = 0, 34 do L.set(R, 4 + math.floor(math.sin(y / 5) * 0.8 + 0.5), y) end
  L.paint(img, R, L.ramp(36, 0.4, 0.3, 0.6, 3), { dx = ox, outline = false })
  local H = L.mask(9, 40); L.rect(H, 4, 34, 1, 5); L.tube(H, 4, 39, 1, 36, 0.6); L.tube(H, 4, 39, 7, 36, 0.6)
  L.paint(img, H, iron, { dx = ox, flat = 0.6 })
end)

-- ---- loop 3: chimneys and roof peaks dark between the view and the fight ----
local night = L.rgb(10, 9, 22)
L.kit.silhouette("f2-fgChimneys", 40, 44, night, slate[2], function(M) L.poly(M, { 0, 44, 0, 20, 14, 8, 28, 20, 28, 44 }); L.rect(M, 18, 4, 6, 14); L.rect(M, 30, 22, 10, 22); L.rect(M, 32, 14, 4, 8) end)
L.kit.silhouette("f2-fgSpire", 18, 64, night, slate[2], function(M) L.poly(M, { 2, 64, 2, 24, 9, 0, 16, 24, 16, 64 }); L.rect(M, 8, 0, 2, 4) end)
