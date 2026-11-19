-- The drawing kit for the levels' own props (art/locale/<level>.lua), run inside Aseprite by build.lua.
-- A prop is drawn as masks (the pixels of one part), each painted from a colour ramp: lit from the top left, an
-- outline on its shadowed edges, and a little grain, so every piece reads as the same hand.
local L = {}
local rgba = app.pixelColor.rgba

-- ---------- colour ----------
local function hsl(h, s, l)
  h = (h % 360) / 360
  local function f(p, q, t) if t < 0 then t = t + 1 end if t > 1 then t = t - 1 end
    if t < 1 / 6 then return p + (q - p) * 6 * t end if t < 1 / 2 then return q end
    if t < 2 / 3 then return p + (q - p) * (2 / 3 - t) * 6 end return p end
  if s == 0 then return l, l, l end
  local q = l < 0.5 and l * (1 + s) or l + s - l * s
  local p = 2 * l - q
  return f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)
end
--- A ramp of `n` colours from dark to light; the darks lean `shift` degrees cooler and the lights as far warmer.
function L.ramp(h, s, l0, l1, n, shift)
  n = n or 5; shift = shift or 20
  local out = {}
  for i = 0, n - 1 do
    local t = n == 1 and 0.5 or i / (n - 1)
    local r, g, b = hsl(h + (0.5 - t) * shift * 2, s * (0.75 + 0.5 * math.sin(t * math.pi)), l0 + (l1 - l0) * t)
    out[#out + 1] = { math.floor(r * 255 + 0.5), math.floor(g * 255 + 0.5), math.floor(b * 255 + 0.5) }
  end
  return out
end
function L.rgb(r, g, b) return { r, g, b } end

-- ---------- grain ----------
function L.hash(x, y, s)
  local h = (x * 374761393 + y * 668265263 + (s or 1) * 2246822519) % 4294967296
  h = ((h ~ (h >> 13)) * 1274126177) % 4294967296
  return ((h ~ (h >> 16)) % 4294967296) / 4294967296
end

-- ---------- masks ----------
function L.mask(w, h) return { w = w, h = h, m = {} } end
function L.set(M, x, y) x = math.floor(x + 0.5); y = math.floor(y + 0.5); if x >= 0 and y >= 0 and x < M.w and y < M.h then M.m[y * M.w + x] = true end end
function L.unset(M, x, y) x = math.floor(x + 0.5); y = math.floor(y + 0.5); M.m[y * M.w + x] = nil end
function L.on(M, x, y) return x >= 0 and y >= 0 and x < M.w and y < M.h and M.m[y * M.w + x] == true end
function L.disc(M, cx, cy, r) for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do if (x + 0.5 - cx) ^ 2 + (y + 0.5 - cy) ^ 2 <= r * r then L.set(M, x, y) end end end end
function L.ell(M, cx, cy, rx, ry) for y = math.floor(cy - ry), math.ceil(cy + ry) do for x = math.floor(cx - rx), math.ceil(cx + rx) do if ((x + 0.5 - cx) / rx) ^ 2 + ((y + 0.5 - cy) / ry) ^ 2 <= 1 then L.set(M, x, y) end end end end
function L.rect(M, x, y, w, h) for j = 0, h - 1 do for i = 0, w - 1 do L.set(M, x + i, y + j) end end end
--- A rod from a to b, ra thick at a and rb at b.
function L.tube(M, ax, ay, bx, by, ra, rb)
  rb = rb or ra
  local n = math.ceil(math.sqrt((bx - ax) ^ 2 + (by - ay) ^ 2) * 2) + 1
  for k = 0, n do local u = k / n; L.disc(M, ax + (bx - ax) * u, ay + (by - ay) * u, ra + (rb - ra) * u) end
end
function L.line(M, ax, ay, bx, by) local n = math.max(math.abs(bx - ax), math.abs(by - ay)); for k = 0, n do local u = n == 0 and 0 or k / n; L.set(M, ax + (bx - ax) * u, ay + (by - ay) * u) end end
--- Everything inside the polygon {x1, y1, x2, y2, ...}.
function L.poly(M, p)
  for y = 0, M.h - 1 do for x = 0, M.w - 1 do
    local px, py, inside, n = x + 0.5, y + 0.5, false, #p // 2
    local j = n
    for i = 1, n do
      local xi, yi, xj, yj = p[2 * i - 1], p[2 * i], p[2 * j - 1], p[2 * j]
      if ((yi > py) ~= (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi) then inside = not inside end
      j = i
    end
    if inside then L.set(M, x, y) end
  end end
end
function L.each(M, fn) for y = 0, M.h - 1 do for x = 0, M.w - 1 do if L.on(M, x, y) then fn(x, y) end end end end

-- ---------- painting ----------
--- Paints mask M onto image `img` (offset dx, dy) from `ramp`: lit from the top left, outlined in its darkest on the
--- shadowed edges. o: { flat = 0..1 base light, noise = grain, outline = false to leave it off, grad = fn(x, y) -> extra
--- light, seed, alpha = 0..255, dx, dy, rim = colour for the top-lit edge }.
function L.paint(img, M, ramp, o)
  o = o or {}
  local n, flat, noise, a = #ramp, o.flat or 0.45, o.noise or 0.18, o.alpha or 255
  L.each(M, function(x, y)
    local lt, up = not L.on(M, x - 1, y), not L.on(M, x, y - 1)
    local rt, dn = not L.on(M, x + 1, y), not L.on(M, x, y + 1)
    local v = flat
    if lt or up then v = v + 0.35 end
    if rt or dn then v = v - 0.3 end
    if o.grad then v = v + o.grad(x, y) end
    v = v + (L.hash(x // 2, y // 2, o.seed or 3) - 0.5) * noise
    local i = math.max(1, math.min(n, math.floor(v * (n - 1) + 1.5)))
    if o.outline ~= false and (rt or dn) and not (up and lt) then i = 1 end
    local c = (o.rim and up and not dn) and o.rim or ramp[i]
    L.put(img, x + (o.dx or 0), y + (o.dy or 0), c, a)
  end)
end
--- One flat colour over mask M.
function L.fill(img, M, c, a, dx, dy) L.each(M, function(x, y) L.put(img, x + (dx or 0), y + (dy or 0), c, a) end) end
function L.put(img, x, y, c, a)
  if x < 0 or y < 0 or x >= img.width or y >= img.height then return end
  a = a or 255
  if a >= 255 then img:drawPixel(x, y, rgba(c[1], c[2], c[3], 255)); return end
  local old = img:getPixel(x, y)
  local oa = app.pixelColor.rgbaA(old)
  if oa == 0 then img:drawPixel(x, y, rgba(c[1], c[2], c[3], a)); return end
  local t = a / 255
  img:drawPixel(x, y, rgba(math.floor(app.pixelColor.rgbaR(old) * (1 - t) + c[1] * t), math.floor(app.pixelColor.rgbaG(old) * (1 - t) + c[2] * t), math.floor(app.pixelColor.rgbaB(old) * (1 - t) + c[3] * t), math.max(oa, a)))
end
--- A soft round glow of colour c around (cx, cy), r wide, at most `a` strong.
function L.glow(img, cx, cy, r, c, a)
  for y = math.floor(cy - r), math.ceil(cy + r) do for x = math.floor(cx - r), math.ceil(cx + r) do
    local d = math.sqrt((x + 0.5 - cx) ^ 2 + (y + 0.5 - cy) ^ 2) / r
    if d < 1 then local k = (1 - d) ^ 2 * a; if k >= 8 then L.put(img, x, y, c, math.floor(k)) end end
  end end
end

-- ---------- pieces ----------
L.pieces = {}
--- A prop: `name`, its size (one frame), what the game needs to know of it (meta: k = world pixels per pixel, and the
--- scenery flags: wall, under, fg, far, light, sway, flicker, drip, alpha, frames), and `draw(img, frame, ox)` which
--- paints frame `frame` with its left edge at ox.
function L.piece(name, w, h, meta, draw) L.pieces[#L.pieces + 1] = { name = name, w = w, h = h, meta = meta, draw = draw } end

local function json(v)
  local t = type(v)
  if t == "table" then
    if #v > 0 or next(v) == nil then local out = {} for _, e in ipairs(v) do out[#out + 1] = json(e) end return "[" .. table.concat(out, ",") .. "]" end
    local keys = {} for k in pairs(v) do keys[#keys + 1] = k end table.sort(keys)
    local out = {} for _, k in ipairs(keys) do out[#out + 1] = '"' .. k .. '":' .. json(v[k]) end return "{" .. table.concat(out, ",") .. "}"
  elseif t == "string" then return '"' .. v .. '"'
  elseif t == "boolean" then return v and "true" or "false"
  else return tostring(v) end
end
--- Draws every piece, saving each as <ase>/<name>.aseprite and <png>/<name>.png (frames side by side), and the list of
--- them with their meta as <png>/meta.json.
function L.write(ase, png, only)
  local list = {}
  for _, p in ipairs(L.pieces) do
    if not only or p.name:find(only, 1, true) == 1 then
      local frames = p.meta.frames or 1
      local spr = Sprite(p.w * frames, p.h, ColorMode.RGB)
      local img = spr.cels[1].image
      for f = 0, frames - 1 do p.draw(img, f, f * p.w) end
      spr:saveAs(ase .. "/" .. p.name .. ".aseprite")
      spr:saveCopyAs(png .. "/" .. p.name .. ".png")
      spr:close()
    end
    list[#list + 1] = '"' .. p.name .. '":' .. json(p.meta)
  end
  local f = io.open(png .. "/meta.json", "w"); f:write("{" .. table.concat(list, ",\n") .. "}\n"); f:close()
  return #list
end

-- ---------- the kit: the layers every level has, each drawn in that level's own colours ----------
L.kit = {}
--- Courses of dressed stone showing through the rock (a "deep" piece): `ramp` the stone's.
function L.kit.bricks(name, ramp, o)
  o = o or {}
  L.piece(name, 28, 16, { k = o.k or 3.2, wall = true }, function(img, f, ox)
    for r = 0, 2 do for c = 0, 3 do
      if L.hash(r, c, o.seed or 7) > (o.gaps or 0.3) then
        local M = L.mask(28, 16); L.rect(M, c * 7 + (r % 2) * 3, r * 5, o.w or 6, 4)
        L.paint(img, M, ramp, { dx = ox, flat = 0.6 + L.hash(c, r, 2) * 0.25, alpha = o.alpha or 190, seed = r * 4 + c })
      end
    end end
  end)
end
--- A crack running down the rock.
function L.kit.crack(name, dark, light, o)
  o = o or {}
  L.piece(name, 20, 22, { k = o.k or 3.2, wall = true }, function(img, f, ox)
    local x, y = 10, 0
    for i = 1, 22 do
      L.put(img, ox + x, y, dark, 210); L.put(img, ox + x + 1, y, light, 80)
      y = y + 1; x = x + math.floor((L.hash(i, 3, o.seed or 5) - 0.5) * 3 + 0.5)
      if i == 8 then for j = 1, 6 do L.put(img, ox + x - j, y + j // 2, dark, 170) end end
    end
  end)
end
--- Small stones along a floor's edge.
function L.kit.pebbles(name, ramp, o)
  o = o or {}
  L.piece(name, 14, 4, { k = o.k or 3, wall = true }, function(img, f, ox)
    local M = L.mask(14, 4); L.ell(M, 3, 3, 2, 1.3); L.ell(M, 8, 3.2, 1.6, 1); L.ell(M, 12, 3, 1.4, 1.2)
    L.paint(img, M, ramp, { dx = ox, flat = 0.6 })
  end)
end
--- Tufts of grass or growth standing up along a floor's edge: blades `tall` high.
function L.kit.tuft(name, ramp, tall, o)
  o = o or {}
  L.piece(name, 16, tall + 1, { k = o.k or 3, sway = true, wall = true }, function(img, f, ox)
    local M = L.mask(16, tall + 1)
    for i = 0, 7 do
      local x, h = 1 + i * 2, math.floor(tall * (0.4 + 0.6 * L.hash(i, tall, o.seed or 21)))
      L.line(M, x, tall, x + (L.hash(i, 2, 22) - 0.5) * 3, tall - h)
    end
    L.paint(img, M, ramp, { dx = ox, flat = 0.5, outline = false, grad = function(x, y) return (tall - y) / tall * 0.4 - 0.2 end })
  end)
end
--- Something hanging over a ledge's end in strands (moss, roots, vines, icicles): `len` long at most.
function L.kit.drape(name, ramp, len, o)
  o = o or {}
  L.piece(name, 12, len + 3, { k = o.k or 3, under = true, sway = o.sway ~= false }, function(img, f, ox)
    local M = L.mask(12, len + 3); L.rect(M, 0, 0, 12, 3)
    for x = 0, 11 do local l = math.floor(len * (0.3 + 0.7 * L.hash(x, len, o.seed or 9))); if x % 3 ~= 1 then if o.taper then L.tube(M, x, 2, x, 2 + l, 0.9, 0.2) else L.rect(M, x, 3, 1, l) end end end
    L.paint(img, M, ramp, { dx = ox, flat = 0.5, outline = false })
  end)
end
--- A chain from a ceiling, `len` long, with a hook, a ring or nothing at its end.
function L.kit.chain(name, ramp, len, o)
  o = o or {}
  L.piece(name, 7, len, { k = o.k or 3, under = true, sway = true }, function(img, f, ox)
    local M = L.mask(7, len)
    for i = 0, len // 4 - 2 do if i % 2 == 0 then L.ell(M, 3.5, 2 + i * 4, 1.4, 2.2) else L.rect(M, 3, i * 4, 1, 4) end end
    if o.hook ~= false then L.tube(M, 3.5, len - 5, 5.5, len - 2, 0.8); L.tube(M, 5.5, len - 2, 3, len - 1, 0.8) end
    L.paint(img, M, ramp, { dx = ox, flat = 0.55 })
  end)
end
--- A dark shape between the view and the fight, its lit edges in `rim`: `shape(M)` draws it into a w x h mask.
function L.kit.silhouette(name, w, h, dark, rim, shape, o)
  o = o or {}
  L.piece(name, w, h, { k = o.k or 4, fg = true }, function(img, f, ox)
    local M = L.mask(w, h); shape(M)
    L.fill(img, M, dark, 255, ox)
    L.each(M, function(x, y) if not L.on(M, x - 1, y) or not L.on(M, x, y - 1) then L.put(img, ox + x, y, rim, 200) end end)
  end)
end
--- A small light: a flame (or a glow) of `flame` colours on a stand drawn by `stand(img, ox)`.
function L.kit.flame(img, ox, x, y, flame)
  L.put(img, ox + x, y, flame[1]); L.put(img, ox + x, y + 1, flame[2]); L.put(img, ox + x + 1, y + 1, flame[3]); L.put(img, ox + x, y - 1, flame[1], 150)
end

--- A far silhouette for a level's horizon (scenery.ts tiles it along the view at `far` parallax): flat `col`, its top
--- edges a shade lighter, `shape(M)` drawing it into a w x h mask.
function L.kit.far(name, w, h, col, edge, far, shape, o)
  o = o or {}
  L.piece(name, w, h, { k = o.k or 5, far = far, alpha = o.alpha or 0.9 }, function(img, f, ox)
    local M = L.mask(w, h); shape(M)
    L.fill(img, M, col, 255, ox)
    L.each(M, function(x, y) if not L.on(M, x, y - 1) then L.put(img, ox + x, y, edge, 255) end end)
  end)
end

return L
