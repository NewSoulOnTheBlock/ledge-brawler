-- An animation for every move on every fighter's move list, built in Aseprite from the Hooded Seeker's frames
-- (character art by Primitive Pixels) in that fighter's palette. Each move is a choreography: which of his frames
-- to show, for how long, and where. Run through art/seeker/build.mjs, which also writes the game's list of them.
-- Writes art/seeker/moves/<fighter>/<move>.aseprite and apps/app/src/game/seeker/moves/<fighter>/<move>_<w>x<h>_<n>f.png.

local c = app.pixelColor

-- The pack's animations, with the two made in make.lua: frame size, and the feet point every frame lines up on.
local ANIMS = {
  idle = { "Idle_30x30_24f", 30, 30, 15, 28 }, run = { "Run_30x30_10f", 30, 30, 17, 28 },
  jump = { "JumpFall_30x30_28f", 30, 30, 16, 28 }, flip = { "DoubleJump_55x80_14f", 55, 80, 26, 51 },
  dash = { "Dash_30x30_5f", 30, 30, 18, 26 }, slide = { "WallSlide_30x30_5f", 30, 30, 14, 28 },
  climb = { "Climb_30x30_9f", 30, 30, 15, 28 }, crouch = { "Crouch_30x30_5f", 30, 30, 15, 27 },
  swing = { "Attack1_90x50_8f", 90, 50, 16, 38 }, backswing = { "Attack2_90x50_5f", 90, 50, 18, 43 },
  lunge = { "Attack3_200x50_10f", 200, 50, 102, 43 }, airSwing = { "JumpAttack_90x50_9f", 90, 50, 19, 44 },
  upSwing = { "UpAttack_55x80_8f", 55, 80, 23, 78 }, downSwing = { "DownAttack_55x80_7f", 55, 80, 21, 42 },
  heavy = { "HeavyAttack_117x80_11f", 117, 80, 33, 72 }, bow = { "Bow_55x80_22f", 55, 80, 25, 53 },
  cast = { "Cast_40x40_11f", 40, 40, 19, 33 }, kick = { "Kick_44x30_6f", 44, 30, 15, 28 },
  charge = { "Charge_34x38_8f", 34, 38, 17, 36 },
}

-- Steps: { anim, frame, milliseconds, dx, dy, flipped }.
local function seq(a, from, to, ms)
  local out, by = {}, from <= to and 1 or -1
  for f = from, to, by do out[#out + 1] = { a, f, ms or 60, 0, 0, false } end
  return out
end
local function hold(a, f, ms) return { { a, f, ms, 0, 0, false } } end
local function cat(...)
  local out = {}
  for _, list in ipairs({ ... }) do for _, s in ipairs(list) do out[#out + 1] = { s[1], s[2], s[3], s[4], s[5], s[6] } end end
  return out
end
local function times(list, n) local out = {} for _ = 1, n do out = cat(out, list) end return out end
local function flipped(list) local out = cat(list) for _, s in ipairs(out) do s[6] = not s[6] end return out end
local function moved(list, dx, dy) local out = cat(list) for _, s in ipairs(out) do s[4] = s[4] + dx; s[5] = s[5] + dy end return out end
local function lasting(list, ms) local out = cat(list) for _, s in ipairs(out) do s[3] = ms end return out end

local both = cat(seq("swing", 2, 4, 40), seq("backswing", 1, 3, 40))

-- The choreography of each move, by the name the arena knows it by.
local MOVES = {
  -- combos
  hook = cat(seq("heavy", 3, 4, 60), seq("heavy", 5, 10, 60)),
  haymaker = cat(seq("heavy", 0, 4, 70), hold("heavy", 4, 100), seq("heavy", 5, 6, 60), seq("heavy", 7, 10, 90)),
  tornado = cat(seq("flip", 0, 13, 35), seq("flip", 4, 10, 35), seq("kick", 2, 3, 70)),
  riptidespin = cat(times(seq("flip", 0, 13, 30), 2), seq("kick", 2, 3, 70)),
  coilkick = times(cat(seq("flip", 3, 9, 30), seq("kick", 2, 3, 50)), 2),
  leafcyclone = cat(seq("flip", 0, 13, 35), times(seq("jump", 13, 14, 80), 3), seq("flip", 3, 12, 35), seq("kick", 2, 3, 70)),
  knee = cat(seq("crouch", 0, 3, 40), seq("upSwing", 0, 7, 55), hold("jump", 13, 80)),
  flurry = times(both, 4),
  cinder = lasting(times(both, 3), 70),
  torrent = lasting(times(both, 6), 30),
  petalstorm = moved(times(cat(seq("airSwing", 2, 4, 45), seq("backswing", 1, 2, 45)), 4), 0, -4),
  sweep = cat(seq("crouch", 0, 3, 25), moved(seq("kick", 1, 3, 60), 0, 2), hold("crouch", 4, 80)),
  undertow = cat(seq("crouch", 0, 3, 40), moved(seq("kick", 1, 3, 60), 0, 2), flipped(moved(seq("kick", 2, 3, 70), 0, 2)), hold("crouch", 4, 80)),
  vinetrip = cat(seq("crouch", 0, 3, 40), moved(cat(seq("kick", 1, 3, 60), hold("kick", 3, 160), hold("kick", 2, 60)), 0, 2), hold("crouch", 4, 80)),
  quakestomp = cat(seq("jump", 0, 3, 40), seq("downSwing", 2, 6, 55), seq("crouch", 3, 4, 90)),
  hammer = cat(seq("jump", 10, 13, 40), seq("downSwing", 0, 3, 45), hold("downSwing", 4, 160), seq("downSwing", 5, 6, 70)),
  meteordrop = cat(seq("flip", 0, 6, 40), seq("downSwing", 0, 3, 45), hold("downSwing", 4, 200), seq("downSwing", 5, 6, 80)),
  elbow = cat(times(seq("dash", 0, 4, 35), 2), seq("backswing", 0, 4, 55)),
  bullcharge = cat(seq("run", 0, 5, 45), times(seq("dash", 0, 4, 35), 2), seq("heavy", 5, 10, 60)),
  slipstream = cat(times(seq("dash", 0, 4, 28), 3), seq("swing", 2, 7, 45)),
  railelbow = cat(times(seq("dash", 0, 4, 30), 2), seq("lunge", 3, 9, 50)),
  lariat = times(cat(seq("backswing", 1, 3, 50), flipped(seq("backswing", 1, 3, 50))), 3),
  vanish = cat(seq("dash", 0, 2, 35), seq("backswing", 0, 4, 50), seq("swing", 5, 7, 60)),
  ripplestep = cat(seq("dash", 0, 4, 30), seq("backswing", 0, 4, 45), flipped(seq("dash", 0, 4, 30)), seq("swing", 2, 7, 45)),
  spike = cat(seq("airSwing", 0, 3, 45), seq("downSwing", 2, 6, 60)),
  boltspike = cat(seq("flip", 4, 8, 35), seq("downSwing", 1, 6, 55)),
  galejuggle = cat(seq("airSwing", 0, 8, 45), seq("upSwing", 2, 6, 55)),
  skyward = cat(seq("crouch", 0, 2, 40), seq("upSwing", 0, 7, 50), seq("flip", 6, 13, 40)),
  shockpalm = seq("cast", 4, 10, 60),
  -- specials
  beam = cat(seq("charge", 0, 7, 60), seq("cast", 0, 8, 50), times(hold("cast", 8, 80), 6), seq("cast", 9, 10, 100)),
  volley = cat(seq("jump", 1, 6, 35), seq("bow", 0, 14, 45), times(seq("bow", 9, 14, 40), 3), seq("jump", 15, 18, 50)),
  fan = cat(seq("jump", 1, 6, 35), times(seq("cast", 5, 8, 55), 3), seq("cast", 9, 10, 100)),
  nova = cat(times(seq("charge", 0, 7, 45), 2), seq("crouch", 0, 3, 40), seq("heavy", 5, 10, 70)),
  pillars = cat(seq("heavy", 0, 4, 70), hold("heavy", 4, 160), seq("heavy", 5, 10, 70), hold("crouch", 3, 120)),
  bigorb = cat(seq("cast", 0, 6, 90), seq("cast", 7, 10, 70)),
  quake = cat(seq("jump", 0, 6, 35), seq("downSwing", 0, 6, 55), times(hold("crouch", 3, 90), 2), hold("crouch", 4, 90)),
  rush = times(cat(seq("dash", 0, 4, 25), seq("backswing", 1, 3, 40), flipped(seq("dash", 0, 4, 25)), flipped(seq("swing", 2, 4, 40))), 2),
  discs = times(seq("backswing", 0, 4, 50), 3),
  vortex = cat(seq("cast", 0, 8, 55), times(seq("cast", 7, 8, 70), 8), seq("cast", 9, 10, 100)),
  storm = cat(seq("charge", 0, 7, 50), seq("upSwing", 0, 4, 55), times(hold("upSwing", 4, 90), 8), seq("upSwing", 5, 7, 70)),
  cyclone = cat(seq("flip", 0, 13, 30), seq("cast", 4, 10, 60)),
  rain = cat(seq("bow", 0, 9, 55), times(seq("bow", 9, 14, 40), 4), seq("bow", 15, 21, 45)),
  echo = cat(seq("charge", 0, 3, 60), seq("dash", 0, 4, 35), flipped(seq("dash", 0, 4, 35)), seq("idle", 0, 2, 100)),
  -- powers
  blast = seq("cast", 3, 10, 55),
  flight = cat(seq("jump", 0, 6, 35), times(seq("jump", 13, 14, 90), 3), times(seq("dash", 0, 4, 40), 2)),
  charging = seq("charge", 0, 7, 70),
  overdrive = cat(seq("charge", 0, 7, 50), seq("heavy", 0, 4, 60), times(hold("heavy", 4, 90), 3), seq("charge", 0, 7, 50)),
  dashing = times(seq("dash", 0, 4, 40), 2),
  wallclimb = cat(seq("climb", 0, 8, 80), seq("slide", 0, 4, 100)),
}

local POWERS = { { "blast", "Energy Blast" }, { "flight", "Flight" }, { "charging", "Charge" }, { "overdrive", "Overdrive" }, { "dashing", "Dash" }, { "wallclimb", "Wall Climb" } }

-- Each fighter's palette, how quick its hands are, and its move list as the game names it.
local FIGHTERS = {
  { "ink", "Void", 1, { { "hook", "Three-Step Strike" }, { "tornado", "Whirlwind" }, { "knee", "Launcher Rush" }, { "flurry", "Storm Fists" }, { "sweep", "Ground Sweep" }, { "hammer", "Hammer Drop" }, { "elbow", "Dash Elbow" }, { "vanish", "Vanish Strike" }, { "spike", "Air Juggle" }, { "skyward", "Skyward Fist" }, { "beam", "Horizon Beam" }, { "volley", "Meteor Volley" }, { "nova", "Nova Burst" } } },
  { "ember", "Ember", 1.25, { { "haymaker", "Furnace Haymaker" }, { "tornado", "Flame Wheel" }, { "knee", "Magma Knee" }, { "cinder", "Cinder Barrage" }, { "quakestomp", "Quake Stomp" }, { "meteordrop", "Meteor Drop" }, { "bullcharge", "Bull Charge" }, { "lariat", "Iron Lariat" }, { "spike", "Ash Spike" }, { "skyward", "Rising Flame" }, { "pillars", "Inferno Pillars" }, { "bigorb", "Magma Orb" }, { "quake", "Eruption" } } },
  { "tide", "Frost", 0.8, { { "hook", "Breaker Fist" }, { "riptidespin", "Riptide Spin" }, { "knee", "Surf Knee" }, { "torrent", "Torrent" }, { "undertow", "Undertow" }, { "hammer", "Tidal Crash" }, { "slipstream", "Slipstream" }, { "ripplestep", "Ripple Step" }, { "spike", "Wave Spike" }, { "skyward", "Geyser Fist" }, { "rush", "Phantom Rush" }, { "discs", "Riptide Discs" }, { "vortex", "Whirlpool" } } },
  { "volt", "Void", 0.9, { { "shockpalm", "Shock Palm" }, { "coilkick", "Coil Kick" }, { "knee", "Static Lift" }, { "flurry", "Spark Fists" }, { "sweep", "Ground Current" }, { "hammer", "Thunder Drop" }, { "railelbow", "Rail Elbow" }, { "vanish", "Blink Kick" }, { "boltspike", "Bolt Spike" }, { "skyward", "Thunder Rise" }, { "beam", "Arc Lance" }, { "fan", "Spark Fan" }, { "storm", "Storm Call" } } },
  { "moss", "Void", 1.1, { { "hook", "Vine Uppercut" }, { "leafcyclone", "Leaf Cyclone" }, { "knee", "Sprout Knee" }, { "petalstorm", "Petal Storm" }, { "vinetrip", "Vine Trip" }, { "hammer", "Falling Oak" }, { "elbow", "Gale Dash" }, { "vanish", "Leaf Step" }, { "galejuggle", "Gale Juggle" }, { "skyward", "Sky Seed" }, { "cyclone", "Gale Cyclone" }, { "rain", "Thorn Rain" }, { "echo", "Twin Echo" } } },
}

local images = {}
local function source(palette, anim)
  local key = palette .. "/" .. anim
  if not images[key] then images[key] = Image { fromFile = "apps/app/src/game/seeker/" .. palette .. "/Seeker_" .. palette .. "_" .. ANIMS[anim][1] .. ".png" } end
  return images[key]
end

local function slug(name) return (name:lower():gsub("[^a-z0-9]+", "-"):gsub("^-", ""):gsub("-$", "")) end

for _, fighter in ipairs(FIGHTERS) do
  local id, palette, pace, list = fighter[1], fighter[2], fighter[3], cat(fighter[4], POWERS)
  for _, entry in ipairs(list) do
    local key, name, steps = entry[1], entry[2], MOVES[entry[1]]
    -- The canvas holds every step with the feet points on one spot.
    local left, top, right, bottom = 0, 0, 0, 0
    for _, s in ipairs(steps) do
      local a = ANIMS[s[1]]
      local l = (s[6] and -(a[2] - a[4]) or -a[4]) + s[4]
      left = math.min(left, l); right = math.max(right, l + a[2])
      top = math.min(top, -a[5] + s[5]); bottom = math.max(bottom, -a[5] + s[5] + a[3])
    end
    local w, h, fx, fy = right - left, bottom - top, -left, -top
    local spr = Sprite(w, h, ColorMode.RGB)
    spr.layers[1].name = name
    local sheet = Image(w * #steps, h, ColorMode.RGB)
    local ms = {}
    for i, s in ipairs(steps) do
      local a, src = ANIMS[s[1]], source(palette, s[1])
      local frame = Image(w, h, ColorMode.RGB)
      for y = 0, a[3] - 1 do
        for x = 0, a[2] - 1 do
          local p = src:getPixel(s[2] * a[2] + x, y)
          if c.rgbaA(p) > 0 then
            local tx = fx + s[4] + (s[6] and (a[4] - x) or (x - a[4]))
            local ty = fy + s[5] + y - a[5]
            if tx >= 0 and ty >= 0 and tx < w and ty < h then frame:drawPixel(tx, ty, p) end
          end
        end
      end
      if i > 1 then spr:newEmptyFrame() end
      spr:newCel(spr.layers[1], i, frame, Point(0, 0))
      ms[i] = math.floor(s[3] * pace + 0.5)
      spr.frames[i].duration = ms[i] / 1000
      sheet:drawImage(frame, Point((i - 1) * w, 0))
    end
    local tag = spr:newTag(1, #steps)
    tag.name = name
    local file = id .. "/" .. slug(name) .. "_" .. w .. "x" .. h .. "_" .. #steps .. "f"
    spr:saveAs("art/seeker/moves/" .. id .. "/" .. slug(name) .. ".aseprite")
    sheet:saveAs("apps/app/src/game/seeker/moves/" .. file .. ".png")
    spr:close()
    print(table.concat({ "MOVE", id, key, name, file, w, h, #steps, fx, fy, table.concat(ms, ",") }, "\t"))
  end
end
