-- Three animations the Hooded Seeker pack (character art by Primitive Pixels) does not have, built in Aseprite from
-- his own frames, once for each palette: a kick and a charge (from his idle), and hanging from a ledge (from his
-- climb, seen from behind). Run from the repository root:
--   Aseprite.exe -b --script art/seeker/make.lua
-- Writes art/seeker/<Palette>/<Name>.aseprite (frames, timings, a tag) and the sheet the game loads,
-- apps/app/src/game/seeker/<Palette>/Seeker_<Palette>_<Name>_<w>x<h>_<n>f.png.

for _, PALETTE in ipairs({ "Void", "Bone", "Ember", "Frost" }) do

local SRC = "apps/app/src/game/seeker/" .. PALETTE .. "/Seeker_" .. PALETTE .. "_"
local OUT = SRC
local ART = "art/seeker/" .. PALETTE .. "/"

local c = app.pixelColor
local CLEAR = c.rgba(0, 0, 0, 0)
local BLACK = c.rgba(0, 0, 0, 255)
local CLOAK = c.rgba(81, 51, 115, 255)
local CLOAK_LIGHT = c.rgba(120, 72, 149, 255)
local CLOAK_DARK = c.rgba(53, 32, 81, 255)
local HAND = c.rgba(228, 207, 239, 255)
local GLOW, GLOW_BRIGHT, GLOW_SOFT
local WHITE = c.rgba(242, 254, 244, 255)

local sheets = {
  idle = { image = Image { fromFile = SRC .. "Idle_30x30_24f.png" }, w = 30, h = 30, feet = { 15, 28 } },
  climb = { image = Image { fromFile = SRC .. "Climb_30x30_9f.png" }, w = 30, h = 30, feet = { 15, 28 } },
}
-- The glow of this palette is the colour of his eye: its bright centre, and a deeper shade of it.
do
  local eye = sheets.idle.image:getPixel(14, 10)
  local r, g, b = c.rgbaR(eye), c.rgbaG(eye), c.rgbaB(eye)
  GLOW_BRIGHT = c.rgba(r, g, b, 255)
  GLOW = c.rgba(math.floor(r * 0.7), math.floor(g * 0.8), math.floor(b * 0.8), 255)
  GLOW_SOFT = c.rgba(math.floor(r * 0.7), math.floor(g * 0.8), math.floor(b * 0.8), 110)
end

-- A canvas w by h with frame `index` of `name` on it, its feet point moved to (fx, fy) and then by (dx, dy).
local function pose(name, index, w, h, fx, fy, dx, dy)
  local s = sheets[name]
  local out = Image(w, h, ColorMode.RGB)
  local ox, oy = fx - s.feet[1] + (dx or 0), fy - s.feet[2] + (dy or 0)
  for y = 0, s.h - 1 do
    for x = 0, s.w - 1 do
      local p = s.image:getPixel(index * s.w + x, y)
      local tx, ty = x + ox, y + oy
      if c.rgbaA(p) > 0 and tx >= 0 and ty >= 0 and tx < w and ty < h then out:drawPixel(tx, ty, p) end
    end
  end
  return out
end

local function put(img, x, y, color)
  if x >= 0 and y >= 0 and x < img.width and y < img.height then img:drawPixel(x, y, color) end
end
local function rect(img, x0, y0, x1, y1, color)
  for y = y0, y1 do for x = x0, x1 do put(img, x, y, color) end end
end
-- A line two pixels thick, for a limb.
local function limb(img, x0, y0, x1, y1, color)
  local steps = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
  for i = 0, steps do
    local x = math.floor(x0 + (x1 - x0) * i / steps + 0.5)
    local y = math.floor(y0 + (y1 - y0) * i / steps + 0.5)
    put(img, x, y, color); put(img, x, y + 1, color)
  end
end
-- Leans the figure: each row slides sideways, most at the top.
local function lean(img, feetY, by)
  local out = Image(img.width, img.height, ColorMode.RGB)
  for y = 0, img.height - 1 do
    local shift = math.floor((feetY - y) * by + 0.5)
    for x = 0, img.width - 1 do
      local p = img:getPixel(x, y)
      if c.rgbaA(p) > 0 then put(out, x + shift, y, p) end
    end
  end
  return out
end
-- A sleeve reaching from the cloak to (x1, y), two pixels deep, ending in a hand.
local function sleeve(img, x0, x1, y)
  for x = x0, x1 do put(img, x, y, CLOAK_LIGHT); put(img, x, y + 1, CLOAK) end
  put(img, x1 + 1, y, HAND); put(img, x1 + 1, y + 1, HAND)
end

-- Saves the frames as an Aseprite file and as the row of frames the game reads.
local function save(name, w, h, frames, ms)
  local spr = Sprite(w, h, ColorMode.RGB)
  local layer = spr.layers[1]
  layer.name = name
  for i, image in ipairs(frames) do
    if i > 1 then spr:newEmptyFrame() end
    spr:newCel(layer, i, image, Point(0, 0))
    spr.frames[i].duration = (type(ms) == "table" and ms[i] or ms) / 1000
  end
  local tag = spr:newTag(1, #frames)
  tag.name = name
  spr:saveAs(ART .. name .. ".aseprite")
  local sheet = Image(w * #frames, h, ColorMode.RGB)
  for i, image in ipairs(frames) do sheet:drawImage(image, Point((i - 1) * w, 0)) end
  sheet:saveAs(OUT .. name .. "_" .. w .. "x" .. h .. "_" .. #frames .. "f.png")
  spr:close()
  print(PALETTE .. " " .. name .. ": " .. #frames .. " frames of " .. w .. "x" .. h)
end

-- KICK: the front leg snaps out level, the body leaning away from it.
do
  local W, H, FX, FY = 44, 30, 15, 28
  local function stand(dx) return pose("idle", 0, W, H, FX, FY, dx, 0) end
  -- The front leg of the standing pose, three rows under the belt.
  local function noFrontLeg(img, dx) rect(img, 16 + dx, 25, 18 + dx, 27, CLEAR) end
  local function tucked(dx)
    local f = stand(dx); noFrontLeg(f, dx)
    limb(f, 16 + dx, 22, 20 + dx, 21, BLACK); rect(f, 20 + dx, 22, 21 + dx, 25, BLACK); put(f, 22 + dx, 25, BLACK)
    return f
  end
  local function out(dx, reach, swish)
    local f = lean(stand(dx), FY, -0.06); noFrontLeg(f, dx - 1)
    -- A thick thigh, a shin, and a boot turned up at the toe.
    limb(f, 15 + dx, 21, 20 + dx, 20, BLACK); limb(f, 15 + dx, 22, 20 + dx, 21, BLACK)
    limb(f, 20 + dx, 20, reach, 19, BLACK)
    rect(f, reach + 1, 18, reach + 2, 21, BLACK); put(f, reach + 3, 18, BLACK)
    if swish then
      for i = 0, 5 do put(f, reach + 4 + (i % 2), 15 + i * 2, i < 3 and GLOW_BRIGHT or GLOW) end
      put(f, reach + 6, 18, GLOW_SOFT); put(f, reach + 6, 22, GLOW_SOFT)
    end
    return f
  end
  save("Kick", W, H, { stand(0), tucked(-1), out(-1, 24, true), out(-1, 25, false), tucked(-1), stand(0) }, { 50, 50, 70, 70, 60, 60 })
end

-- CHARGE: eyes wide, lifted a little off his feet, motes of aura rising past him.
do
  local W, H, FX, FY = 34, 38, 17, 36
  local frames = {}
  for i = 1, 8 do
    local lift = (i % 2 == 0) and -1 or 0
    local f = pose("idle", (i - 1) * 3, W, H, FX, FY, 0, lift)
    -- Wider eyes: the column beside each one lights too.
    for _, x in ipairs({ 15, 19 }) do put(f, x, 18 + lift, GLOW_BRIGHT); put(f, x, 19 + lift, GLOW_BRIGHT) end
    for n, x in ipairs({ 3, 7, 11, 24, 28, 31 }) do
      local y = (40 + n * 11 - i * 4) % 34
      put(f, x, y, GLOW_BRIGHT); put(f, x, y + 1, GLOW); put(f, x, y + 2, GLOW_SOFT)
    end
    rect(f, 9, FY + 1, 25, FY + 1, GLOW_SOFT)
    frames[i] = f
  end
  save("Charge", W, H, frames, 70)
end
-- HANG: caught by the hands on a ledge's lip, seen from behind as he climbs: both arms up to the top row, his legs
-- hanging out of his cloak. Two frames of the catch (pulled up a pixel, then dropping a pixel past), then a slow sway
-- from the hands, which stay where they grip.
do
  local W, H, FX, FY = 30, 38, 15, 35
  -- Rows below the hands slide sideways, the further down the more: a swing from the grip.
  local function swing(img, by)
    local out = Image(img.width, img.height, ColorMode.RGB)
    for y = 0, img.height - 1 do
      local shift = math.floor((y - 2) * by + 0.5)
      for x = 0, img.width - 1 do
        local p = img:getPixel(x, y)
        if c.rgbaA(p) > 0 then put(out, x + shift, y, p) end
      end
    end
    return out
  end
  -- The sleeves in this palette's cloak: its commonest colour, and the brightest one used much, for the light edge.
  local SLEEVE, SLEEVE_LIGHT
  do
    local count, img = {}, sheets.climb.image
    for y = 0, 29 do for x = 0, 29 do
      local p = img:getPixel(x, y)
      if c.rgbaA(p) > 0 and p ~= BLACK then count[p] = (count[p] or 0) + 1 end
    end end
    local most, bright = 0, -1
    for p, n in pairs(count) do if n > most then most, SLEEVE = n, p end end
    for p, n in pairs(count) do
      local lit = c.rgbaR(p) + c.rgbaG(p) + c.rgbaB(p)
      if n >= 10 and p ~= SLEEVE and lit > bright then bright, SLEEVE_LIGHT = lit, p end
    end
    SLEEVE_LIGHT = SLEEVE_LIGHT or SLEEVE
  end
  local function hanging(dy, legs)
    local f = pose("climb", 0, W, H, FX, FY, 0, dy)
    -- The legs, out of the cloak's hem and hanging straight, a boot at each foot.
    if legs then
      for _, x in ipairs({ 13, 17 }) do rect(f, x, 32 + dy, x, 35 + dy, BLACK); put(f, x + (x == 13 and -1 or 1), 35 + dy, BLACK) end
    end
    -- Each arm from the shoulder up to the lip, a sleeve two pixels wide, and a hand gripping it.
    for _, arm in ipairs({ { 10, 9, 8 }, { 19, 20, 20 } }) do
      local from, to, hand = arm[1], arm[2], arm[3]
      for y = 3, 11 + dy do
        local x = (y < 7) and to or from
        put(f, x, y, SLEEVE_LIGHT); put(f, x + 1, y, SLEEVE)
      end
      rect(f, hand, 1, hand + 1, 2, HAND)
    end
    return f
  end
  local frames = { hanging(-1, false), hanging(1, true) }
  for _, by in ipairs({ 0.03, 0.06, 0.03, -0.03, -0.06, -0.03 }) do frames[#frames + 1] = swing(hanging(0, true), by) end
  save("Hang", W, H, frames, { 60, 90, 150, 150, 150, 150, 150, 150 })
end

end
