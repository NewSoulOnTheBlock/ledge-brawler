-- Draws the levels' own props in Aseprite: every art/locale/<level>.lua (each adds its pieces with L.piece), saved as
-- art/locale/ase/<name>.aseprite to open and edit by hand, and as PNGs for pack.py to put on the game's atlas.
--   node art/locale/build.mjs            (runs this in Aseprite's batch mode, then pack.py)
--   Aseprite -b --script-param dir=<art/locale> [--script-param only=<name prefix>] --script art/locale/build.lua
local dir = app.params.dir
local L = dofile(app.fs.joinPath(dir, "lib.lua"))
_G.L = L
local files = app.fs.listFiles(dir)
table.sort(files)
for _, f in ipairs(files) do
  if f:match("%.lua$") and f ~= "lib.lua" and f ~= "build.lua" then dofile(app.fs.joinPath(dir, f)) end
end
local ase, png = app.fs.joinPath(dir, "ase"), app.fs.joinPath(dir, "png")
app.fs.makeAllDirectories(ase); app.fs.makeAllDirectories(png)
local only = app.params.only
if only == "" then only = nil end
print("pieces " .. L.write(ase, png, only))
