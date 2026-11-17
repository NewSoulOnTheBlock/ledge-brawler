-- Build one .aseprite from exported frame PNGs. Params: dir (frames + manifest.txt), out (.aseprite path)
-- manifest.txt lines: "<tag> <file.png> <ms>" in frame order
local dir, out = app.params.dir, app.params.out
local rows = {}
for line in io.lines(dir .. "/manifest.txt") do
  local tag, file, ms = line:match("^(%S+) (%S+) (%d+)$")
  rows[#rows + 1] = { tag = tag, file = file, ms = tonumber(ms) }
end
local first = Image{ fromFile = dir .. "/" .. rows[1].file }
local spr = Sprite(first.width, first.height, ColorMode.RGB)
spr.layers[1].name = "sprite"
for i, r in ipairs(rows) do
  if i > 1 then spr:newEmptyFrame() end
  spr:newCel(spr.layers[1], spr.frames[i], Image{ fromFile = dir .. "/" .. r.file }, Point(0, 0))
  spr.frames[i].duration = r.ms / 1000
end
local i = 1
while i <= #rows do
  local j = i
  while j < #rows and rows[j + 1].tag == rows[i].tag do j = j + 1 end
  local t = spr:newTag(i, j); t.name = rows[i].tag
  i = j + 1
end
spr:saveAs(out)
