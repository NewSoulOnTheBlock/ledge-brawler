// contact sheets: 5 evenly spaced frames per animation, a few animations per image
const P = require(process.env.HOME + "/.claude/skills/codixel/core/pixel.js"), A = require("./anim.cjs");
const m = require("./molten-anim.cjs");
const bg = (f) => { const b = new P.Buf(f.w, f.h); b.rect(0, 0, f.w, f.h, P.rgb(46, 18, 14)); return A.over(b, f); };
const chunk = (group, per, name, n = 5) => { const keys = Object.keys(group);
  for (let c = 0; c < keys.length; c += per) { const items = [];
    keys.slice(c, c + per).forEach(k => { const fr = group[k].frames; for (let j = 0; j < n; j++) { const i = Math.round(j * (fr.length - 1) / (n - 1)); items.push({ buf: bg(fr[i]), label: `${k} ${i}`, scale: 1 }); } });
    P.save(P.sheet(items, { cols: n }), `work/review-${name}-${c / per + 1}.png`); } };
chunk(m.core, 4, "core"); chunk(m.claw, 6, "claw", 6);
