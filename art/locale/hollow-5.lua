-- The Living Brother (The Hollow, chapter 5): the marsh, where a man from her life before finds her. The family's
-- homestead gone back to the wild: willows trailing over the water, his camp and its fire, keepsakes, a doll, flowers
-- run wild, the old well, the garden fence fallen, fireflies; willows far, fronds hanging near.
local L = _G.L
local willow = L.ramp(95, 0.35, 0.15, 0.5, 4)
local bark = L.ramp(28, 0.25, 0.1, 0.34, 4)
local wood = L.ramp(26, 0.32, 0.1, 0.4, 5)
local stone = L.ramp(250, 0.1, 0.18, 0.56, 5)
local canvas = L.ramp(40, 0.25, 0.35, 0.72, 4)
local petals = { L.rgb(255, 190, 210), L.rgb(255, 240, 150), L.rgb(190, 200, 255), L.rgb(255, 255, 255) }
local fire = { L.rgb(255, 110, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }

L.piece("h5-willow", 40, 60, { k = 3.4, sway = true }, function(img, f, ox)
  local T = L.mask(40, 60); L.tube(T, 20, 60, 19, 18, 3, 2); L.tube(T, 19, 26, 8, 14, 1.4, 0.6); L.tube(T, 19, 22, 31, 12, 1.4, 0.6); L.paint(img, T, bark, { dx = ox })
  local C = L.mask(40, 60); L.ell(C, 20, 12, 18, 10); for x = 2, 38 do if x % 2 == 0 then local l = 8 + math.floor(L.hash(x, 1, 170) * 26); L.rect(C, x, 12, 1, l) end end
  L.paint(img, C, willow, { dx = ox, flat = 0.5, outline = false, grad = function(x, y) return -y / 120 end })
end)

L.piece("h5-camp", 34, 22, { k = 3.4, light = { 10, -20, 120, "255,150,60" }, flicker = true, smoke = true }, function(img, f, ox)
  local Tn = L.mask(34, 22); L.poly(Tn, { 1, 22, 11, 4, 21, 22 }); L.paint(img, Tn, canvas, { dx = ox, flat = 0.45 })
  local D = L.mask(34, 22); L.poly(D, { 8, 22, 11, 13, 14, 22 }); L.fill(img, D, L.rgb(30, 22, 16), 255, ox)
  local F = L.mask(34, 22); for i = 0, 3 do L.tube(F, 24 + i * 2, 21, 30 - i, 20, 0.6) end; L.paint(img, F, bark, { dx = ox })
  for i = 0, 5 do local x = 24 + i; local h = math.floor(6 * math.sin((i + 0.5) / 6 * math.pi)); for y = 0, h do local u = y / math.max(1, h); L.put(img, ox + x, 19 - y, u < 0.35 and fire[3] or u < 0.7 and fire[2] or fire[1]) end end
end)

L.piece("h5-doll", 10, 12, { k = 3, wall = true }, function(img, f, ox)
  local B = L.mask(10, 12); L.poly(B, { 3, 12, 4, 5, 6, 5, 7, 12 }); L.tube(B, 4, 6, 1, 9, 0.6); L.tube(B, 6, 6, 9, 9, 0.6); L.paint(img, B, L.ramp(0, 0.4, 0.35, 0.65, 3), { dx = ox })
  local H = L.mask(10, 12); L.disc(H, 5, 3, 2.2); L.paint(img, H, canvas, { dx = ox, flat = 0.6 }); L.put(img, ox + 4, 3, L.rgb(30, 20, 20)); L.put(img, ox + 6, 3, L.rgb(30, 20, 20))
end)

L.piece("h5-flowers", 20, 10, { k = 4, wall = true, sway = true }, function(img, f, ox)
  for i = 0, 6 do local x = 1 + i * 3; local h = 4 + math.floor(L.hash(i, 1, 171) * 5)
    for y = 0, h do L.put(img, ox + x, 9 - y, willow[2]) end
    local c = petals[i % 4 + 1]; L.put(img, ox + x, 9 - h - 1, c); L.put(img, ox + x - 1, 9 - h, c); L.put(img, ox + x + 1, 9 - h, c); L.put(img, ox + x, 9 - h, L.rgb(255, 220, 90)) end
end)

L.piece("h5-well", 22, 28, { k = 3.4 }, function(img, f, ox)
  local S = L.mask(22, 28); L.rect(S, 2, 18, 18, 10); L.paint(img, S, stone, { dx = ox, flat = 0.5 }); for y = 20, 26, 3 do for x = 2, 19 do if (x + y) % 5 == 0 then L.put(img, ox + x, y, stone[1]) end end end
  local R = L.mask(22, 28); L.rect(R, 3, 4, 2, 15); L.rect(R, 17, 4, 2, 15); L.poly(R, { 0, 5, 11, 0, 22, 5 }); L.rect(R, 4, 9, 14, 1); L.paint(img, R, wood, { dx = ox })
  local B = L.mask(22, 28); L.rect(B, 10, 10, 1, 4); L.rect(B, 9, 14, 3, 3); L.paint(img, B, wood, { dx = ox, flat = 0.6, outline = false })
  local V = L.mask(22, 28); for x = 2, 19 do if L.hash(x, 1, 172) > 0.5 then L.rect(V, x, 18, 1, 1 + math.floor(L.hash(x, 2, 173) * 5)) end end; L.paint(img, V, willow, { dx = ox, outline = false })
end)

L.piece("h5-fence", 30, 14, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 14); L.rect(M, 2, 3, 2, 11); L.tube(M, 13, 14, 16, 4, 0.9); L.rect(M, 26, 5, 2, 9); L.tube(M, 2, 6, 15, 8, 0.6); L.tube(M, 15, 9, 27, 7, 0.6)
  L.paint(img, M, wood, { dx = ox, flat = 0.5 })
end)

L.piece("h5-fireflies", 30, 24, { k = 3, light = { 0, -40, 70, "220,255,140" }, flicker = true }, function(img, f, ox)
  for i = 0, 6 do local x, y = 2 + math.floor(L.hash(i, 1, 174) * 26), 2 + math.floor(L.hash(i, 2, 175) * 20); L.glow(img, ox + x, y, 2.5, L.rgb(230, 255, 150), 200); L.put(img, ox + x, y, L.rgb(255, 255, 220)) end
end)

L.kit.drape("h5-fronds", willow, 34, { seed = 41 })
L.kit.far("h5-farWillows", 120, 50, L.rgb(18, 22, 26), L.rgb(60, 80, 70), 0.3, function(M)
  L.rect(M, 0, 44, 120, 6); for _, x in ipairs({ 18, 58, 100 }) do L.ell(M, x, 24, 16, 10); for k = -14, 14, 3 do L.rect(M, x + k, 24, 2, 20 - math.abs(k) // 2) end; L.rect(M, x - 1, 30, 3, 14) end
end)

-- ---- loop 2: moss carpeting what was the yard ----
L.piece("h5-moss", 26, 5, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(26, 5); L.ell(M, 13, 5, 13, 3); for x = 0, 25 do if L.hash(x, 1, 176) > 0.5 then L.set(M, x, 1 + math.floor(L.hash(x, 2, 177) * 2)) end end
  L.paint(img, M, willow, { dx = ox, flat = 0.6, outline = false, noise = 0.3 })
  for i = 0, 3 do L.put(img, ox + 4 + i * 6, 2, petals[i % 4 + 1]) end
end)
