-- The traps, wherever they are in the game: rising spikes of iron and bone, and the executioner's pendulum, a crescent
-- blade on a chain from a bracket in the vault. First drawn for The Last Sentence (The Forbidden, chapter 1).
local L = _G.L
local iron = L.ramp(225, 0.1, 0.06, 0.42, 4)
local steel = L.ramp(218, 0.12, 0.3, 0.86, 5, 12)
local bone = L.ramp(42, 0.22, 0.32, 0.86, 5, 14)
local rust = L.ramp(14, 0.45, 0.14, 0.32, 3)

-- Spikes, a strip that repeats sideways: two stakes to a tile, the second a little shorter. Each is lit on its left
-- face (steel) and in shadow on its right (iron), so the point reads against the dark; its tip worn pale, rust where
-- it meets the plate. Drawn at k = 4, as tall as the trap's reach (traps.ts, SPIKE_H).
L.piece("trap-spikes", 12, 9, { k = 4 }, function(img, f, ox)
  for i = 0, 1 do
    local cx, top = i * 6 + 3, i == 0 and 0 or 2
    for y = top, 8 do
      local hw = (y - top + 1) / (9 - top) * 3
      for x = math.floor(cx - hw + 0.5), math.ceil(cx + hw - 0.5) - 1 do
        local lit, edge = x < cx, (x == math.floor(cx - hw + 0.5) or x == math.ceil(cx + hw - 0.5) - 1)
        local c = lit and (edge and steel[4] or steel[3]) or (edge and iron[1] or iron[2])
        L.put(img, ox + x, y, c)
      end
    end
    L.put(img, ox + cx - 1, top, bone[5]); L.put(img, ox + cx, top, bone[3]); L.put(img, ox + cx - 1, top + 1, bone[4])
    L.put(img, ox + cx - 2, 8, rust[3]); L.put(img, ox + cx - 1, 8, rust[2]); L.put(img, ox + cx, 8, rust[1]); L.put(img, ox + cx + 1, 8, rust[1])
  end
end)

-- The pendulum's blade: a crescent, its edge down and bright, its back darker iron, a socket on top where the chain
-- holds it. Its middle is the trap's (traps.ts, BLADE_R: 30 across either way of it at k = 3.2).
L.piece("trap-blade", 21, 16, { k = 3.2 }, function(img, f, ox)
  local B = L.mask(21, 16)
  L.ell(B, 10.5, 1, 10.4, 13.5)
  local C = L.mask(21, 16)
  L.ell(C, 10.5, -6.5, 10.6, 13.2)
  L.each(C, function(x, y) L.unset(B, x, y) end)
  for y = 0, 3 do for x = 0, 20 do L.unset(B, x, y) end end
  -- The back of the blade in iron, the last two pixels of its edge in steel.
  local Edge, Back = L.mask(21, 16), L.mask(21, 16)
  L.each(B, function(x, y) if not L.on(B, x, y + 2) then L.set(Edge, x, y) else L.set(Back, x, y) end end)
  L.paint(img, Back, iron, { dx = ox, flat = 0.5, seed = 7 })
  L.paint(img, Edge, steel, { dx = ox, flat = 0.55, outline = false, grad = function(x) return (10.5 - math.abs(x - 10.5)) * 0.03 end })
  -- The socket and the eye the chain goes through.
  local S = L.mask(21, 16)
  L.rect(S, 9, 2, 3, 6); L.ell(S, 10.5, 2, 2.4, 2)
  L.paint(img, S, iron, { dx = ox, flat = 0.55, seed = 2 })
  L.put(img, ox + 10, 2, iron[1]); L.put(img, ox + 11, 2, iron[1])
end)

-- One link and the next, side on, to be repeated along the pendulum's chain at k = 3.
L.piece("trap-link", 3, 8, { k = 3 }, function(img, f, ox)
  local M = L.mask(3, 8)
  L.ell(M, 1.5, 2, 1.5, 2.2); L.rect(M, 1, 4, 1, 4)
  L.paint(img, M, iron, { dx = ox, flat = 0.55 })
  L.put(img, ox + 1, 2, iron[1])
end)

-- The bracket in the vault the pendulum hangs from: an iron plate, two bolts, a ring below.
L.piece("trap-pivot", 11, 8, { k = 3 }, function(img, f, ox)
  local P = L.mask(11, 8)
  L.rect(P, 0, 0, 11, 3); L.poly(P, { 3, 3, 8, 3, 6.5, 5, 4.5, 5 })
  L.paint(img, P, iron, { dx = ox, flat = 0.45, seed = 5 })
  L.put(img, ox + 1, 1, bone[2]); L.put(img, ox + 9, 1, bone[2])
  local R = L.mask(11, 8)
  L.ell(R, 5.5, 6, 2, 1.8)
  L.ell(R, 5.5, 6, 1, 0.8)
  local hole = L.mask(11, 8); L.ell(hole, 5.5, 6, 0.9, 0.7)
  L.each(hole, function(x, y) L.unset(R, x, y) end)
  L.paint(img, R, iron, { dx = ox, flat = 0.6 })
end)
