-- The Last Sentence (The Forbidden, chapter 1): out of Blackspire by its bones. The keep's cells and ossuary:
-- the dead set into its walls, chains and shackles, candles left for the condemned, moonlight through the bars.
local L = _G.L
local stone = L.ramp(268, 0.14, 0.07, 0.42, 5)
local bone = L.ramp(42, 0.22, 0.32, 0.86, 5, 14)
local iron = L.ramp(225, 0.1, 0.06, 0.42, 4)
local wax = L.ramp(40, 0.35, 0.55, 0.92, 3)
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }
local moss = L.ramp(285, 0.35, 0.1, 0.38, 4)
local moon = L.rgb(170, 190, 255)

-- A skull, `s` across, its top left at (x, y), painted onto img.
local function skull(img, x, y, s, o)
  local M = L.mask(s + 2, s + 2)
  L.ell(M, s / 2 + 0.5, s * 0.45, s * 0.48, s * 0.42); L.rect(M, math.floor(s * 0.25), math.floor(s * 0.6), math.ceil(s * 0.5), math.ceil(s * 0.3))
  L.paint(img, M, bone, { dx = x, dy = y, seed = x + y, alpha = o and o.alpha })
  local E, r = L.mask(s + 2, s + 2), (s >= 9 and 1.3 or 0.9)
  L.disc(E, s * 0.32 + 0.5, s * 0.47, r); L.disc(E, s * 0.68 + 0.5, s * 0.47, r); L.set(E, s * 0.5, s * 0.66)
  L.fill(img, E, L.rgb(30, 22, 30), o and o.alpha, x, y)
end

L.piece("f1-skulls", 22, 12, { k = 3.5 }, function(img, f, ox)
  local M = L.mask(22, 12)
  L.tube(M, 2, 10, 19, 9, 1.2); L.tube(M, 4, 11, 16, 6, 1); L.ell(M, 11, 10, 9, 2.5)
  L.paint(img, M, bone, { dx = ox, flat = 0.35 })
  skull(img, ox + 2, 3, 7); skull(img, ox + 12, 4, 6); skull(img, ox + 7, 0, 7)
end)

L.piece("f1-ribs", 26, 18, { k = 3.2, wall = true, alpha = 0.8 }, function(img, f, ox)
  local M = L.mask(26, 18)
  L.tube(M, 3, 9, 23, 8, 1.3)
  for i = 0, 4 do local x = 6 + i * 4; L.tube(M, x, 9, x - 3, 2 + i % 2, 0.8); L.tube(M, x, 9, x - 2, 16 - i % 2, 0.8) end
  L.paint(img, M, bone, { dx = ox, flat = 0.3, noise = 0.3, alpha = 205 })
end)

L.piece("f1-skullFossil", 14, 13, { k = 3.2, wall = true }, function(img, f, ox)
  skull(img, ox + 1, 1, 11, { alpha = 175 })
  local M = L.mask(14, 13); L.tube(M, 2, 12, 12, 11, 0.7); L.paint(img, M, bone, { dx = ox, alpha = 140, outline = false })
end)

L.piece("f1-shackles", 14, 22, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(14, 22)
  L.disc(M, 7, 3, 2.5)
  for _, side in ipairs({ -1, 1 }) do
    for i = 0, 6 do L.ell(M, 7 + side * (1 + i * 0.6), 6 + i * 2, 1, 1.2) end
    L.ell(M, 7 + side * 5, 20, 2.2, 1.6)
  end
  L.paint(img, M, iron, { dx = ox, flat = 0.5 })
  local H = L.mask(14, 22); L.disc(H, 7, 3, 1); L.fill(img, H, stone[1], 255, ox)
end)

L.piece("f1-chain", 7, 52, { k = 3, under = true, sway = true }, function(img, f, ox)
  local M = L.mask(7, 52)
  for i = 0, 11 do if i % 2 == 0 then L.ell(M, 3.5, 2 + i * 4, 1.4, 2.2) else L.rect(M, 3, i * 4, 1, 4) end end
  L.tube(M, 3.5, 47, 5.5, 50, 0.8); L.tube(M, 5.5, 50, 3, 51, 0.8)
  L.paint(img, M, iron, { dx = ox, flat = 0.55 })
end)

L.piece("f1-candles", 14, 12, { k = 3.2, light = { 0, -22, 110, "255,170,80" }, flicker = true }, function(img, f, ox)
  local M = L.mask(14, 12)
  local tall = { { 3, 5 }, { 7, 2 }, { 11, 6 } }
  for _, c in ipairs(tall) do L.rect(M, c[1] - 1, c[2] + 2, 2, 10 - c[2]) end
  L.ell(M, 7, 11.3, 6.5, 1.2)
  L.paint(img, M, wax, { dx = ox, flat = 0.6 })
  for _, c in ipairs(tall) do L.put(img, ox + c[1] - 1, c[2], flame[1]); L.put(img, ox + c[1] - 1, c[2] + 1, flame[2]); L.put(img, ox + c[1], c[2] + 1, flame[3]); L.put(img, ox + c[1] - 1, c[2] - 1, flame[1], 160) end
end)

L.piece("f1-moss", 12, 20, { k = 3, under = true, sway = true }, function(img, f, ox)
  local M = L.mask(12, 20)
  L.rect(M, 0, 0, 12, 3)
  for x = 0, 11 do local len = 5 + math.floor(L.hash(x, 7, 9) * 15); if x % 3 ~= 1 then L.rect(M, x, 3, 1, len) end end
  L.paint(img, M, moss, { dx = ox, flat = 0.5, outline = false })
end)

L.piece("f1-grate", 16, 20, { k = 3, wall = true, light = { 0, -30, 120, "150,170,255" } }, function(img, f, ox)
  local W = L.mask(16, 20); L.rect(W, 2, 3, 12, 15); L.ell(W, 8, 4, 6, 3)
  L.fill(img, W, L.rgb(20, 18, 40), 255, ox)
  L.glow(img, ox + 8, 9, 7, moon, 120)
  local M = L.mask(16, 20)
  for x = 3, 12, 3 do L.rect(M, x, 1, 1, 18) end
  L.rect(M, 1, 9, 14, 1); L.rect(M, 1, 18, 14, 2)
  L.paint(img, M, iron, { dx = ox, flat = 0.5 })
end)

L.piece("f1-tallies", 18, 10, { k = 3, wall = true }, function(img, f, ox)
  for g = 0, 2 do
    for i = 0, 3 do for y = 1, 8 do L.put(img, ox + 1 + g * 6 + i, y + (i % 2), stone[5], 150) end end
    for i = 0, 5 do L.put(img, ox + g * 6 + i, 7 - i, stone[5], 170) end
  end
end)

L.piece("f1-rubble", 30, 10, { k = 4, fg = true }, function(img, f, ox)
  local M = L.mask(30, 10)
  L.ell(M, 8, 9, 8, 4); L.ell(M, 19, 9, 7, 5); L.ell(M, 26, 10, 4, 3); L.poly(M, { 12, 9, 15, 2, 18, 9 })
  L.fill(img, M, L.rgb(10, 8, 18), 255, ox)
  L.each(M, function(x, y) if not L.on(M, x, y - 1) then L.put(img, ox + x, y, stone[2]) end end)
end)

-- ---- loop 2: the executioner's own keep ----
local wood = L.ramp(25, 0.38, 0.1, 0.42, 5)
local rope = L.ramp(38, 0.4, 0.3, 0.62, 3)
local straw = L.ramp(48, 0.55, 0.3, 0.72, 4)
local crown = L.ramp(275, 0.45, 0.12, 0.42, 4)
local gold = L.ramp(44, 0.85, 0.32, 0.8, 4)

L.piece("f1-gibbet", 26, 44, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(26, 44)
  L.rect(M, 4, 4, 3, 40); L.rect(M, 4, 3, 19, 3); L.tube(M, 6, 14, 15, 5, 1); L.rect(M, 1, 41, 9, 3)
  L.paint(img, M, wood, { dx = ox })
  local R = L.mask(26, 44); L.rect(R, 20, 6, 1, 12); L.ell(R, 20.5, 20, 2.2, 2.6)
  L.paint(img, R, rope, { dx = ox, flat = 0.5 })
  local H = L.mask(26, 44); L.ell(H, 20.5, 20, 1, 1.4); L.fill(img, H, L.rgb(0, 0, 0), 0, ox)
  for y = 19, 21 do for x = 20, 21 do img:drawPixel(ox + x, y, 0) end end
end)

L.piece("f1-block", 22, 16, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(22, 16); L.rect(M, 3, 8, 15, 8); L.ell(M, 10.5, 8, 7.5, 1.5)
  L.paint(img, M, wood, { dx = ox, flat = 0.4 })
  local H = L.mask(22, 16); L.tube(H, 13, 8, 20, 1, 0.8); L.paint(img, H, wood, { dx = ox, flat = 0.6 })
  local A = L.mask(22, 16); L.poly(A, { 9, 9, 14, 3, 17, 5, 13, 9 }); L.paint(img, A, iron, { dx = ox, flat = 0.7, rim = L.rgb(200, 205, 220) })
  local B = L.mask(22, 16); L.ell(B, 7, 9, 2, 0.8); L.fill(img, B, L.rgb(110, 20, 30), 200, ox)
end)

L.piece("f1-cage", 16, 34, { k = 3, under = true, sway = true }, function(img, f, ox)
  local C = L.mask(16, 34); L.rect(C, 7, 0, 2, 8)
  for i = 0, 3 do L.rect(C, 2 + i * 4, 10, 1, 21) end
  L.rect(C, 1, 9, 14, 2); L.rect(C, 1, 30, 14, 2); L.ell(C, 8, 10, 7, 2)
  local S = L.mask(16, 34); L.ell(S, 8, 24, 3, 2); L.tube(S, 6, 26, 5, 30, 0.8); L.tube(S, 9, 26, 10, 30, 0.8); L.ell(S, 7, 19, 2.4, 2.2)
  L.paint(img, S, bone, { dx = ox, flat = 0.3, alpha = 220 })
  L.paint(img, C, iron, { dx = ox, flat = 0.55 })
end)

L.piece("f1-straw", 24, 10, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(24, 10); L.ell(M, 9, 8, 9, 3)
  for i = 0, 10 do L.line(M, 1 + i * 1.6, 9, 2 + i * 1.6 + (L.hash(i, 1, 4) - 0.5) * 4, 3 + L.hash(i, 2, 4) * 3) end
  L.paint(img, M, straw, { dx = ox, flat = 0.45, noise = 0.35 })
  local B = L.mask(24, 10); L.rect(B, 18, 3, 5, 7); L.rect(B, 17, 2, 7, 1)
  L.paint(img, B, wood, { dx = ox, flat = 0.45 })
  L.put(img, ox + 17, 4, iron[3]); L.put(img, ox + 23, 4, iron[3])
end)

L.piece("f1-banner", 14, 30, { k = 3, wall = true, sway = true }, function(img, f, ox)
  local P = L.mask(14, 30); L.rect(P, 0, 0, 14, 2); L.paint(img, P, wood, { dx = ox })
  local M = L.mask(14, 30); L.poly(M, { 1, 2, 13, 2, 13, 28, 7, 23, 1, 28 })
  L.paint(img, M, crown, { dx = ox, flat = 0.45, noise = 0.1 })
  local G = L.mask(14, 30); L.rect(G, 4, 10, 6, 3); L.rect(G, 4, 7, 1, 3); L.rect(G, 6, 6, 2, 4); L.rect(G, 9, 7, 1, 3)
  L.paint(img, G, gold, { dx = ox, flat = 0.6, outline = false })
end)

L.piece("f1-crack", 20, 22, { k = 3.2, wall = true }, function(img, f, ox)
  local x, y = 10, 0
  for i = 1, 22 do
    L.put(img, ox + x, y, stone[1], 200); L.put(img, ox + x + 1, y, stone[5], 70)
    y = y + 1; x = x + math.floor((L.hash(i, 3, 5) - 0.5) * 3 + 0.5)
    if i == 8 then for j = 1, 6 do L.put(img, ox + x - j, y + j // 2, stone[1], 170) end end
  end
end)

L.piece("f1-bricks", 28, 16, { k = 3.2, wall = true }, function(img, f, ox)
  for r = 0, 2 do for c = 0, 3 do
    if L.hash(r, c, 7) > 0.3 then
      local x0, y0 = c * 7 + (r % 2) * 3, r * 5
      local M = L.mask(28, 16); L.rect(M, x0, y0, 6, 4)
      L.paint(img, M, stone, { dx = ox, flat = 0.6 + L.hash(c, r, 2) * 0.25, alpha = 190, seed = r * 4 + c })
    end
  end end
end)

-- ---- loop 3: the floors' edges and what frames the view ----
L.piece("f1-shards", 12, 4, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(12, 4)
  for i = 0, 3 do local x = 1 + i * 3 + math.floor(L.hash(i, f, 11) * 2); if L.hash(i, 5, 12) > 0.4 then L.tube(M, x, 3, x + 1.5, 2, 0.6) else L.disc(M, x, 2.6, 1) end end
  L.paint(img, M, L.hash(1, 1, 1) > 2 and stone or bone, { dx = ox, flat = 0.4, alpha = 230 })
end)
L.piece("f1-pebbles", 14, 4, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(14, 4); L.ell(M, 3, 3, 2, 1.3); L.ell(M, 8, 3.2, 1.6, 1); L.ell(M, 12, 3, 1.4, 1.2)
  L.paint(img, M, stone, { dx = ox, flat = 0.6 })
end)
L.piece("f1-fgPillar", 22, 70, { k = 4, fg = true }, function(img, f, ox)
  local M = L.mask(22, 70)
  L.rect(M, 4, 8, 14, 62); L.rect(M, 1, 64, 20, 6); L.poly(M, { 4, 10, 6, 2, 11, 6, 15, 0, 18, 9 })
  L.fill(img, M, L.rgb(8, 6, 16), 255, ox)
  L.each(M, function(x, y) if not L.on(M, x - 1, y) or not L.on(M, x, y - 1) then L.put(img, ox + x, y, stone[2], 200) end end)
end)
