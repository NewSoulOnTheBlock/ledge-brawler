-- The Bargain (The Ember, chapter 2): down into the burned ground, to find what was sold. Obsidian broken through the
-- floors, pools of lava, the bones of something vast set in the rock, the altar where it was agreed and the contract
-- still burning on it, vents of sulphur, spikes of black glass in front.
local L = _G.L
local obsid = L.ramp(280, 0.25, 0.04, 0.3, 4, 30)
local basalt = L.ramp(10, 0.15, 0.06, 0.3, 4)
local bone = L.ramp(36, 0.25, 0.25, 0.75, 5, 12)
local fire = { L.rgb(190, 40, 20), L.rgb(255, 110, 30), L.rgb(255, 190, 70), L.rgb(255, 245, 190) }
local sulfur = L.ramp(55, 0.7, 0.35, 0.75, 3)

L.piece("e2-obsidian", 18, 16, { k = 3.4 }, function(img, f, ox)
  for i, s in ipairs({ { 4, 16, 2, 4 }, { 9, 16, 6, 0 }, { 14, 16, 4, 7 } }) do local M = L.mask(18, 16); L.poly(M, { s[1] - 3, 16, s[1] + (s[3] - 4) * 0.3, s[4], s[1] + 3, 16 }); L.paint(img, M, obsid, { dx = ox, flat = 0.5, seed = i, rim = L.rgb(200, 140, 255) }) end
end)

L.piece("e2-lava", 26, 6, { k = 3.4, wall = true, light = { 0, -10, 110, "255,110,30" } }, function(img, f, ox)
  local R = L.mask(26, 6); L.ell(R, 13, 3, 13, 3); L.paint(img, R, basalt, { dx = ox, flat = 0.4 })
  local P = L.mask(26, 6); L.ell(P, 13, 3, 11, 1.8); L.each(P, function(x, y) L.put(img, ox + x, y, L.hash(x, y, 90) > 0.7 and fire[4] or (y < 3 and fire[3] or fire[2])) end)
end)

-- The bones of something vast, set in the rock: a spine and ribs as wide as a room.
L.piece("e2-spine", 48, 22, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(48, 22)
  for i = 0, 10 do L.ell(M, 3 + i * 4.2, 6 + math.sin(i / 3) * 1.5, 1.8, 1.6) end
  for i = 1, 9, 2 do local x = 3 + i * 4.2; L.tube(M, x, 7, x - 4, 20, 1, 0.5); L.tube(M, x + 1, 7, x + 6, 19, 1, 0.5) end
  L.paint(img, M, bone, { dx = ox, flat = 0.3, noise = 0.3, alpha = 210 })
end)
L.piece("e2-horn", 22, 22, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(22, 22); for t = 0, 30 do local u = t / 30; L.disc(M, 4 + u * 14 + math.sin(u * 3) * 2, 20 - u * 18, 3.5 * (1 - u) + 0.6) end
  L.paint(img, M, bone, { dx = ox, flat = 0.4, alpha = 220 })
end)

L.piece("e2-altar", 30, 24, { k = 3.4, light = { 0, -40, 130, "255,120,40" }, flicker = true }, function(img, f, ox)
  local M = L.mask(30, 24); L.rect(M, 4, 12, 22, 12); L.rect(M, 2, 10, 26, 3); L.paint(img, M, basalt, { dx = ox, flat = 0.5 })
  for x = 7, 23, 4 do L.put(img, ox + x, 17, fire[1]); L.put(img, ox + x + 1, 18, fire[1]) end
  local S = L.mask(30, 24); L.poly(S, { 10, 10, 20, 9, 21, 7, 11, 8 }); L.paint(img, S, L.ramp(44, 0.3, 0.5, 0.86, 3), { dx = ox, flat = 0.6 })
  for x = 12, 19 do if L.hash(x, 1, 91) > 0.3 then L.put(img, ox + x, 6 - math.floor(L.hash(x, 2, 92) * 4), fire[2 + math.floor(L.hash(x, 3, 93) * 2)]) end end
  for _, cx in ipairs({ 4, 26 }) do local C = L.mask(30, 24); L.rect(C, cx - 1, 5, 2, 5); L.paint(img, C, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox }); L.kit.flame(img, ox, cx - 1, 3, { fire[2], fire[3], fire[4] }) end
end)

L.piece("e2-vent", 14, 8, { k = 3.4, smoke = true, wall = true }, function(img, f, ox)
  local M = L.mask(14, 8); L.ell(M, 7, 7, 6, 3); L.poly(M, { 3, 7, 6, 2, 8, 2, 11, 7 }); L.paint(img, M, basalt, { dx = ox })
  local S = L.mask(14, 8); L.rect(S, 5, 3, 4, 2); L.rect(S, 2, 6, 3, 1); L.rect(S, 9, 6, 3, 1); L.paint(img, S, sulfur, { dx = ox, outline = false })
end)

L.kit.silhouette("e2-fgSpikes", 40, 46, L.rgb(10, 4, 12), L.rgb(120, 60, 160), function(M)
  L.poly(M, { 0, 46, 6, 10, 12, 46 }); L.poly(M, { 10, 46, 18, 0, 26, 46 }); L.poly(M, { 24, 46, 30, 20, 36, 46 }); L.poly(M, { 32, 46, 38, 30, 40, 46 })
end)
L.kit.crack("e2-crack", L.rgb(30, 8, 8), fire[2])

-- ---- loop 2: the beast's skull, as big as a door, and heat seaming the rock ----
L.piece("e2-skull", 40, 30, { k = 4.2, wall = true, light = { 4, -60, 60, "255,120,40" } }, function(img, f, ox)
  local M = L.mask(40, 30); L.ell(M, 18, 13, 14, 11); L.poly(M, { 8, 18, 30, 18, 36, 26, 24, 29, 12, 29, 4, 24 })
  for t = 0, 24 do local u = t / 24; L.disc(M, 28 + u * 10, 8 - u * 7 + u * u * 6, 3 * (1 - u) + 0.6) end
  L.paint(img, M, bone, { dx = ox, flat = 0.3, noise = 0.3, alpha = 220 })
  for _, e in ipairs({ { 13, 13 }, { 23, 13 } }) do local E = L.mask(40, 30); L.ell(E, e[1], e[2], 3.4, 3); L.fill(img, E, L.rgb(30, 8, 6), 255, ox); L.put(img, ox + e[1], e[2], fire[2]) end
  for x = 12, 28, 3 do L.put(img, ox + x, 25, L.rgb(30, 8, 6)); L.put(img, ox + x, 26, L.rgb(30, 8, 6)) end
end)
L.piece("e2-seam", 24, 20, { k = 3.2, wall = true, light = { 0, -32, 70, "255,110,40" } }, function(img, f, ox)
  local x, y = 8, 0
  for i = 1, 20 do for d = -1, 1 do L.put(img, ox + x + d, y, d == 0 and fire[3] or fire[1], d == 0 and 255 or 150) end
    y = y + 1; x = x + math.floor((L.hash(i, 4, 94) - 0.45) * 3) end
end)

-- ---- loop 3: black glass grit and live embers along the floors ----
L.piece("e2-grit", 16, 4, { k = 3.2, wall = true }, function(img, f, ox)
  for i = 0, 4 do local M = L.mask(16, 4); local x = 1 + i * 3; L.poly(M, { x, 4, x + 1, 1 + (i % 2), x + 2, 4 }); L.paint(img, M, obsid, { dx = ox, flat = 0.55, rim = L.rgb(190, 130, 250) }) end
  L.put(img, ox + 5, 3, fire[2]); L.put(img, ox + 11, 3, fire[3])
end)
