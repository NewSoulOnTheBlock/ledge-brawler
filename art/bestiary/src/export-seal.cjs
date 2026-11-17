const a = require("./seal-anim.cjs"), ex = require("./export.cjs");
console.log(ex("seal-bearer", {
  idle: { frames: a.idle, delay: 160 }, walk: { frames: a.walk, delay: 120 },
  block: { frames: a.block, delay: [80, 70, 90, 100, 110, 130] }, bash: { frames: a.bash, delay: [110, 130, 50, 120, 100, 90, 90, 110] },
  turn: { frames: a.turn, delay: 110 }, hurt: { frames: a.hurt, delay: [70, 100, 110, 130] },
  death: { frames: a.death, delay: [90, 110, 110, 140, 90, 90, 90, 90, 100, 100, 110, 120, 140, 260] } }, { feet: [32, 46], faces: 1 }).tags.join(" "));
