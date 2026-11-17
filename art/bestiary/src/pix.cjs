// reference cut -> game-size pixel sprite
const P=require(process.env.HOME+"/.claude/skills/codixel/core/pixel.js");
module.exports=(src,H,{colors=14}={})=>{
  const q=P.quantize(src,colors).buf, s=H/src.h;
  let b=P.resize(q,Math.round(src.w*s),H,{mode:true});
  b=P.cleanup(b,{tol:20,keepLone:true}); return P.smoothEdge(b);
};
