-- The Meridian (The Architect, chapter 2): the library his mother's order kept off every map, an observatory of the
-- heavens. Constellations glowing in its stone, star charts on the walls, armillary spheres, sextants and lenses on the
-- tables, the meridian line itself inlaid in brass along the floor; the observatory's dome on the horizon.
local L = _G.L
local brass = L.ramp(42, 0.75, 0.25, 0.8, 5)
local night = L.ramp(230, 0.45, 0.1, 0.32, 4)
local paper = L.ramp(44, 0.3, 0.5, 0.86, 4)
local wood = L.ramp(18, 0.4, 0.08, 0.36, 5)
local star = L.rgb(200, 230, 255)

-- A constellation in the rock: stars joined by faint lines, each glowing.
L.piece("a2-constellation", 30, 22, { k = 3.4, wall = true, light = { 0, -36, 70, "160,200,255" } }, function(img, f, ox)
  local pts = {}
  for i = 0, 5 do pts[#pts + 1] = { 3 + math.floor(L.hash(i, 1, 190) * 24), 3 + math.floor(L.hash(i, 2, 191) * 16) } end
  for i = 1, #pts - 1 do local a, b = pts[i], pts[i + 1]; local n = math.max(math.abs(b[1] - a[1]), math.abs(b[2] - a[2])); for k = 0, n do local u = k / math.max(1, n); L.put(img, ox + math.floor(a[1] + (b[1] - a[1]) * u + 0.5), math.floor(a[2] + (b[2] - a[2]) * u + 0.5), star, 90) end end
  for i, p in ipairs(pts) do L.glow(img, ox + p[1], p[2], 2.5 + (i % 2), star, 200); L.put(img, ox + p[1], p[2], L.rgb(255, 255, 255)) end
end)

L.piece("a2-chart", 24, 20, { k = 3.2, wall = true }, function(img, f, ox)
  local M = L.mask(24, 20); L.rect(M, 1, 1, 22, 18); L.paint(img, M, night, { dx = ox, flat = 0.45, outline = false })
  for t = 0, 47 do local a = t / 48 * math.pi * 2; L.put(img, ox + 12 + math.floor(8 * math.cos(a) + 0.5), 10 + math.floor(8 * math.sin(a) + 0.5), brass[4], 200) end
  for i = 0, 10 do L.put(img, ox + 3 + math.floor(L.hash(i, 1, 192) * 18), 3 + math.floor(L.hash(i, 2, 193) * 14), star) end
  local R = L.mask(24, 20); L.rect(R, 0, 0, 24, 1); L.rect(R, 0, 19, 24, 1); L.paint(img, R, wood, { dx = ox, outline = false })
end)

L.piece("a2-armillary", 24, 32, { k = 3.4, light = { 0, -60, 60, "255,220,150" } }, function(img, f, ox)
  local B = L.mask(24, 32); L.rect(B, 11, 22, 2, 8); L.rect(B, 7, 29, 10, 3); L.paint(img, B, wood, { dx = ox })
  local R = L.mask(24, 32)
  for t = 0, 59 do local a = t / 60 * math.pi * 2; L.set(R, 12 + 10 * math.cos(a), 12 + 10 * math.sin(a)); L.set(R, 12 + 10 * math.cos(a), 12 + 3 * math.sin(a)); L.set(R, 12 + 3 * math.cos(a), 12 + 10 * math.sin(a)); L.set(R, 12 + 9 * math.cos(a) * 0.7 + 3 * math.sin(a), 12 + 9 * math.sin(a) * 0.7) end
  L.line(R, 4, 20, 20, 4); L.paint(img, R, brass, { dx = ox, flat = 0.6, outline = false })
  L.glow(img, ox + 12, 12, 3, L.rgb(255, 230, 160), 200); L.put(img, ox + 12, 12, L.rgb(255, 250, 220))
end)

L.piece("a2-sextant", 18, 14, { k = 3.2, wall = true }, function(img, f, ox)
  local T = L.mask(18, 14); L.rect(T, 0, 11, 18, 3); L.paint(img, T, wood, { dx = ox })
  local S = L.mask(18, 14); for t = 0, 20 do local a = math.pi * (1 + t / 20 * 0.33); L.set(S, 9 + 8 * math.cos(a) + 4, 10 + 8 * math.sin(a)) end; L.line(S, 5, 10, 13, 2); L.line(S, 5, 10, 13, 10); L.paint(img, S, brass, { dx = ox, flat = 0.6, outline = false })
  local Ln = L.mask(18, 14); L.disc(Ln, 15, 8, 1.6); L.fill(img, Ln, L.rgb(170, 220, 255), 255, ox)
end)

L.piece("a2-meridian", 26, 3, { k = 3.4, wall = true }, function(img, f, ox)
  local M = L.mask(26, 3); L.rect(M, 0, 1, 26, 2); L.paint(img, M, brass, { dx = ox, flat = 0.65, outline = false })
  for x = 2, 24, 4 do L.put(img, ox + x, 1, brass[1]) end
end)

L.kit.far("a2-farDome", 120, 64, L.rgb(16, 18, 40), L.rgb(80, 90, 150), 0.25, function(M)
  L.rect(M, 0, 50, 120, 14); L.rect(M, 36, 30, 48, 20); L.ell(M, 60, 30, 24, 20)
  for y = 10, 30 do L.unset(M, 59, y); L.unset(M, 60, y); L.unset(M, 61, y) end
  L.tube(M, 60, 14, 74, 2, 1.5)
end)
L.kit.bricks("a2-blocks", L.ramp(330, 0.12, 0.08, 0.42, 5), { alpha = 160 })

-- ---- loop 2: the heavens hung from the ceilings: planets on wires ----
L.piece("a2-mobile", 30, 34, { k = 3, under = true, sway = true }, function(img, f, ox)
  local W = L.mask(30, 34); L.rect(W, 15, 0, 1, 8); L.rect(W, 3, 8, 25, 1); L.rect(W, 4, 9, 1, 12); L.rect(W, 15, 9, 1, 20); L.rect(W, 26, 9, 1, 8)
  L.paint(img, W, brass, { dx = ox, outline = false })
  for _, p in ipairs({ { 4, 23, 2.4, L.ramp(20, 0.6, 0.3, 0.7, 3) }, { 15, 31, 3, L.ramp(205, 0.5, 0.3, 0.7, 3) }, { 26, 19, 2, L.ramp(45, 0.7, 0.4, 0.8, 3) } }) do
    local P = L.mask(30, 34); L.disc(P, p[1] + 0.5, p[2], p[3]); L.paint(img, P, p[4], { dx = ox, flat = 0.55 }) end
  for t = 0, 15 do local a = t / 16 * math.pi * 2; L.put(img, ox + 15 + math.floor(5 * math.cos(a) + 0.5), 31 + math.floor(1.6 * math.sin(a) + 0.5), brass[4], 200) end
end)
