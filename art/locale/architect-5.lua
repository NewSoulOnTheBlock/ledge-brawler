-- The Five Objects (The Architect, chapter 5): into the crater where a fragment of the Firstborn's bindings fell.
-- Shards of it glowing where they struck, veins of star-metal through the rock, stones floating in its pull, the
-- Crown's dig an hour ahead of him (picks, a mine cart, survey stakes and their lines), scorched glassy pits; the rim
-- of the crater glowing far off.
local L = _G.L
local shardC = L.ramp(185, 0.8, 0.4, 0.95, 4)
local gold = L.ramp(46, 0.85, 0.35, 0.9, 4)
local rock = L.ramp(260, 0.12, 0.1, 0.45, 5)
local glassB = L.ramp(210, 0.3, 0.1, 0.4, 4)
local wood = L.ramp(26, 0.35, 0.1, 0.4, 5)
local iron = L.ramp(220, 0.1, 0.08, 0.45, 4)
local cloth = L.ramp(0, 0.6, 0.3, 0.55, 3)

L.piece("a5-shard", 16, 22, { k = 3.4, light = { 0, -35, 130, "150,240,255" }, flicker = true }, function(img, f, ox)
  local M = L.mask(16, 22); L.poly(M, { 5, 22, 7, 2, 10, 0, 11, 22 }); L.poly(M, { 1, 22, 3, 12, 6, 22 }); L.poly(M, { 11, 22, 14, 14, 15, 22 })
  L.paint(img, M, shardC, { dx = ox, flat = 0.6, rim = L.rgb(255, 255, 255) })
  L.glow(img, ox + 8, 12, 8, L.rgb(200, 250, 255), 120)
  for i = 0, 5 do L.put(img, ox + 3 + math.floor(L.hash(i, 1, 220) * 10), 2 + math.floor(L.hash(i, 2, 221) * 10), gold[4], 230) end
end)

L.piece("a5-vein", 34, 16, { k = 3.4, wall = true, light = { 0, -27, 80, "255,220,120" } }, function(img, f, ox)
  local y = 8
  for x = 0, 33 do y = math.max(2, math.min(13, y + math.floor((L.hash(x, 1, 222) - 0.5) * 3))); L.put(img, ox + x, y, gold[4]); L.put(img, ox + x, y + 1, gold[2], 200)
    if x % 9 == 4 then for j = 1, 4 do L.put(img, ox + x + j, y - j, gold[3], 210) end end end
end)

-- Stones lifted off the crater floor by the fragment's pull, hanging in the air above where they lay.
L.piece("a5-floating", 30, 40, { k = 3.4, light = { 0, -60, 50, "150,240,255" } }, function(img, f, ox)
  for i, s in ipairs({ { 7, 8, 4, 3 }, { 19, 4, 5, 3.4 }, { 13, 20, 3, 2.4 }, { 24, 18, 2.4, 2 } }) do
    local M = L.mask(30, 40); L.ell(M, s[1], s[2], s[3], s[4]); L.poly(M, { s[1] - s[3], s[2], s[1], s[2] + s[4] * 2.4, s[1] + s[3], s[2] }); L.paint(img, M, rock, { dx = ox, flat = 0.5, seed = i })
    for y = math.floor(s[2] + s[4] * 2.4) + 2, 38, 3 do L.put(img, ox + s[1], y, shardC[3], 90) end
  end
  local P = L.mask(30, 40); L.ell(P, 15, 38, 12, 2); L.paint(img, P, glassB, { dx = ox, outline = false })
end)

L.piece("a5-picks", 22, 14, { k = 3.2, wall = true }, function(img, f, ox)
  for i, p in ipairs({ { 4, 1 }, { 13, 0 } }) do local H = L.mask(22, 14); L.tube(H, p[1] + 2, 14, p[1] + 6, p[2] + 2, 0.7); L.paint(img, H, wood, { dx = ox, outline = false })
    local Hd = L.mask(22, 14); L.tube(Hd, p[1] + 1, p[2] + 4, p[1] + 9, p[2] + 1, 0.8, 0.4); L.paint(img, Hd, iron, { dx = ox, flat = 0.6 }) end
end)

L.piece("a5-cart", 26, 18, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(26, 18); L.poly(M, { 2, 4, 24, 4, 21, 13, 5, 13 }); L.paint(img, M, iron, { dx = ox, flat = 0.5 })
  for _, wx in ipairs({ 8, 18 }) do local W = L.mask(26, 18); L.disc(W, wx, 15, 2.6); L.paint(img, W, iron, { dx = ox, flat = 0.4 }) end
  for i = 0, 4 do local O = L.mask(26, 18); L.disc(O, 6 + i * 3.4, 3 - (i % 2), 1.6); L.paint(img, O, i == 2 and shardC or rock, { dx = ox, flat = 0.55 }) end
end)

L.piece("a5-stakes", 40, 18, { k = 3.4 }, function(img, f, ox)
  for _, x in ipairs({ 3, 20, 37 }) do local S = L.mask(40, 18); L.rect(S, x, 4, 1, 14); L.paint(img, S, wood, { dx = ox, outline = false }); local Fl = L.mask(40, 18); L.poly(Fl, { x + 1, 4, x + 4, 5, x + 1, 7 }); L.paint(img, Fl, cloth, { dx = ox, outline = false }) end
  for x = 3, 37 do L.put(img, ox + x, 9 + math.floor(math.sin((x - 3) / 17 * math.pi) * 2), L.rgb(220, 200, 150), 200) end
end)

L.piece("a5-pit", 26, 6, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(26, 6); L.ell(M, 13, 4, 12, 3); L.paint(img, M, glassB, { dx = ox, flat = 0.4, outline = false })
  local Rm = L.mask(26, 6); L.ell(Rm, 13, 3, 12, 2.4); L.each(Rm, function(x, y) if not L.on(Rm, x, y - 1) then L.put(img, ox + x, y, L.rgb(120, 200, 230), 200) end end)
end)

L.kit.far("a5-farRim", 120, 50, L.rgb(18, 20, 36), L.rgb(130, 220, 255), 0.25, function(M)
  L.poly(M, { 0, 50, 0, 22, 18, 12, 40, 18, 60, 26, 80, 18, 102, 12, 120, 22, 120, 50 })
end)
L.kit.crack("a5-crack", L.rgb(20, 16, 30), shardC[2])

-- ---- loop 2: the binding's light hanging in the air of the crater ----
L.piece("a5-motes", 34, 40, { k = 3, light = { 0, -60, 90, "150,240,255" }, flicker = true }, function(img, f, ox)
  for i = 0, 9 do local x, y = 2 + math.floor(L.hash(i, 1, 223) * 30), 2 + math.floor(L.hash(i, 2, 224) * 34)
    L.glow(img, ox + x, y, 2 + (i % 2), i % 3 == 0 and gold[4] or shardC[4], 200); L.put(img, ox + x, y, L.rgb(255, 255, 255)) end
end)
