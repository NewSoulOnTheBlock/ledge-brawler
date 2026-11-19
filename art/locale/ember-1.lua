-- Cinderfall (The Ember, chapter 1): the last night the town stands. Beams fallen burning, fires in the streets,
-- seams of heat through the rock, ash heaped, buckets dropped by those who tried, shop signs swinging, the town's
-- frames burning on the horizon.
local L = _G.L
local char = L.ramp(18, 0.18, 0.04, 0.26, 4)
local wood = L.ramp(24, 0.36, 0.08, 0.36, 5)
local ash = L.ramp(20, 0.06, 0.3, 0.62, 3)
local iron = L.ramp(220, 0.08, 0.08, 0.42, 4)
local fire = { L.rgb(200, 50, 20), L.rgb(255, 120, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }
local flame = { fire[2], fire[3], fire[4] }

-- Tongues of fire: `n` of them over a base w wide, at most h tall.
local function blaze(img, ox, x0, w, base, h, seed)
  for i = 0, w - 1 do
    local t = math.floor(h * (0.35 + 0.65 * L.hash(i, seed, 80)) * math.sin((i + 0.5) / w * math.pi))
    for y = 0, t do local u = y / math.max(1, t); local c = u < 0.3 and fire[4] or u < 0.55 and fire[3] or u < 0.8 and fire[2] or fire[1]
      if not (u > 0.7 and L.hash(i, y, seed) > 0.6) then L.put(img, ox + x0 + i, base - y, c, u > 0.85 and 160 or 255) end end
  end
end

L.piece("e1-beam", 30, 16, { k = 3.4, light = { 0, -20, 120, "255,140,50" }, flicker = true, smoke = true }, function(img, f, ox)
  local M = L.mask(30, 16); L.tube(M, 2, 14, 27, 9, 2, 1.6); L.paint(img, M, char, { dx = ox, flat = 0.4 })
  for x = 4, 26, 3 do L.put(img, ox + x, 13 - (x - 2) // 5, fire[2]) end
  blaze(img, ox, 8, 14, 11, 9, 3)
end)

L.piece("e1-fire", 16, 16, { k = 3.4, light = { 0, -25, 150, "255,140,50" }, flicker = true, smoke = true }, function(img, f, ox)
  local M = L.mask(16, 16); L.tube(M, 2, 15, 13, 13, 1.2); L.tube(M, 3, 13, 14, 15, 1.2); L.paint(img, M, char, { dx = ox })
  blaze(img, ox, 2, 12, 13, 13, 7)
end)

L.piece("e1-seam", 24, 20, { k = 3.2, wall = true, light = { 0, -32, 70, "255,110,40" } }, function(img, f, ox)
  local x, y = 6, 0
  for i = 1, 20 do
    for d = -1, 1 do L.put(img, ox + x + d, y, d == 0 and fire[3] or fire[1], d == 0 and 255 or 150) end
    y = y + 1; x = x + math.floor((L.hash(i, 9, 81) - 0.4) * 3)
    if i == 9 then for j = 1, 7 do L.put(img, ox + x + j, y + j // 3, fire[2], 220) end end
  end
end)

L.piece("e1-ash", 22, 7, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(22, 7); L.ell(M, 11, 7, 10, 4); L.paint(img, M, ash, { dx = ox, flat = 0.5, noise = 0.35 })
  for _, p in ipairs({ { 6, 5 }, { 13, 4 }, { 16, 6 } }) do L.put(img, ox + p[1], p[2], fire[2]) end
end)

L.piece("e1-bucket", 10, 9, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(10, 9); L.poly(M, { 1, 1, 9, 1, 8, 9, 2, 9 }); L.paint(img, M, wood, { dx = ox })
  local H = L.mask(10, 9); L.rect(H, 1, 3, 8, 1); L.rect(H, 1, 6, 8, 1); L.paint(img, H, iron, { dx = ox, outline = false })
end)

L.piece("e1-sign", 18, 22, { k = 3, under = true, sway = true }, function(img, f, ox)
  local A = L.mask(18, 22); L.rect(A, 0, 0, 18, 2); L.rect(A, 3, 2, 1, 6); L.rect(A, 14, 2, 1, 6); L.paint(img, A, iron, { dx = ox })
  local B = L.mask(18, 22); L.rect(B, 1, 8, 16, 11); L.paint(img, B, wood, { dx = ox, flat = 0.5 })
  local K = L.mask(18, 22); L.disc(K, 9, 13, 3); L.rect(K, 6, 16, 6, 1); L.fill(img, K, L.rgb(70, 40, 25), 255, ox)
  for x = 12, 17 do L.put(img, ox + x, 19 - (x - 12), char[1]) end
end)

L.kit.far("e1-farTown", 110, 60, L.rgb(30, 12, 12), L.rgb(110, 40, 20), 0.3, function(M)
  L.rect(M, 0, 50, 110, 10)
  for i = 0, 4 do local x = i * 22; local h = 18 + math.floor(L.hash(i, 1, 82) * 16); L.rect(M, x + 2, 50 - h, 16, h); L.poly(M, { x, 50 - h, x + 10, 40 - h, x + 20, 50 - h })
    if i % 2 == 0 then for k = 0, 3 do L.unset(M, x + 6 + k, 50 - h + 2); L.unset(M, x + 5 + k * 2, 50 - h + 6) end end end
end)
L.kit.silhouette("e1-fgPosts", 30, 70, L.rgb(10, 5, 5), L.rgb(120, 40, 20), function(M) L.rect(M, 4, 6, 5, 64); L.tube(M, 6, 20, 26, 8, 2, 1.5); L.rect(M, 20, 30, 5, 40); L.tube(M, 22, 32, 28, 26, 1.5) end)
L.kit.crack("e1-crack", char[1], fire[1])

-- ---- loop 2: the houses themselves, burning, and the carts overturned in the street ----
local plaster = L.ramp(30, 0.2, 0.2, 0.5, 4)
L.piece("e1-house", 36, 46, { k = 3.4, light = { 0, -70, 150, "255,130,50" }, flicker = true, smoke = true }, function(img, f, ox)
  local W = L.mask(36, 46); L.rect(W, 3, 16, 30, 30); L.paint(img, W, plaster, { dx = ox, flat = 0.35, noise = 0.3 })
  local T = L.mask(36, 46); L.rect(T, 3, 16, 30, 2); L.rect(T, 3, 16, 2, 30); L.rect(T, 31, 16, 2, 30); L.rect(T, 17, 16, 2, 30); L.rect(T, 3, 30, 30, 2); L.paint(img, T, char, { dx = ox })
  local R = L.mask(36, 46); L.poly(R, { 0, 17, 18, 2, 36, 17 }); for x = 14, 22 do for y = 2, 9 do if L.hash(x, y, 83) > 0.4 then L.unset(R, x, y + 3) end end end
  L.paint(img, R, char, { dx = ox, flat = 0.35 })
  for _, wx in ipairs({ 8, 23 }) do local G = L.mask(36, 46); L.rect(G, wx, 20, 6, 7); L.fill(img, G, fire[2], 255, ox); L.glow(img, ox + wx + 3, 23, 5, fire[4], 140) end
  local D = L.mask(36, 46); L.rect(D, 14, 35, 8, 11); L.fill(img, D, L.rgb(30, 10, 8), 255, ox)
  blaze(img, ox, 12, 14, 9, 9, 11)
end)
L.piece("e1-cart", 28, 16, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(28, 16); L.poly(M, { 2, 4, 24, 8, 22, 13, 1, 9 }); L.paint(img, M, wood, { dx = ox })
  local Wh = L.mask(28, 16); for t = 0, 39 do local a = t / 40 * math.pi * 2; L.set(Wh, 20 + 5 * math.cos(a), 10 + 5 * math.sin(a)) end; L.line(Wh, 15, 10, 25, 10); L.line(Wh, 20, 5, 20, 15)
  L.paint(img, Wh, wood, { dx = ox, flat = 0.6 })
end)

-- ---- loop 3: scorched grass and smouldering debris along every street ----
L.kit.tuft("e1-scorched", L.ramp(30, 0.25, 0.08, 0.3, 4), 6, { seed = 31 })
L.piece("e1-debris", 18, 5, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(18, 5); L.tube(M, 1, 4, 9, 3, 0.9); L.tube(M, 7, 4, 16, 4, 0.8); L.disc(M, 13, 3, 1.2); L.paint(img, M, char, { dx = ox })
  L.put(img, ox + 5, 3, fire[2]); L.put(img, ox + 12, 3, fire[3]); L.put(img, ox + 15, 4, fire[1])
end)
