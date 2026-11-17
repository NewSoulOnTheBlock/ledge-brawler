const W = require("./wraith-anim.cjs"), ex = require("./export.cjs");
console.log(ex("wraith", {
  idle: { frames: W.idle, delay: 120 }, float: { frames: W.float, delay: 100 },
  attack: { frames: W.attack, delay: [90, 90, 140, 50, 70, 120, 90, 90, 110] },
  cast: { frames: W.cast, delay: [90, 90, 90, 90, 160, 60, 70, 70, 80, 90, 90, 120] },
  hurt: { frames: W.hurt, delay: [70, 90, 100, 120] },
  death: { frames: W.death, delay: [80, 110, 110, 90, 90, 90, 90, 100, 100, 110, 120, 130, 140, 260] },
}, { feet: [25, 42], faces: -1 }));
const s = W.script;
console.log(ex("wraith-script", { fly: { frames: s.fly, delay: 80 }, land: { frames: s.land, delay: 80 }, linger: { frames: s.linger, delay: 120 }, fade: { frames: s.fade, delay: 120 } }, { feet: [12, 8], faces: -1, cols: 4 }));
