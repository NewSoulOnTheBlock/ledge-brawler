const m = require("./molten-anim.cjs"), ex = require("./export.cjs");
const r = [
  ex("molten-eye", m.core, { feet: [96, 98], faces: 1 }),          // anchor = body centre (it floats)
  ex("molten-claw", m.claw, { feet: [64, 108], faces: 1 }),         // left hand; draw mirrored for the right hand
  ex("molten-ringdisc", m.ringDisc, { feet: [48, 20], faces: 1, cols: 4 }),
  ex("molten-meteor", m.meteor, { feet: [24, 63], faces: 1, cols: 6 }),
  ex("molten-pool", m.lavaPool, { feet: [40, 19], faces: 1, cols: 6 }),
];
r.forEach(x => console.log(x.out.split(/[\/]/).pop(), x.frames, "frames |", x.tags.join(" ")));
