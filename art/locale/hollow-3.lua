-- A Thousand Names (The Hollow, chapter 3): carrying the dead down to the old burial ground. Headstones in rows with
-- names on them, mounds with candles round them, coffins and the shrouded dead on biers, funeral lanterns, chimes of
-- bone, tablets of names set into the rock, wreaths; a hill of steles far, tall steles near.
local L = _G.L
local stone = L.ramp(255, 0.1, 0.16, 0.6, 5)
local moss = L.ramp(140, 0.3, 0.12, 0.4, 4)
local wood = L.ramp(22, 0.35, 0.08, 0.36, 5)
local shroud = L.ramp(40, 0.12, 0.45, 0.85, 4)
local bone = L.ramp(42, 0.22, 0.4, 0.86, 4, 14)
local lamp = L.rgb(255, 210, 140)
local flame = { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) }

local function names(img, ox, x0, y0, w, rows, c)
  for r = 0, rows - 1 do local len = math.floor(w * (0.5 + 0.5 * L.hash(r, x0, 150))); for x = 0, len - 1 do if L.hash(x, r, 151) > 0.3 then L.put(img, ox + x0 + x, y0 + r * 2, c, 220) end end end
end

L.piece("h3-stones", 32, 20, { k = 3.4 }, function(img, f, ox)
  for i, s in ipairs({ { 1, 6, 8, 14 }, { 11, 2, 9, 18 }, { 22, 7, 8, 13 } }) do
    local M = L.mask(32, 20); L.rect(M, s[1], s[2] + 3, s[3], s[4] - 3); L.ell(M, s[1] + s[3] / 2, s[2] + 3, s[3] / 2, 3); L.paint(img, M, stone, { dx = ox, flat = 0.45, seed = i })
    names(img, ox, s[1] + 2, s[2] + 5, s[3] - 4, 3, stone[1])
    local Mo = L.mask(32, 20); L.ell(Mo, s[1] + 2, 19, 2.5, 1.5); L.paint(img, Mo, moss, { dx = ox, outline = false })
  end
end)

L.piece("h3-mound", 30, 12, { k = 3.4, light = { 0, -20, 90, "255,190,110" }, flicker = true }, function(img, f, ox)
  local M = L.mask(30, 12); L.ell(M, 15, 12, 13, 6); L.paint(img, M, L.ramp(30, 0.3, 0.1, 0.32, 4), { dx = ox, flat = 0.5 })
  for _, x in ipairs({ 3, 9, 21, 27 }) do local C = L.mask(30, 12); L.rect(C, x, 7, 1, 4); L.fill(img, C, shroud[4], 255, ox); L.kit.flame(img, ox, x, 5, flame) end
end)

L.piece("h3-bier", 34, 16, { k = 3.4 }, function(img, f, ox)
  local B = L.mask(34, 16); L.rect(B, 2, 10, 30, 2); L.rect(B, 4, 12, 2, 4); L.rect(B, 28, 12, 2, 4); L.paint(img, B, wood, { dx = ox })
  local S = L.mask(34, 16); L.ell(S, 17, 8, 14, 3.4); L.ell(S, 6, 7, 3.4, 3); L.paint(img, S, shroud, { dx = ox, flat = 0.5 })
  for x = 9, 27, 3 do L.put(img, ox + x, 7, shroud[2]) end
end)

L.piece("h3-coffin", 14, 30, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(14, 30); L.poly(M, { 4, 1, 10, 1, 13, 8, 10, 29, 4, 29, 1, 8 }); L.paint(img, M, wood, { dx = ox, flat = 0.45 })
  local X = L.mask(14, 30); L.rect(X, 6, 6, 2, 12); L.rect(X, 3, 10, 8, 2); L.paint(img, X, wood, { dx = ox, flat = 0.75, outline = false })
end)

L.piece("h3-lantern", 12, 38, { k = 3.2, light = { 2, -110, 110, "255,210,140" }, flicker = true }, function(img, f, ox)
  local M = L.mask(12, 38); L.rect(M, 3, 6, 2, 32); L.tube(M, 4, 6, 9, 8, 0.6); L.paint(img, M, wood, { dx = ox })
  local G = L.mask(12, 38); L.rect(G, 8, 9, 3, 5); L.fill(img, G, lamp, 255, ox); L.glow(img, ox + 9, 11, 4, lamp, 140)
end)

L.piece("h3-chimes", 14, 30, { k = 3, under = true, sway = true }, function(img, f, ox)
  local T = L.mask(14, 30); L.rect(T, 1, 0, 12, 2); for _, x in ipairs({ 2, 5, 8, 11 }) do L.rect(T, x, 2, 1, 6) end; L.paint(img, T, wood, { dx = ox, outline = false })
  for i, x in ipairs({ 2, 5, 8, 11 }) do local B = L.mask(14, 30); L.tube(B, x, 8, x, 16 + (i % 3) * 4, 0.8); L.disc(B, x, 16 + (i % 3) * 4, 1.2); L.paint(img, B, bone, { dx = ox, flat = 0.55 }) end
end)

L.piece("h3-tablets", 30, 16, { k = 3.4, wall = true }, function(img, f, ox)
  for c = 0, 3 do for r = 0, 1 do local M = L.mask(30, 16); L.rect(M, 1 + c * 7, 1 + r * 8, 6, 7); L.paint(img, M, stone, { dx = ox, flat = 0.55, alpha = 200, seed = c + r * 4 }); names(img, ox, 2 + c * 7, 3 + r * 8, 4, 2, stone[1]) end end
end)

L.piece("h3-wreath", 12, 12, { k = 3, wall = true }, function(img, f, ox)
  for t = 0, 23 do local a = t / 24 * math.pi * 2; local M = L.mask(12, 12); L.disc(M, 6 + 4 * math.cos(a), 6 + 4 * math.sin(a), 1.4); L.paint(img, M, moss, { dx = ox, flat = 0.5, outline = false }) end
  for _, a in ipairs({ 0.5, 2.6, 4.4 }) do L.put(img, ox + 6 + math.floor(4 * math.cos(a)), 6 + math.floor(4 * math.sin(a)), L.rgb(230, 230, 250)) end
end)

L.kit.far("h3-farHill", 120, 56, L.rgb(16, 18, 30), L.rgb(60, 66, 100), 0.28, function(M)
  L.ell(M, 60, 66, 70, 34); for i = 0, 11 do local x = 10 + i * 9; local y = 66 - math.floor(math.sqrt(math.max(0, 1 - ((x - 60) / 70) ^ 2)) * 34); L.rect(M, x, y - 6, 3, 7); L.rect(M, x - 1, y - 4, 5, 1) end
end)
L.kit.silhouette("h3-fgSteles", 36, 70, L.rgb(8, 9, 16), stone[2], function(M)
  L.rect(M, 2, 16, 10, 54); L.ell(M, 7, 16, 5, 5); L.rect(M, 20, 34, 12, 36); L.poly(M, { 20, 36, 26, 28, 32, 36 })
end)

-- ---- loop 2: the family plots behind their iron railings ----
L.piece("h3-plot", 36, 22, { k = 3.4 }, function(img, f, ox)
  local G = L.mask(36, 22); L.rect(G, 12, 6, 10, 16); L.ell(G, 17, 6, 5, 4); L.paint(img, G, stone, { dx = ox, flat = 0.5 }); names(img, ox, 14, 9, 6, 4, stone[1])
  local R = L.mask(36, 22); L.rect(R, 0, 12, 36, 1); L.rect(R, 0, 19, 36, 1); for x = 1, 35, 3 do L.rect(R, x, 10, 1, 12); L.poly(R, { x - 0.8, 11, x + 0.5, 8, x + 1.8, 11 }) end
  L.paint(img, R, L.ramp(220, 0.1, 0.08, 0.38, 3), { dx = ox, flat = 0.5, outline = false })
end)
