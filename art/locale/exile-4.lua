-- The Frozen Dead (The Exile, chapter 4): a battle kept whole under the ice. Soldiers seen through the ice inside the
-- rock itself, spears and shields jutting from the snow, banners frozen stiff, clusters of ice crystal glowing, ice
-- hanging from every ceiling, cracked sheets underfoot; shards of ice in front.
local L = _G.L
local ice = L.ramp(195, 0.55, 0.35, 0.95, 5)
local deepIce = L.rgb(60, 120, 170)
local snow = L.ramp(205, 0.3, 0.72, 0.97, 3)
local steel = L.ramp(210, 0.12, 0.25, 0.75, 4)
local wood = L.ramp(24, 0.3, 0.1, 0.38, 4)
local cloth = L.ramp(225, 0.4, 0.2, 0.5, 4)

-- A soldier seen through the ice inside the rock: a pale block, and in it a dark figure caught mid-stride.
L.piece("x4-entombed", 22, 30, { k = 3.4, wall = true, light = { 0, -50, 60, "120,200,255" } }, function(img, f, ox)
  local B = L.mask(22, 30); L.poly(B, { 2, 4, 18, 1, 21, 26, 4, 29 }); L.fill(img, B, deepIce, 200, ox)
  L.each(B, function(x, y) if (x + y) % 7 == 0 then L.put(img, ox + x, y, ice[5], 90) end end)
  local S = L.mask(22, 30); L.disc(S, 11, 8, 2.4); L.poly(S, { 8, 11, 14, 11, 15, 20, 7, 20 }); L.tube(S, 9, 20, 6, 27, 1); L.tube(S, 13, 20, 16, 27, 1); L.tube(S, 14, 13, 19, 7, 0.9); L.tube(S, 8, 13, 4, 17, 0.9)
  L.fill(img, S, L.rgb(20, 30, 50), 220, ox)
  L.each(B, function(x, y) if not L.on(B, x - 1, y) or not L.on(B, x, y - 1) then L.put(img, ox + x, y, ice[5], 230) end end)
end)

L.piece("x4-jutting", 26, 24, { k = 3.4 }, function(img, f, ox)
  local S = L.mask(26, 24); L.tube(S, 5, 24, 10, 2, 0.7); L.tube(S, 18, 24, 22, 8, 0.7); L.paint(img, S, wood, { dx = ox, outline = false })
  for _, h in ipairs({ { 10, 2 }, { 22, 8 } }) do local H = L.mask(26, 24); L.poly(H, { h[1] - 1, h[2] + 3, h[1] + 0.5, h[2] - 3, h[1] + 2, h[2] + 3 }); L.paint(img, H, steel, { dx = ox, flat = 0.6 }) end
  local Sh = L.mask(26, 24); L.ell(Sh, 13, 18, 4, 5); L.paint(img, Sh, steel, { dx = ox, flat = 0.5 }); L.put(img, ox + 13, 18, ice[2])
  local D = L.mask(26, 24); L.ell(D, 13, 23, 12, 2.5); L.paint(img, D, snow, { dx = ox, outline = false })
end)

L.piece("x4-banner", 16, 44, { k = 3.4 }, function(img, f, ox)
  local P = L.mask(16, 44); L.tube(P, 4, 44, 5, 2, 0.8); L.paint(img, P, wood, { dx = ox })
  local F = L.mask(16, 44); L.poly(F, { 5, 4, 15, 5, 14, 18, 10, 15, 5, 19 }); L.paint(img, F, cloth, { dx = ox, flat = 0.45 })
  for x = 5, 15 do L.put(img, ox + x, 4 + (x - 5) // 10, snow[3]) end; for _, p in ipairs({ { 7, 19 }, { 11, 16 }, { 14, 18 } }) do L.put(img, ox + p[1], p[2] + 1, ice[4]); L.put(img, ox + p[1], p[2] + 2, ice[3]) end
end)

L.piece("x4-crystals", 18, 18, { k = 3.4, light = { 0, -25, 90, "120,210,255" } }, function(img, f, ox)
  for i, c in ipairs({ { 9, 0, 3 }, { 4, 6, 2.2 }, { 14, 5, 2.4 }, { 7, 9, 1.8 } }) do local M = L.mask(18, 18); L.poly(M, { c[1] - c[3], 18, c[1], c[2], c[1] + c[3], 18 }); L.paint(img, M, ice, { dx = ox, flat = 0.55, seed = i, rim = L.rgb(240, 255, 255) }) end
  L.glow(img, ox + 9, 12, 7, L.rgb(170, 230, 255), 90)
end)

L.piece("x4-crackedIce", 26, 4, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(26, 4); L.rect(M, 0, 1, 26, 3); L.paint(img, M, ice, { dx = ox, flat = 0.55, outline = false, alpha = 220 })
  for _, x in ipairs({ 5, 13, 20 }) do L.put(img, ox + x, 2, deepIce); L.put(img, ox + x + 1, 3, deepIce); L.put(img, ox + x - 1, 3, deepIce) end
end)

L.kit.drape("x4-spikes", ice, 20, { taper = true, sway = false, seed = 15 })
L.kit.silhouette("x4-fgShards", 44, 56, L.rgb(12, 22, 34), L.rgb(170, 220, 250), function(M)
  L.poly(M, { 0, 56, 8, 8, 14, 56 }); L.poly(M, { 12, 56, 22, 0, 30, 56 }); L.poly(M, { 28, 56, 36, 20, 44, 56 })
end)

-- ---- loop 2: more of the host in the ice, a spearman among them ----
L.piece("x4-spearman", 26, 32, { k = 3.4, wall = true, light = { 0, -50, 60, "120,200,255" } }, function(img, f, ox)
  local B = L.mask(26, 32); L.poly(B, { 1, 3, 22, 0, 25, 28, 3, 31 }); L.fill(img, B, deepIce, 200, ox)
  L.each(B, function(x, y) if (x - y) % 6 == 0 then L.put(img, ox + x, y, ice[5], 80) end end)
  local S = L.mask(26, 32); L.disc(S, 9, 9, 2.4); L.poly(S, { 6, 12, 12, 12, 13, 21, 5, 21 }); L.tube(S, 7, 21, 4, 29, 1); L.tube(S, 11, 21, 14, 28, 1); L.tube(S, 11, 14, 22, 3, 0.7); L.poly(S, { 21, 5, 24, 1, 23, 6 })
  L.fill(img, S, L.rgb(20, 30, 50), 220, ox)
  L.each(B, function(x, y) if not L.on(B, x - 1, y) or not L.on(B, x, y - 1) then L.put(img, ox + x, y, ice[5], 230) end end)
end)

-- ---- loop 3: the battle's litter in the snow, rimed with frost ----
L.piece("x4-litter", 22, 6, { k = 3.2, wall = true }, function(img, f, ox)
  local H = L.mask(22, 6); L.ell(H, 5, 4, 3.4, 2.6); L.rect(H, 1, 5, 8, 1); L.paint(img, H, steel, { dx = ox, flat = 0.5, rim = snow[3] })
  local S = L.mask(22, 6); L.tube(S, 10, 5, 21, 3, 0.6); L.paint(img, S, steel, { dx = ox, flat = 0.65, rim = snow[3] })
  local D = L.mask(22, 6); L.ell(D, 13, 6, 9, 1.4); L.paint(img, D, snow, { dx = ox, outline = false })
end)
