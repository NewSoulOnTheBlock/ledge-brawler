-- The Burning of Blackspire (The Architect, chapter 4): down through the city he set alight, after the part of it he
-- did not plan. His fire is not the town's: alchemical, green. Its flames in the streets, his firebomb crates marked
-- with his sigil, scaffolds fallen, vials shattered, green seams through the stone, windows lit green from within.
local L = _G.L
local wood = L.ramp(24, 0.3, 0.08, 0.34, 5)
local char = L.ramp(18, 0.15, 0.04, 0.24, 4)
local brass = L.ramp(42, 0.75, 0.25, 0.8, 4)
local glassG = L.ramp(160, 0.4, 0.3, 0.75, 3)
local green = { L.rgb(30, 120, 60), L.rgb(80, 230, 120), L.rgb(170, 255, 170), L.rgb(235, 255, 225) }

local function blaze(img, ox, x0, w, base, h, seed)
  for i = 0, w - 1 do
    local t = math.floor(h * (0.35 + 0.65 * L.hash(i, seed, 210)) * math.sin((i + 0.5) / w * math.pi))
    for y = 0, t do local u = y / math.max(1, t); local c = u < 0.3 and green[4] or u < 0.55 and green[3] or u < 0.8 and green[2] or green[1]
      if not (u > 0.7 and L.hash(i, y, seed) > 0.6) then L.put(img, ox + x0 + i, base - y, c, u > 0.85 and 160 or 255) end end
  end
end

L.piece("a4-greenFire", 18, 18, { k = 4, light = { 0, -25, 150, "100,240,140" }, flicker = true, smoke = true }, function(img, f, ox)
  local M = L.mask(18, 18); L.tube(M, 2, 17, 15, 15, 1.2); L.tube(M, 3, 15, 16, 17, 1.2); L.paint(img, M, char, { dx = ox })
  blaze(img, ox, 2, 14, 15, 15, 3)
end)

L.piece("a4-bombs", 24, 18, { k = 3.4, light = { 0, -20, 60, "100,240,140" } }, function(img, f, ox)
  for i, c in ipairs({ { 1, 6, 11, 12 }, { 12, 9, 11, 9 } }) do local M = L.mask(24, 18); L.rect(M, c[1], c[2], c[3], c[4]); L.paint(img, M, wood, { dx = ox, flat = 0.5, seed = i })
    local S = L.mask(24, 18); local cx, cy = c[1] + c[3] // 2, c[2] + c[4] // 2; for t = 0, 15 do local a = t / 16 * math.pi * 2; L.set(S, cx + 2.5 * math.cos(a), cy + 2.5 * math.sin(a)) end; L.line(S, cx - 2, cy, cx + 2, cy); L.fill(img, S, green[2], 255, ox) end
  local B = L.mask(24, 18); L.ell(B, 18, 5, 3, 3); L.rect(B, 17, 1, 2, 2); L.paint(img, B, glassG, { dx = ox, flat = 0.55 }); L.put(img, ox + 18, 0, green[4])
end)

L.piece("a4-scaffold", 40, 40, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(40, 40); L.tube(M, 4, 40, 8, 4, 1); L.tube(M, 20, 40, 34, 10, 1); L.tube(M, 2, 26, 38, 30, 0.9); L.tube(M, 6, 12, 30, 22, 0.8); L.tube(M, 8, 36, 30, 16, 0.6)
  L.paint(img, M, char, { dx = ox, flat = 0.45 })
  for _, p in ipairs({ { 10, 27 }, { 28, 29 }, { 18, 17 } }) do L.put(img, ox + p[1], p[2], green[2]); L.put(img, ox + p[1] + 1, p[2] - 1, green[3]) end
end)

L.piece("a4-vials", 18, 5, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 4 do local x = 1 + i * 3.5; local M = L.mask(18, 5); L.poly(M, { x, 5, x + 1, 2 + (i % 2), x + 2.5, 5 }); L.paint(img, M, glassG, { dx = ox, flat = 0.6, alpha = 220 }) end
  for x = 2, 16, 3 do L.put(img, ox + x, 4, green[2], 220) end
end)

L.piece("a4-seam", 24, 20, { k = 3.2, wall = true, light = { 0, -32, 70, "90,240,130" } }, function(img, f, ox)
  local x, y = 9, 0
  for i = 1, 20 do for d = -1, 1 do L.put(img, ox + x + d, y, d == 0 and green[3] or green[1], d == 0 and 255 or 150) end
    y = y + 1; x = x + math.floor((L.hash(i, 6, 211) - 0.45) * 3)
    if i == 10 then for j = 1, 6 do L.put(img, ox + x - j, y + j // 3, green[2], 220) end end end
end)

L.piece("a4-window", 16, 18, { k = 3.2, wall = true, light = { 0, -28, 90, "100,240,140" } }, function(img, f, ox)
  local W = L.mask(16, 18); L.rect(W, 3, 3, 10, 13); L.ell(W, 8, 3, 5, 3); L.fill(img, W, green[2], 255, ox); L.glow(img, ox + 8, 9, 6, green[4], 140)
  local Fr = L.mask(16, 18); L.rect(Fr, 7, 1, 2, 15); L.rect(Fr, 3, 8, 10, 2); L.rect(Fr, 2, 16, 12, 2); L.paint(img, Fr, char, { dx = ox })
  for _, p in ipairs({ { 4, 4 }, { 11, 6 }, { 5, 12 } }) do L.put(img, ox + p[1], p[2], char[1]) end
end)

L.kit.silhouette("a4-fgRuin", 44, 70, L.rgb(10, 14, 10), L.rgb(60, 160, 90), function(M)
  L.rect(M, 2, 20, 12, 50); L.poly(M, { 2, 22, 6, 12, 10, 18, 14, 8, 14, 22 }); L.tube(M, 14, 30, 42, 50, 1.6); L.rect(M, 32, 44, 10, 26)
end)
L.kit.crack("a4-crack", char[1], green[1])

-- ---- loop 2: the city's houses going up in his green fire ----
L.piece("a4-house", 36, 46, { k = 3.4, light = { 0, -70, 160, "100,240,140" }, flicker = true, smoke = true }, function(img, f, ox)
  local W = L.mask(36, 46); L.rect(W, 3, 16, 30, 30); L.paint(img, W, L.ramp(30, 0.15, 0.15, 0.42, 4), { dx = ox, flat = 0.35, noise = 0.3 })
  local T = L.mask(36, 46); L.rect(T, 3, 16, 30, 2); L.rect(T, 3, 16, 2, 30); L.rect(T, 31, 16, 2, 30); L.rect(T, 17, 16, 2, 30); L.rect(T, 3, 30, 30, 2); L.paint(img, T, char, { dx = ox })
  local R = L.mask(36, 46); L.poly(R, { 0, 17, 18, 2, 36, 17 }); for x = 10, 26 do for y = 4, 12 do if L.hash(x, y, 212) > 0.45 then L.unset(R, x, y + 2) end end end; L.paint(img, R, char, { dx = ox, flat = 0.35 })
  for _, wx in ipairs({ 8, 23 }) do local G = L.mask(36, 46); L.rect(G, wx, 20, 6, 7); L.fill(img, G, green[2], 255, ox); L.glow(img, ox + wx + 3, 23, 5, green[4], 140) end
  blaze(img, ox, 8, 20, 12, 12, 13)
end)
