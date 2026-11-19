-- The Witness (The Hollow, chapter 2): finding where the thing that sent her back watches from. Eyes open in the rock
-- itself, effigies of twigs, charms of bone hung up, candles set in skulls, the eye painted on the walls, a dead tree
-- full of eyes; on the horizon the Witness, vast, watching; roots twisted in front.
local L = _G.L
local twig = L.ramp(30, 0.3, 0.12, 0.42, 4)
local bone = L.ramp(42, 0.22, 0.4, 0.86, 4, 14)
local eyeW = L.rgb(235, 230, 210)
local iris = L.rgb(230, 60, 90)
local paint = L.rgb(200, 40, 70)
local dead = L.ramp(250, 0.1, 0.08, 0.34, 4)

local function eye(img, ox, cx, cy, r, a)
  local W = L.mask(40, 40); L.ell(W, cx, cy, r, r * 0.55); L.fill(img, W, eyeW, a, ox)
  local I = L.mask(40, 40); L.disc(I, cx + 0.3, cy, r * 0.42); L.fill(img, I, iris, a, ox)
  L.put(img, ox + math.floor(cx), math.floor(cy), L.rgb(10, 0, 5), a); L.put(img, ox + math.floor(cx) - 1, math.floor(cy) - 1, L.rgb(255, 255, 255), a)
end

L.piece("h2-eyes", 20, 12, { k = 3.2, wall = true, light = { 0, -18, 60, "230,60,90" } }, function(img, f, ox)
  local S = L.mask(20, 12); L.ell(S, 5, 6, 5, 3.4); L.ell(S, 15, 6, 4, 3); L.fill(img, S, L.rgb(20, 8, 16), 230, ox)
  eye(img, ox, 5, 6, 4, 255); eye(img, ox, 15, 6, 3, 255)
end)

L.piece("h2-effigy", 18, 34, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(18, 34); L.tube(M, 9, 34, 9, 6, 0.9); L.tube(M, 1, 12, 17, 10, 0.8); L.tube(M, 9, 22, 4, 30, 0.7); L.tube(M, 9, 22, 14, 30, 0.7)
  for i = 0, 5 do L.tube(M, 9, 7, 9 + (i - 2.5) * 2, 1 + (i % 2) * 2, 0.5) end
  L.paint(img, M, twig, { dx = ox, flat = 0.45 })
  local C = L.mask(18, 34); L.rect(C, 6, 12, 6, 2); L.paint(img, C, L.ramp(0, 0.5, 0.25, 0.5, 3), { dx = ox, outline = false })
end)

L.piece("h2-charms", 18, 28, { k = 3, under = true, sway = true }, function(img, f, ox)
  local S = L.mask(18, 28); for _, x in ipairs({ 3, 9, 15 }) do L.rect(S, x, 0, 1, 10 + (x % 4) * 2) end; L.paint(img, S, twig, { dx = ox, outline = false })
  for _, x in ipairs({ 3, 9, 15 }) do local y = 10 + (x % 4) * 2; local B = L.mask(18, 28); L.ell(B, x, y + 3, 2, 3); L.tube(B, x - 2, y + 7, x + 2, y + 9, 0.6); L.paint(img, B, bone, { dx = ox, flat = 0.5 }) end
end)

L.piece("h2-skullCandle", 12, 14, { k = 3.2, light = { 0, -22, 80, "255,170,90" }, flicker = true }, function(img, f, ox)
  local S = L.mask(12, 14); L.ell(S, 6, 9, 5, 4.5); L.rect(S, 3, 11, 6, 3); L.paint(img, S, bone, { dx = ox, flat = 0.45 })
  L.put(img, ox + 4, 9, L.rgb(30, 10, 10)); L.put(img, ox + 8, 9, L.rgb(30, 10, 10))
  local C = L.mask(12, 14); L.rect(C, 5, 2, 2, 4); L.paint(img, C, L.ramp(40, 0.35, 0.55, 0.92, 3), { dx = ox })
  L.kit.flame(img, ox, 5, 0, { L.rgb(255, 120, 40), L.rgb(255, 200, 90), L.rgb(255, 245, 200) })
end)

L.piece("h2-sigil", 16, 12, { k = 3.2, wall = true }, function(img, f, ox)
  for t = 0, 30 do local a = t / 30 * math.pi * 2; L.put(img, ox + 8 + math.floor(7 * math.cos(a) + 0.5), 6 + math.floor(4 * math.sin(a) + 0.5), paint, 200) end
  local I = L.mask(16, 12); L.disc(I, 8, 6, 2.2); L.fill(img, I, paint, 210, ox)
  for i = 0, 4 do L.put(img, ox + 4 + i * 2, 11 + (i % 2), paint, 150) end
end)

L.piece("h2-eyeTree", 30, 50, { k = 3.4 }, function(img, f, ox)
  local M = L.mask(30, 50); L.tube(M, 15, 50, 14, 14, 3.2, 1.6); L.tube(M, 14, 24, 4, 8, 1.3, 0.4); L.tube(M, 14, 18, 26, 4, 1.3, 0.4); L.tube(M, 15, 50, 7, 50, 1.6); L.tube(M, 15, 50, 23, 50, 1.6)
  L.paint(img, M, dead, { dx = ox, flat = 0.4 })
  for _, e in ipairs({ { 14, 30, 2.4 }, { 15, 40, 1.8 }, { 8, 13, 1.4 }, { 22, 9, 1.4 } }) do eye(img, ox, e[1], e[2], e[3], 255) end
end)

L.kit.far("h2-farWitness", 100, 80, L.rgb(18, 10, 24), L.rgb(60, 30, 70), 0.18, function(M)
  L.ell(M, 50, 60, 34, 46); L.poly(M, { 16, 80, 20, 50, 80, 50, 84, 80 }); L.poly(M, { 30, 26, 22, 4, 38, 20 }); L.poly(M, { 70, 26, 78, 4, 62, 20 })
end, { alpha = 0.8 })
L.kit.silhouette("h2-fgRoots", 50, 50, L.rgb(8, 6, 14), L.rgb(70, 40, 90), function(M)
  L.tube(M, 0, 50, 20, 20, 3, 1); L.tube(M, 20, 20, 34, 30, 1.5, 0.8); L.tube(M, 50, 50, 30, 14, 3.5, 1); L.tube(M, 30, 14, 18, 6, 1.4, 0.5)
end)

-- ---- loop 2: one great eye in the rock, half-open, and more of the small ones ----
L.piece("h2-greatEye", 36, 22, { k = 3.6, wall = true, light = { 0, -40, 110, "230,60,90" } }, function(img, f, ox)
  local S = L.mask(36, 22); L.ell(S, 18, 11, 17, 9); L.fill(img, S, L.rgb(16, 6, 12), 240, ox)
  local W = L.mask(36, 22); L.ell(W, 18, 12, 14, 5); L.fill(img, W, eyeW, 255, ox)
  local I = L.mask(36, 22); L.disc(I, 19, 12, 4.4); L.fill(img, I, iris, 255, ox)
  local P = L.mask(36, 22); L.ell(P, 19, 12, 1.2, 3.4); L.fill(img, P, L.rgb(10, 0, 5), 255, ox); L.put(img, ox + 17, 10, L.rgb(255, 255, 255))
  local Lid = L.mask(36, 22); L.ell(Lid, 18, 7, 15, 3); L.fill(img, Lid, L.rgb(40, 16, 30), 255, ox)
  for x = 6, 30, 4 do L.put(img, ox + x, 7 + math.floor(math.abs(x - 18) / 8), L.rgb(10, 4, 8)) end
end)
