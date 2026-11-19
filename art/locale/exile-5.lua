-- The Empty Monastery (The Exile, chapter 5): the bells have stopped, and the Bellkeeper left a message. A bell fallen
-- and cracked, benches overturned, robes still on their hooks with no one in them, candles burnt out, prayer beads
-- scattered, bell ropes snapped, the message scrawled on the walls; broken pillars in front.
local L = _G.L
local bronze = L.ramp(36, 0.5, 0.15, 0.6, 5)
local verd = L.ramp(160, 0.3, 0.25, 0.55, 3)
local wood = L.ramp(20, 0.32, 0.08, 0.36, 5)
local robe = L.ramp(25, 0.45, 0.18, 0.5, 4)
local rope = L.ramp(38, 0.4, 0.3, 0.62, 3)
local stone = L.ramp(35, 0.06, 0.12, 0.56, 5)
local chalk = L.rgb(220, 210, 190)

L.piece("x5-fallenBell", 30, 22, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 22); L.poly(M, { 2, 6, 14, 2, 24, 4, 28, 20, 4, 21 }); L.ell(M, 8, 12, 6, 9); L.paint(img, M, bronze, { dx = ox, flat = 0.45 })
  L.each(M, function(x, y) if L.hash(x, y, 130) > 0.82 then L.put(img, ox + x, y, verd[2], 200) end end)
  local H = L.mask(30, 22); L.ell(H, 22, 13, 4, 7); L.fill(img, H, L.rgb(20, 14, 10), 255, ox)
  for y = 3, 15 do L.put(img, ox + 15 + y // 4, y, L.rgb(15, 10, 8)) end
end)

L.piece("x5-bench", 28, 12, { k = 3.2 }, function(img, f, ox)
  local M = L.mask(28, 12); L.poly(M, { 2, 2, 24, 6, 23, 9, 1, 5 }); L.tube(M, 5, 5, 4, 11, 0.8); L.tube(M, 20, 8, 22, 11, 0.8); L.paint(img, M, wood, { dx = ox })
end)

L.piece("x5-robe", 14, 26, { k = 3.2, wall = true }, function(img, f, ox)
  local P = L.mask(14, 26); L.rect(P, 6, 0, 2, 3); L.paint(img, P, wood, { dx = ox })
  local M = L.mask(14, 26); L.poly(M, { 5, 3, 9, 3, 12, 24, 7, 25, 2, 24 }); L.ell(M, 7, 4, 3, 2); L.paint(img, M, robe, { dx = ox, flat = 0.45 })
  local H = L.mask(14, 26); L.ell(H, 7, 5, 1.6, 1.4); L.fill(img, H, L.rgb(20, 12, 8), 255, ox)
end)

L.piece("x5-deadCandles", 16, 8, { k = 3, wall = true }, function(img, f, ox)
  for i, h in ipairs({ 6, 3, 5, 2 }) do local x = 1 + (i - 1) * 4; local M = L.mask(16, 8); L.rect(M, x, 8 - h, 2, h); L.paint(img, M, L.ramp(40, 0.2, 0.45, 0.8, 3), { dx = ox, outline = false }); L.put(img, ox + x, 8 - h - 1, L.rgb(40, 34, 30)) end
end)

L.piece("x5-beads", 16, 4, { k = 3, wall = true }, function(img, f, ox)
  for i = 0, 9 do local x = 1 + i * 1.5; local y = 2 + math.floor(math.sin(i * 0.9) * 1.2); L.put(img, ox + math.floor(x), y, L.rgb(140, 40, 40)) end
  L.put(img, ox + 14, 2, bronze[4])
end)

L.kit.drape("x5-ropes", rope, 30, { seed = 21 })

-- The Bellkeeper's message: marks scrawled in chalk across the wall, larger and wilder toward the end.
L.piece("x5-message", 34, 16, { k = 3.2, wall = true }, function(img, f, ox)
  local x = 1
  for i = 0, 7 do local w = 2 + math.floor(L.hash(i, 1, 131) * 3); local h = 4 + i // 2
    for s = 0, 3 do local ax, ay = x + L.hash(i, s, 132) * w, 8 - h / 2 + L.hash(i, s, 133) * h; local bx, by = x + L.hash(i, s, 134) * w, 8 - h / 2 + L.hash(i, s, 135) * h
      local M = L.mask(34, 16); L.line(M, ax, ay, bx, by); L.fill(img, M, chalk, 210, ox) end
    x = x + w + 2 end
end)

L.kit.silhouette("x5-fgPillars", 40, 70, L.rgb(10, 9, 12), stone[2], function(M) L.rect(M, 3, 16, 10, 54); L.poly(M, { 3, 18, 6, 10, 9, 14, 13, 8, 13, 18 }); L.rect(M, 26, 40, 10, 30); L.poly(M, { 24, 42, 28, 34, 33, 38, 38, 32, 38, 42 }) end)
L.kit.bricks("x5-masonry", stone, { alpha = 160 })

-- ---- loop 2: what was left under dust sheets, and the webs over everything ----
L.piece("x5-sheeted", 22, 30, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(22, 30); L.poly(M, { 4, 30, 6, 10, 9, 4, 13, 3, 16, 8, 18, 30 }); L.ell(M, 11, 6, 4, 4); L.paint(img, M, L.ramp(40, 0.08, 0.45, 0.82, 4), { dx = ox, flat = 0.45, grad = function(x, y) return ((x + y) % 5 == 0) and -0.15 or 0 end })
  for y = 12, 28, 4 do L.put(img, ox + 8 + y % 3, y, L.rgb(150, 145, 135)) end
end)
L.piece("x5-web", 16, 14, { k = 3, under = true }, function(img, f, ox)
  local c = L.rgb(210, 210, 215)
  for i = 0, 4 do local a = i / 4 * math.pi; for r = 0, 7 do L.put(img, ox + 8 + math.floor(r * math.cos(a) + 0.5), math.floor(r * math.sin(a) + 0.5), c, 140) end end
  for _, r in ipairs({ 3, 5, 7 }) do for t = 0, 12 do local a = t / 12 * math.pi; L.put(img, ox + 8 + math.floor(r * math.cos(a) + 0.5), math.floor(r * math.sin(a) + 0.5), c, 110) end end
  for y = 7, 13 do L.put(img, ox + 8, y, c, 120) end; L.put(img, ox + 8, 13, L.rgb(20, 20, 20))
end)
