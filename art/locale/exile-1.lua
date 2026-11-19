-- Nine Bells (The Exile, chapter 1): out of the monastery by the way the bells cannot see. Bronze bells under the
-- eaves, prayer wheels in the walls, stone lanterns capped with snow, monks carved in stone, the nine-bell glyph cut
-- into the rock, drifts against every step, the order's banners; its roofs far, a pagoda near.
local L = _G.L
local bronze = L.ramp(36, 0.6, 0.18, 0.66, 5)
local stone = L.ramp(210, 0.1, 0.18, 0.62, 5)
local snow = L.ramp(205, 0.3, 0.72, 0.97, 3)
local wood = L.ramp(10, 0.45, 0.1, 0.36, 5)
local cloth = L.ramp(20, 0.6, 0.25, 0.55, 4)
local warm = L.rgb(255, 200, 120)

L.piece("x1-bell", 16, 30, { k = 3, under = true, sway = true }, function(img, f, ox)
  local R = L.mask(16, 30); L.rect(R, 7, 0, 2, 12); L.paint(img, R, wood, { dx = ox })
  local B = L.mask(16, 30); L.poly(B, { 4, 26, 5, 15, 8, 12, 11, 15, 12, 26, 14, 28, 2, 28 }); L.paint(img, B, bronze, { dx = ox, flat = 0.5 })
  for x = 4, 12 do L.put(img, ox + x, 22, bronze[2]) end; L.put(img, ox + 8, 29, bronze[2]); L.put(img, ox + 8, 28, bronze[3])
end)

L.piece("x1-wheel", 12, 18, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(12, 18); L.rect(M, 2, 3, 8, 12); L.ell(M, 6, 3, 4, 1.5); L.ell(M, 6, 15, 4, 1.5); L.paint(img, M, bronze, { dx = ox, flat = 0.55 })
  for y = 5, 13, 3 do for x = 3, 9 do if (x + y) % 3 == 0 then L.put(img, ox + x, y, bronze[1]) end end end
  local A = L.mask(12, 18); L.rect(A, 5, 0, 2, 18); L.paint(img, A, wood, { dx = ox, outline = false, alpha = 200 })
end)

L.piece("x1-lantern", 14, 24, { k = 3.2, light = { 0, -40, 90, "255,200,120" }, flicker = true }, function(img, f, ox)
  local M = L.mask(14, 24); L.rect(M, 5, 14, 4, 10); L.rect(M, 3, 22, 8, 2); L.rect(M, 3, 7, 8, 7); L.poly(M, { 0, 8, 7, 2, 14, 8 }); L.paint(img, M, stone, { dx = ox, flat = 0.45 })
  local G = L.mask(14, 24); L.rect(G, 5, 9, 4, 4); L.fill(img, G, warm, 255, ox); L.glow(img, ox + 7, 11, 5, warm, 120)
  local S = L.mask(14, 24); L.poly(S, { 0, 7, 7, 1, 14, 7, 12, 8, 7, 3, 2, 8 }); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x1-monk", 14, 30, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(14, 30); L.poly(M, { 2, 30, 4, 12, 7, 9, 10, 12, 12, 30 }); L.ell(M, 7, 8, 3.5, 3.5); L.rect(M, 1, 28, 12, 2); L.paint(img, M, stone, { dx = ox, flat = 0.45 })
  local H = L.mask(14, 30); L.ell(H, 7, 17, 2.5, 1.5); L.paint(img, H, stone, { dx = ox, flat = 0.7, outline = false })
  local S = L.mask(14, 30); L.ell(S, 7, 5, 3.5, 1.4); L.rect(S, 1, 27, 12, 1); L.paint(img, S, snow, { dx = ox, outline = false })
end)

L.piece("x1-glyph", 18, 18, { k = 3, wall = true }, function(img, f, ox)
  local c = stone[5]
  for i = 0, 8 do local a = i / 9 * math.pi * 2 - math.pi / 2; local x, y = 9 + 6 * math.cos(a), 9 + 6 * math.sin(a)
    local M = L.mask(18, 18); L.poly(M, { x - 1.4, y + 1.4, x, y - 1.4, x + 1.4, y + 1.4 }); L.fill(img, M, c, 170, ox) end
  for t = 0, 11 do local a = t / 12 * math.pi * 2; L.put(img, ox + 9 + math.floor(2.5 * math.cos(a) + 0.5), 9 + math.floor(2.5 * math.sin(a) + 0.5), c, 170) end
end)

L.piece("x1-drift", 26, 7, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(26, 7); L.ell(M, 9, 7, 9, 4); L.ell(M, 19, 7, 7, 3); L.paint(img, M, snow, { dx = ox, flat = 0.55, outline = false })
end)

L.piece("x1-banner", 10, 30, { k = 3, wall = true, sway = true }, function(img, f, ox)
  local P = L.mask(10, 30); L.rect(P, 0, 0, 10, 2); L.paint(img, P, wood, { dx = ox })
  local M = L.mask(10, 30); L.rect(M, 1, 2, 8, 26); L.paint(img, M, cloth, { dx = ox, flat = 0.45 })
  for i = 0, 2 do local D = L.mask(10, 30); L.disc(D, 5, 8 + i * 7, 1.6); L.fill(img, D, bronze[4], 255, ox) end
end)

L.kit.far("x1-farRoofs", 120, 56, L.rgb(30, 36, 52), L.rgb(170, 190, 215), 0.3, function(M)
  L.rect(M, 0, 46, 120, 10)
  for _, r in ipairs({ { 6, 30, 30 }, { 44, 18, 36 }, { 88, 28, 28 } }) do L.rect(M, r[1] + 4, r[2] + 6, r[3] - 8, 46 - r[2]); L.poly(M, { r[1] - 4, r[2] + 8, r[1] + r[3] // 2, r[2] - 4, r[1] + r[3] + 4, r[2] + 8 }) end
end)
L.kit.silhouette("x1-fgPagoda", 40, 70, L.rgb(10, 12, 22), L.rgb(160, 180, 210), function(M)
  L.rect(M, 16, 12, 8, 58); for i = 0, 2 do local y = 14 + i * 18; L.poly(M, { 2 + i * 3, y + 6, 20, y - 4, 38 - i * 3, y + 6 }) end; L.rect(M, 19, 2, 2, 10)
end)

-- ---- loop 2: the monastery's lacquered halls showing through the stone, paper lanterns ----
L.piece("x1-panel", 30, 22, { k = 3.4, wall = true }, function(img, f, ox)
  local P = L.mask(30, 22); L.rect(P, 1, 1, 28, 20); L.paint(img, P, L.ramp(40, 0.25, 0.55, 0.82, 3), { dx = ox, flat = 0.4, alpha = 200, outline = false })
  local F = L.mask(30, 22); L.rect(F, 0, 0, 30, 2); L.rect(F, 0, 20, 30, 2); L.rect(F, 0, 0, 2, 22); L.rect(F, 28, 0, 2, 22); L.rect(F, 14, 0, 2, 22); L.rect(F, 0, 10, 30, 1)
  for x = 5, 26, 4 do L.rect(F, x, 2, 1, 18) end
  L.paint(img, F, wood, { dx = ox, flat = 0.5, alpha = 230 })
end)
L.piece("x1-paper", 10, 22, { k = 3, under = true, sway = true, light = { 0, 50, 100, "255,120,80" } }, function(img, f, ox)
  local S = L.mask(10, 22); L.rect(S, 5, 0, 1, 8); L.paint(img, S, wood, { dx = ox, outline = false })
  local M = L.mask(10, 22); L.ell(M, 5, 14, 4.5, 6); L.paint(img, M, L.ramp(5, 0.75, 0.4, 0.75, 4), { dx = ox, flat = 0.6, outline = false })
  for _, y in ipairs({ 10, 14, 18 }) do for x = 1, 9 do L.put(img, ox + x, y, L.rgb(140, 30, 30), 150) end end
  L.glow(img, ox + 5, 14, 4, L.rgb(255, 220, 160), 120)
  L.rect(L.mask(1, 1), 0, 0, 1, 1); local T = L.mask(10, 22); L.rect(T, 3, 7, 4, 2); L.rect(T, 3, 20, 4, 2); L.paint(img, T, wood, { dx = ox })
end)

-- ---- loop 3: prayer stones stacked along the paths ----
L.piece("x1-cairn", 10, 12, { k = 3.2, wall = true }, function(img, f, ox)
  for i, s in ipairs({ { 5, 10.5, 4, 1.6 }, { 5, 7.6, 3.2, 1.4 }, { 5.4, 5, 2.4, 1.2 }, { 5, 2.8, 1.6, 1 } }) do local M = L.mask(10, 12); L.ell(M, s[1], s[2], s[3], s[4]); L.paint(img, M, stone, { dx = ox, flat = 0.55, seed = i }) end
  local S = L.mask(10, 12); L.ell(S, 5, 2.2, 1.6, 0.7); L.paint(img, S, snow, { dx = ox, outline = false })
end)
