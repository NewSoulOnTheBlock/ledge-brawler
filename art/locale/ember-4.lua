-- A Saint Is Born (The Ember, chapter 4): through the shrine town to tear the first shrine down. The saint in stone
-- with a halo of gold, windows of coloured glass, prayer flags strung over the lanes, bowls of incense smoking, icons
-- on the walls; domes and spires on the horizon.
local L = _G.L
local stone = L.ramp(30, 0.12, 0.2, 0.68, 5)
local gold = L.ramp(44, 0.85, 0.3, 0.85, 4)
local lead = L.rgb(30, 20, 26)
local glass = { L.rgb(220, 60, 70), L.rgb(70, 120, 230), L.rgb(240, 190, 60), L.rgb(80, 180, 110) }
local flags = { L.ramp(0, 0.6, 0.35, 0.6, 3), L.ramp(45, 0.7, 0.45, 0.7, 3), L.ramp(200, 0.5, 0.35, 0.6, 3), L.ramp(120, 0.45, 0.3, 0.55, 3) }
local cord = L.ramp(36, 0.3, 0.3, 0.6, 3)

L.piece("e4-saint", 20, 46, { k = 3.4, light = { 0, -130, 110, "255,220,140" } }, function(img, f, ox)
  local P = L.mask(20, 46); L.rect(P, 3, 38, 14, 8); L.rect(P, 2, 37, 16, 2); L.paint(img, P, stone, { dx = ox, flat = 0.45 })
  local B = L.mask(20, 46); L.poly(B, { 6, 37, 7, 16, 10, 13, 13, 16, 14, 37 }); L.disc(B, 10, 10, 3); L.tube(B, 8, 20, 10, 24, 1); L.tube(B, 12, 20, 10, 24, 1)
  L.paint(img, B, stone, { dx = ox, flat = 0.5 })
  for t = 0, 23 do local a = t / 24 * math.pi * 2; L.put(img, ox + 10 + math.floor(5 * math.cos(a) + 0.5), 9 + math.floor(5 * math.sin(a) + 0.5), gold[4]) end
  L.glow(img, ox + 10, 9, 8, gold[4], 90)
end)

L.piece("e4-window", 16, 26, { k = 3.2, wall = true, light = { 0, -40, 110, "240,180,120" } }, function(img, f, ox)
  local O = L.mask(16, 26); L.rect(O, 1, 7, 14, 19); L.ell(O, 8, 8, 7, 7); L.fill(img, O, lead, 255, ox)
  L.each(O, function(x, y) if not (x % 4 == 0 or y % 5 == 0) then local c = glass[(x // 4 + y // 5) % 4 + 1]; L.put(img, ox + x, y, c) end end)
  local R = L.mask(16, 26); L.rect(R, 0, 24, 16, 2); L.paint(img, R, stone, { dx = ox })
end)

L.piece("e4-flags", 44, 18, { k = 3, under = true, sway = true }, function(img, f, ox)
  local R = L.mask(44, 18); for x = 0, 43 do L.set(R, x, 1 + math.floor(5 * math.sin(x / 43 * math.pi))) end; L.paint(img, R, cord, { dx = ox, outline = false })
  for i = 0, 6 do local x = 2 + i * 6; local y = 2 + math.floor(5 * math.sin(x / 43 * math.pi)); local M = L.mask(44, 18); L.poly(M, { x, y, x + 4, y, x + 2, y + 7 }); L.paint(img, M, flags[i % 4 + 1], { dx = ox, flat = 0.55 }) end
end)

L.piece("e4-incense", 12, 12, { k = 3.2, smoke = true, light = { 0, -16, 60, "255,170,90" } }, function(img, f, ox)
  local M = L.mask(12, 12); L.ell(M, 6, 8, 5, 2.5); L.rect(M, 4, 10, 4, 2); L.paint(img, M, gold, { dx = ox, flat = 0.45 })
  for _, x in ipairs({ 4, 6, 8 }) do for y = 2, 7 do L.put(img, ox + x, y, L.rgb(120, 70, 50)) end; L.put(img, ox + x, 1, L.rgb(255, 150, 60)) end
end)

L.piece("e4-icon", 14, 18, { k = 3.2, wall = true }, function(img, f, ox)
  local F = L.mask(14, 18); L.rect(F, 0, 0, 14, 18); L.paint(img, F, gold, { dx = ox, flat = 0.55 })
  local P = L.mask(14, 18); L.rect(P, 2, 2, 10, 14); L.fill(img, P, L.rgb(120, 30, 40), 255, ox)
  local S = L.mask(14, 18); L.disc(S, 7, 7, 2.2); L.poly(S, { 4, 16, 5, 10, 9, 10, 10, 16 }); L.paint(img, S, L.ramp(30, 0.3, 0.4, 0.8, 3), { dx = ox, outline = false })
  for t = 0, 15 do local a = t / 16 * math.pi * 2; L.put(img, ox + 7 + math.floor(3.4 * math.cos(a) + 0.5), 7 + math.floor(3.4 * math.sin(a) + 0.5), gold[4]) end
end)

L.kit.far("e4-farDomes", 120, 64, L.rgb(40, 18, 22), L.rgb(130, 70, 50), 0.3, function(M)
  L.rect(M, 0, 44, 120, 20)
  for _, d in ipairs({ { 18, 30, 12 }, { 60, 22, 18 }, { 100, 32, 10 } }) do L.ell(M, d[1], d[2] + 6, d[3], d[3]); L.rect(M, d[1] - d[3], d[2] + 6, d[3] * 2, 44 - d[2]); L.rect(M, d[1], d[2] - d[3] - 6, 1, 8) end
  L.rect(M, 38, 10, 6, 34); L.poly(M, { 37, 10, 41, 0, 45, 10 }); L.rect(M, 80, 16, 5, 28); L.poly(M, { 79, 16, 82.5, 6, 86, 16 })
end)
L.kit.silhouette("e4-fgStatue", 26, 70, L.rgb(14, 6, 8), L.rgb(130, 70, 50), function(M)
  L.rect(M, 4, 56, 18, 14); L.poly(M, { 8, 56, 9, 22, 13, 18, 17, 22, 18, 56 }); L.disc(M, 13, 14, 4); L.tube(M, 9, 26, 3, 14, 1.5); L.tube(M, 17, 26, 23, 14, 1.5)
end)
L.kit.pebbles("e4-petals", L.ramp(350, 0.6, 0.35, 0.7, 3))

-- ---- loop 2: the pilgrims' archways hung with bells ----
L.piece("e4-arch", 30, 40, { k = 3.4 }, function(img, f, ox)
  local A = L.mask(30, 40); L.rect(A, 2, 8, 5, 32); L.rect(A, 23, 8, 5, 32); L.rect(A, 0, 4, 30, 5); L.ell(A, 15, 6, 15, 4); L.paint(img, A, stone, { dx = ox, flat = 0.5 })
  for _, bx in ipairs({ 10, 15, 20 }) do local B = L.mask(30, 40); L.rect(B, bx, 9, 1, 4); L.poly(B, { bx - 2, 17, bx - 1, 13, bx + 2, 13, bx + 3, 17 }); L.paint(img, B, gold, { dx = ox, flat = 0.55 }) end
end)

-- ---- loop 3: the pilgrims' candles along every lane ----
L.piece("e4-votives", 20, 7, { k = 3, wall = true, light = { 0, -12, 70, "255,190,110" }, flicker = true }, function(img, f, ox)
  for i = 0, 4 do local x = 1 + i * 4; local h = 2 + (i % 3)
    local M = L.mask(20, 7); L.rect(M, x, 7 - h, 2, h); L.paint(img, M, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox, outline = false })
    L.put(img, ox + x, 7 - h - 1, L.rgb(255, 190, 80)); L.put(img, ox + x, 7 - h - 2, L.rgb(255, 120, 40), 170)
  end
end)
