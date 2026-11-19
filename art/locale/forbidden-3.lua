-- The Price of Mercy (The Forbidden, chapter 3): down through the undercroft, along the list of the spared. Burial
-- niches cut into the rock and full of skulls, sarcophagi, braziers, slabs of names, cobwebs and the roots of the
-- city coming through the vaults.
local L = _G.L
local stone = L.ramp(32, 0.07, 0.1, 0.55, 5)
local bone = L.ramp(42, 0.22, 0.32, 0.86, 5, 14)
local iron = L.ramp(220, 0.08, 0.08, 0.42, 4)
local web = L.rgb(210, 210, 220)
local root = L.ramp(28, 0.3, 0.1, 0.36, 4)
local flame = { L.rgb(255, 110, 40), L.rgb(255, 190, 80), L.rgb(255, 245, 200) }

-- A burial niche in the rock, its dark mouth full of skulls: the catacombs.
L.piece("f3-niche", 20, 16, { k = 3.2, wall = true }, function(img, f, ox)
  local A = L.mask(20, 16); L.rect(A, 1, 5, 18, 11); L.ell(A, 10, 5, 9, 4)
  L.paint(img, A, stone, { dx = ox, flat = 0.6 })
  local H = L.mask(20, 16); L.rect(H, 3, 6, 14, 9); L.ell(H, 10, 6, 7, 3)
  L.fill(img, H, L.rgb(16, 13, 14), 255, ox)
  for i = 0, 2 do
    local x = 4 + i * 4.5
    local S = L.mask(20, 16); L.ell(S, x + 1.5, 12, 2, 1.8); L.paint(img, S, bone, { dx = ox, flat = 0.4 })
    L.put(img, ox + math.floor(x + 1), 12, L.rgb(30, 20, 20)); L.put(img, ox + math.floor(x + 2), 12, L.rgb(30, 20, 20))
  end
end)

L.piece("f3-sarcophagus", 30, 14, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 14); L.rect(M, 2, 5, 26, 9); L.paint(img, M, stone, { dx = ox, flat = 0.45 })
  local Lid = L.mask(30, 14); L.rect(Lid, 0, 2, 30, 4); L.poly(Lid, { 6, 2, 9, 0, 21, 0, 24, 2 }); L.paint(img, Lid, stone, { dx = ox, flat = 0.6 })
  local C = L.mask(30, 14); L.ell(C, 15, 1.5, 3, 1); L.rect(C, 9, 1, 12, 1); L.paint(img, C, stone, { dx = ox, flat = 0.75, outline = false })
  for x = 5, 25, 4 do L.put(img, ox + x, 9, stone[2]); L.put(img, ox + x, 10, stone[2]) end
end)

L.piece("f3-brazier", 14, 22, { k = 3.2, light = { 0, -30, 130, "255,150,60" }, flicker = true }, function(img, f, ox)
  local M = L.mask(14, 22); L.rect(M, 6, 10, 2, 10); L.rect(M, 3, 20, 8, 2); L.ell(M, 7, 9, 6, 2.5)
  L.paint(img, M, iron, { dx = ox })
  for i = 0, 4 do local x = 3 + i * 2; L.kit.flame(img, ox, x, 4 + (i % 2) * 2, flame); L.put(img, ox + x, 6 + (i % 2), flame[1]) end
  L.glow(img, ox + 7, 5, 6, flame[2], 90)
end)

L.piece("f3-names", 20, 22, { k = 3, wall = true }, function(img, f, ox)
  local M = L.mask(20, 22); L.rect(M, 1, 2, 18, 20); L.ell(M, 10, 3, 9, 3); L.paint(img, M, stone, { dx = ox, flat = 0.55 })
  for y = 5, 19, 2 do local w = 6 + math.floor(L.hash(y, 1, 3) * 8); for x = 4, 3 + w do if L.hash(x, y, 4) > 0.25 then L.put(img, ox + x, y, stone[1], 220) end end end
end)

L.piece("f3-web", 14, 14, { k = 3, under = true }, function(img, f, ox)
  for i = 0, 4 do local a = i / 4 * math.pi / 2; for r = 0, 13 do L.put(img, ox + math.floor(r * math.cos(a)), math.floor(r * math.sin(a)), web, 140) end end
  for _, r in ipairs({ 4, 8, 12 }) do for t = 0, 12 do local a = t / 12 * math.pi / 2; L.put(img, ox + math.floor(r * math.cos(a)), math.floor(r * math.sin(a)), web, 110) end end
end)

L.kit.drape("f3-roots", root, 26, { taper = true, seed = 3 })
L.kit.bricks("f3-masonry", stone, { alpha = 160, w = 6 })
L.kit.crack("f3-crack", stone[1], stone[5])
L.kit.pebbles("f3-rubble", stone)

-- ---- loop 2: the list of the spared, kept down here ----
local wood = L.ramp(22, 0.38, 0.08, 0.38, 5)
local paper = L.ramp(44, 0.3, 0.5, 0.86, 4)
local books = { L.ramp(0, 0.45, 0.18, 0.45, 3), L.ramp(150, 0.35, 0.15, 0.4, 3), L.ramp(225, 0.4, 0.18, 0.45, 3), L.ramp(40, 0.5, 0.25, 0.55, 3) }
local glass = { L.ramp(170, 0.5, 0.3, 0.75, 3), L.ramp(320, 0.45, 0.3, 0.7, 3), L.ramp(90, 0.5, 0.3, 0.7, 3) }
local gold = L.ramp(44, 0.85, 0.32, 0.82, 4)

L.piece("f3-shelf", 22, 34, { k = 3.2 }, function(img, f, ox)
  local F = L.mask(22, 34); L.rect(F, 0, 0, 22, 2); L.rect(F, 0, 0, 2, 34); L.rect(F, 20, 0, 2, 34)
  for y = 10, 32, 11 do L.rect(F, 0, y, 22, 2) end
  L.paint(img, F, wood, { dx = ox })
  local B = L.mask(22, 34); L.rect(B, 2, 2, 18, 30); L.fill(img, B, L.rgb(20, 14, 12), 255, ox)
  for s = 0, 2 do local x = 2
    while x < 19 do local w = 1 + math.floor(L.hash(x, s, 6) * 2); local h = 6 + math.floor(L.hash(x, s, 7) * 3)
      local M = L.mask(22, 34); L.rect(M, x, s * 11 + 10 - h, w, h); L.paint(img, M, books[(x + s) % 4 + 1], { dx = ox, flat = 0.5, outline = false }); x = x + w + (L.hash(x, s, 8) > 0.8 and 1 or 0) end
  end
end)

L.piece("f3-scrolls", 18, 9, { k = 3.2 }, function(img, f, ox)
  for i, c in ipairs({ { 4, 7 }, { 10, 7 }, { 7, 4 }, { 14, 7 } }) do local M = L.mask(18, 9); L.ell(M, c[1], c[2], 3.2, 1.7); L.paint(img, M, paper, { dx = ox, flat = 0.5, seed = i }); L.put(img, ox + c[1] + 3, c[2], paper[1]) end
end)

L.piece("f3-jars", 22, 16, { k = 3, wall = true }, function(img, f, ox)
  local S = L.mask(22, 16); L.rect(S, 0, 14, 22, 2); L.paint(img, S, wood, { dx = ox })
  for i = 0, 3 do local x = 2 + i * 5; local h = 6 + (i % 2) * 3
    local M = L.mask(22, 16); L.rect(M, x, 14 - h, 4, h); L.rect(M, x + 1, 14 - h - 1, 2, 1)
    L.paint(img, M, glass[i % 3 + 1], { dx = ox, flat = 0.55, alpha = 220 }); L.put(img, ox + x + 1, 14 - h + 1, L.rgb(240, 250, 255))
  end
end)

L.piece("f3-vigil", 24, 10, { k = 3, light = { 0, -18, 110, "255,180,90" }, flicker = true }, function(img, f, ox)
  for i = 0, 5 do local x = 2 + i * 4; local h = 3 + math.floor(L.hash(i, 1, 30) * 4)
    local M = L.mask(24, 10); L.rect(M, x, 10 - h, 2, h); L.paint(img, M, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox, flat = 0.6 })
    L.kit.flame(img, ox, x, 10 - h - 2, flame)
  end
end)

L.piece("f3-censer", 10, 30, { k = 3, under = true, sway = true, smoke = true }, function(img, f, ox)
  local C = L.mask(10, 30); L.rect(C, 5, 0, 1, 18)
  L.ell(C, 5, 23, 4, 4); L.poly(C, { 2, 20, 5, 15, 8, 20 }); L.rect(C, 4, 27, 3, 2)
  L.paint(img, C, gold, { dx = ox, flat = 0.5 })
  for x = 2, 8, 2 do L.put(img, ox + x, 23, L.rgb(255, 160, 70)) end
end)

L.piece("f3-reliquary", 16, 16, { k = 3.2, light = { 0, -20, 90, "200,220,255" } }, function(img, f, ox)
  local M = L.mask(16, 16); L.rect(M, 2, 6, 12, 10); L.poly(M, { 1, 7, 8, 1, 15, 7 }); L.paint(img, M, gold, { dx = ox, flat = 0.5 })
  local W = L.mask(16, 16); L.rect(W, 5, 8, 6, 5); L.fill(img, W, L.rgb(200, 225, 255), 255, ox); L.glow(img, ox + 8, 10, 5, L.rgb(230, 240, 255), 120)
end)

-- ---- loop 3: the crypt's colonnade far behind, broken arches near ----
L.kit.far("f3-farCrypt", 120, 60, L.rgb(26, 22, 30), L.rgb(48, 42, 52), 0.3, function(M)
  L.rect(M, 0, 40, 120, 20)
  for i = 0, 3 do local x = 6 + i * 30; L.rect(M, x, 12, 8, 30); L.rect(M, x - 2, 10, 12, 3)
    local A = L.mask(120, 60); L.ell(A, x + 19, 14, 12, 10); L.each(A, function(ax, ay) if ay >= 10 and ay < 24 then L.set(M, ax, ay) end end)
    local H = L.mask(120, 60); L.ell(H, x + 19, 18, 9, 9); L.each(H, function(hx, hy) L.unset(M, hx, hy) end) end
end)
L.kit.silhouette("f3-fgArch", 44, 60, L.rgb(10, 9, 12), stone[2], function(M)
  L.rect(M, 0, 10, 10, 50); L.rect(M, 30, 24, 10, 36)
  local A = L.mask(44, 60); L.ell(A, 20, 16, 20, 14); L.each(A, function(x, y) if y < 20 and x < 32 then L.set(M, x, y) end end)
  local H = L.mask(44, 60); L.ell(H, 20, 20, 12, 12); L.each(H, function(x, y) L.unset(M, x, y) end)
end)
