-- The Weeping City (The Hollow, chapter 4): up through a drowned city's towers to hear what its dead are saying. Kelp
-- from every ledge, barnacles and shells grown into the stone, statues that weep, coral, lamps still glowing under the
-- water, anchors hung on chains, the bones of fish in the rock, the city's mosaics on its walls; tall kelp in front.
local L = _G.L
local kelp = L.ramp(140, 0.45, 0.12, 0.42, 4)
local shell = L.ramp(20, 0.25, 0.4, 0.82, 4)
local stone = L.ramp(205, 0.15, 0.2, 0.62, 5)
local coral = L.ramp(345, 0.65, 0.35, 0.72, 4)
local iron = L.ramp(200, 0.15, 0.1, 0.42, 4)
local bone = L.ramp(180, 0.12, 0.5, 0.85, 3)
local glowB = L.rgb(140, 230, 255)
local tiles = { L.rgb(40, 120, 160), L.rgb(220, 190, 110), L.rgb(60, 160, 140), L.rgb(30, 70, 120) }

L.kit.drape("h4-kelpHang", kelp, 30, { seed = 31 })
L.piece("h4-kelp", 14, 40, { k = 3.4, sway = true }, function(img, f, ox)
  for i, x in ipairs({ 3, 7, 11 }) do local M = L.mask(14, 40); local h = 22 + i * 5; for y = 0, h do L.disc(M, x + math.sin(y / 5 + i) * 1.6, 40 - y, y < h - 3 and 1 or 0.6) end; L.paint(img, M, kelp, { dx = ox, flat = 0.5, outline = false }) end
end)

L.piece("h4-barnacles", 18, 12, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 7 do local x, y = 2 + math.floor(L.hash(i, 1, 160) * 14), 2 + math.floor(L.hash(i, 2, 161) * 8); local M = L.mask(18, 12); L.disc(M, x, y, 1.4 + L.hash(i, 3, 162)); L.paint(img, M, shell, { dx = ox, flat = 0.5, seed = i }); L.put(img, ox + x, y, L.rgb(30, 30, 40)) end
end)

L.piece("h4-weeping", 18, 36, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(18, 36); L.rect(M, 3, 30, 12, 6); L.poly(M, { 5, 30, 6, 12, 9, 9, 12, 12, 13, 30 }); L.disc(M, 9, 7, 3); L.tube(M, 7, 13, 6, 6, 1); L.tube(M, 11, 13, 12, 6, 1)
  L.paint(img, M, stone, { dx = ox, flat = 0.45 })
  for y = 8, 20 do L.put(img, ox + 8, y, glowB, 200 - y * 6) ; L.put(img, ox + 10, y + 1, glowB, 190 - y * 6) end
  local Mo = L.mask(18, 36); for x = 3, 15 do if L.hash(x, 1, 163) > 0.35 then L.set(Mo, x, 30 - math.floor(L.hash(x, 2, 164) * 4)) end end; L.paint(img, Mo, kelp, { dx = ox, outline = false })
end)

L.piece("h4-coral", 20, 16, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(20, 16); L.tube(M, 10, 16, 10, 8, 1.2); L.tube(M, 10, 10, 4, 3, 0.9); L.tube(M, 10, 9, 16, 2, 0.9); L.tube(M, 6, 6, 3, 1, 0.6); L.tube(M, 14, 5, 18, 3, 0.6)
  L.paint(img, M, coral, { dx = ox, flat = 0.55 })
end)

L.piece("h4-lamp", 12, 30, { k = 3.2, light = { 0, -80, 120, "140,230,255" } }, function(img, f, ox)
  local M = L.mask(12, 30); L.rect(M, 5, 10, 2, 20); L.rect(M, 3, 28, 6, 2); L.paint(img, M, iron, { dx = ox })
  local G = L.mask(12, 30); L.ell(G, 6, 7, 3.5, 4.5); L.fill(img, G, glowB, 255, ox); L.glow(img, ox + 6, 7, 6, L.rgb(220, 250, 255), 150)
  local C = L.mask(12, 30); L.rect(C, 3, 2, 6, 1); L.rect(C, 3, 11, 6, 1); L.paint(img, C, iron, { dx = ox, outline = false })
end)

L.piece("h4-anchor", 18, 44, { k = 3, under = true, sway = true }, function(img, f, ox)
  local C = L.mask(18, 44); for i = 0, 6 do if i % 2 == 0 then L.ell(C, 9, 2 + i * 3.5, 1.2, 1.8) else L.rect(C, 9, i * 3.5, 1, 3) end end; L.paint(img, C, iron, { dx = ox })
  local A = L.mask(18, 44); L.disc(A, 9, 27, 2); L.rect(A, 8, 27, 2, 14); L.rect(A, 4, 31, 10, 1); for t = 0, 16 do local a = t / 16 * math.pi; L.set(A, 9 - 7 * math.cos(a), 38 + 3 * math.sin(a)) end
  L.poly(A, { 1, 37, 2, 34, 4, 38 }); L.poly(A, { 17, 37, 16, 34, 14, 38 }); L.paint(img, A, iron, { dx = ox, flat = 0.5 })
end)

L.piece("h4-fishBones", 26, 12, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(26, 12); L.line(M, 3, 6, 20, 6); for x = 6, 18, 2 do L.line(M, x, 2, x + 1, 10) end; L.poly(M, { 20, 3, 25, 6, 20, 9 }); L.poly(M, { 1, 2, 4, 6, 1, 10 })
  L.paint(img, M, bone, { dx = ox, flat = 0.5, alpha = 190, outline = false })
end)

L.piece("h4-mosaic", 24, 18, { k = 3.2, wall = true }, function(img, f, ox)
  for y = 0, 17, 3 do for x = 0, 23, 3 do local d = math.sqrt((x - 12) ^ 2 + (y - 9) ^ 2); if d < 10 and L.hash(x, y, 165) > 0.15 then
    local M = L.mask(24, 18); L.rect(M, x, y, 2, 2); L.fill(img, M, tiles[(math.floor(d / 3) % 4) + 1], 210, ox) end end end
end)

L.kit.silhouette("h4-fgKelp", 34, 90, L.rgb(4, 16, 22), L.rgb(40, 110, 120), function(M)
  for i, x in ipairs({ 6, 16, 26 }) do local h = 60 + i * 9; for y = 0, h do L.disc(M, x + math.sin(y / 9 + i) * 3, 90 - y, y < h - 6 and 2.2 or 1.2) end end
end)

-- ---- loop 2: streams of bubbles, so it reads as under water, and jellyfish drifting with their own light ----
L.piece("h4-bubbles", 10, 50, { k = 3, sway = true }, function(img, f, ox)
  for i = 0, 9 do local y = 48 - i * 5 - math.floor(L.hash(i, 1, 166) * 3); local x = 5 + math.floor(math.sin(i * 1.3) * 2.5); local r = 0.8 + i * 0.12
    for t = 0, 11 do local a = t / 12 * math.pi * 2; L.put(img, ox + x + math.floor(r * math.cos(a) + 0.5), y + math.floor(r * math.sin(a) + 0.5), L.rgb(190, 235, 255), 170) end
    L.put(img, ox + x - 1, y - 1, L.rgb(255, 255, 255), 200) end
end)
L.piece("h4-jelly", 14, 26, { k = 3, under = true, sway = true, light = { 0, 30, 80, "220,140,255" } }, function(img, f, ox)
  local B = L.mask(14, 26); L.ell(B, 7, 5, 6, 4.4); L.each(B, function(x, y) if y > 6 then L.unset(B, x, y) end end); L.fill(img, B, L.rgb(220, 150, 255), 190, ox)
  L.glow(img, ox + 7, 5, 6, L.rgb(250, 210, 255), 110)
  for i, x in ipairs({ 3, 6, 8, 11 }) do for y = 7, 14 + i * 2 do L.put(img, ox + x + math.floor(math.sin(y / 3 + i)), y, L.rgb(230, 170, 255), 160) end end
end)
