-- The Last Patient (The Hollow, chapter 1): the marsh where the healer died, awake where she fell. Her satchel and
-- herbs hung to dry, bog pools with lilies, wisps of marsh-light over the water, mud bubbling, roots through the
-- rock; drowned trees far, reeds dark in front.
local L = _G.L
local leather = L.ramp(28, 0.4, 0.12, 0.42, 4)
local herb = L.ramp(95, 0.4, 0.2, 0.55, 4)
local bog = L.ramp(170, 0.35, 0.08, 0.3, 4)
local lily = L.ramp(120, 0.45, 0.2, 0.5, 3)
local mud = L.ramp(30, 0.3, 0.08, 0.28, 4)
local root = L.ramp(28, 0.3, 0.1, 0.34, 4)
local wisp = L.rgb(140, 255, 210)

L.piece("h1-satchel", 16, 12, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(16, 12); L.poly(M, { 2, 4, 14, 4, 15, 12, 1, 12 }); L.paint(img, M, leather, { dx = ox, flat = 0.45 })
  local F = L.mask(16, 12); L.poly(F, { 2, 4, 14, 4, 13, 8, 3, 8 }); L.paint(img, F, leather, { dx = ox, flat = 0.6 })
  L.put(img, ox + 8, 7, L.rgb(220, 200, 120)); for i = 0, 4 do L.put(img, ox + 3 + i * 3, 3 - (i % 2), herb[3]) end
  local Bt = L.mask(16, 12); L.rect(Bt, 11, 0, 3, 4); L.paint(img, Bt, L.ramp(150, 0.4, 0.3, 0.7, 3), { dx = ox, flat = 0.55 })
end)

L.piece("h1-herbs", 18, 22, { k = 3, under = true, sway = true }, function(img, f, ox)
  local S = L.mask(18, 22); L.rect(S, 0, 0, 18, 1); for _, x in ipairs({ 4, 9, 14 }) do L.rect(S, x, 1, 1, 4) end; L.paint(img, S, root, { dx = ox, outline = false })
  for i, x in ipairs({ 4, 9, 14 }) do local M = L.mask(18, 22); local l = 10 + (i % 2) * 5; for j = -2, 2 do L.line(M, x, 5, x + j * 1.2, 5 + l - math.abs(j)) end; L.paint(img, M, herb, { dx = ox, flat = 0.5, outline = false })
    L.put(img, ox + x, 5, L.rgb(160, 60, 60)); L.put(img, ox + x + 1, 5, L.rgb(160, 60, 60)) end
end)

L.piece("h1-pool", 30, 6, { k = 3.4, wall = true, light = { 0, -10, 80, "100,220,190" } }, function(img, f, ox)
  local W = L.mask(30, 6); L.ell(W, 15, 3, 15, 3); L.each(W, function(x, y) L.put(img, ox + x, y, y < 2 and L.rgb(80, 150, 140) or bog[2]) end)
  for _, p in ipairs({ { 7, 2 }, { 19, 3 } }) do local P = L.mask(30, 6); L.ell(P, p[1], p[2], 3, 1.3); L.paint(img, P, lily, { dx = ox, outline = false }); L.put(img, ox + p[1] + 1, p[2] - 1, L.rgb(255, 230, 240)) end
end)

L.piece("h1-wisp", 10, 10, { k = 3, light = { 0, -40, 90, "140,255,210" }, flicker = true }, function(img, f, ox)
  L.glow(img, ox + 5, 5, 5, wisp, 230); L.put(img, ox + 5, 5, L.rgb(240, 255, 250)); L.put(img, ox + 4, 5, L.rgb(200, 255, 235))
end)

L.piece("h1-mud", 20, 6, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(20, 6); L.ell(M, 10, 5, 10, 2.5); L.paint(img, M, mud, { dx = ox, flat = 0.5, outline = false })
  for _, b in ipairs({ { 6, 3, 1.4 }, { 13, 2, 1.8 } }) do local B = L.mask(20, 6); L.disc(B, b[1], b[2], b[3]); L.paint(img, B, mud, { dx = ox, flat = 0.7, rim = L.rgb(120, 100, 70) }) end
end)

L.kit.drape("h1-roots", root, 24, { taper = true, seed = 25 })
L.kit.tuft("h1-sedge", L.ramp(110, 0.35, 0.15, 0.48, 4), 10, { seed = 61 })
L.kit.far("h1-farDrowned", 120, 70, L.rgb(16, 30, 34), L.rgb(60, 100, 100), 0.3, function(M)
  L.rect(M, 0, 62, 120, 8)
  for _, x in ipairs({ 14, 52, 96 }) do L.tube(M, x, 70, x + 2, 16, 2.5, 1); L.tube(M, x + 1, 34, x - 10, 22, 1, 0.4); L.tube(M, x + 2, 26, x + 12, 14, 1, 0.4) end
end)
L.kit.silhouette("h1-fgReeds", 36, 60, L.rgb(6, 14, 14), L.rgb(60, 110, 100), function(M)
  for i = 0, 8 do local x = 2 + i * 4; local h = 30 + math.floor(L.hash(i, 1, 140) * 28); L.tube(M, x, 60, x + (L.hash(i, 2, 141) - 0.5) * 6, 60 - h, 0.9, 0.3); if i % 3 == 0 then L.ell(M, x + 1, 64 - h, 1.6, 4) end end
end)

-- ---- loop 2: light in the dark marsh: fungus glowing on the rock, the healer's hut, lanterns on poles, fallen logs ----
local glowF = L.ramp(175, 0.8, 0.35, 0.9, 4)
L.piece("h1-shelf", 16, 12, { k = 3.2, wall = true, light = { 0, -18, 70, "90,230,220" } }, function(img, f, ox)
  for i, s in ipairs({ { 5, 4, 5 }, { 10, 8, 4 }, { 6, 11, 3 } }) do local M = L.mask(16, 12); L.ell(M, s[1], s[2], s[3], 1.6); L.paint(img, M, glowF, { dx = ox, flat = 0.6, seed = i }) end
  L.glow(img, ox + 7, 7, 6, L.rgb(160, 255, 240), 80)
end)
L.piece("h1-hut", 36, 30, { k = 3.4, light = { -10, -40, 110, "255,190,110" }, flicker = true }, function(img, f, ox)
  local W = L.mask(36, 30); L.rect(W, 5, 12, 24, 18); L.paint(img, W, L.ramp(30, 0.3, 0.12, 0.38, 4), { dx = ox, flat = 0.4 })
  for y = 14, 28, 3 do for x = 5, 28 do L.put(img, ox + x, y, L.rgb(40, 30, 22), 140) end end
  local R = L.mask(36, 30); L.poly(R, { 1, 14, 17, 2, 34, 14 }); for x = 18, 26 do for y = 6, 12 do if L.hash(x, y, 142) > 0.5 then L.unset(R, x, y) end end end
  L.paint(img, R, herb, { dx = ox, flat = 0.4, noise = 0.35 })
  local G = L.mask(36, 30); L.rect(G, 10, 17, 5, 5); L.fill(img, G, L.rgb(255, 200, 120), 255, ox); L.glow(img, ox + 12, 19, 4, L.rgb(255, 230, 170), 130)
  local D = L.mask(36, 30); L.rect(D, 20, 18, 6, 12); L.fill(img, D, L.rgb(14, 10, 8), 255, ox)
end)
L.piece("h1-lantern", 10, 40, { k = 3.2, light = { 2, -110, 110, "255,190,110" }, flicker = true }, function(img, f, ox)
  local M = L.mask(10, 40); L.tube(M, 3, 40, 4, 6, 0.9); L.rect(M, 4, 6, 4, 1); L.paint(img, M, root, { dx = ox })
  local G = L.mask(10, 40); L.ell(G, 7, 10, 2, 2.5); L.fill(img, G, L.rgb(255, 200, 120), 255, ox); L.glow(img, ox + 7, 10, 4, L.rgb(255, 230, 170), 140)
end)
L.piece("h1-log", 34, 10, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(34, 10); L.tube(M, 2, 6, 32, 5, 3.4); L.paint(img, M, root, { dx = ox, flat = 0.45 })
  local E = L.mask(34, 10); L.ell(E, 32, 5, 2, 3.2); L.paint(img, E, L.ramp(36, 0.3, 0.35, 0.65, 3), { dx = ox, outline = false })
  local Mo = L.mask(34, 10); for x = 4, 28 do if L.hash(x, 1, 143) > 0.4 then L.set(Mo, x, 2 + math.floor(L.hash(x, 2, 144) * 2)) end end; L.paint(img, Mo, lily, { dx = ox, outline = false })
end)
