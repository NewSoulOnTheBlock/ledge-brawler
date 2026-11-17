const { make, SIZES } = require("./blot-anim.cjs"), ex = require("./export.cjs");
for (const n of Object.keys(SIZES)) { const { W, H } = SIZES[n]; const r = ex(n, make(n), { feet: [W / 2, H - 1], faces: -1 }); console.log(n, r.frames, r.tags.join(" ")); }
