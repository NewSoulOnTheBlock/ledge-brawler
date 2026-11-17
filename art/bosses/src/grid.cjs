// ASCII pixel map -> buffer. legend: char -> color
const P=require(process.env.HOME+"/.claude/skills/codixel/core/pixel.js");
module.exports=(rows,legend)=>{const W=Math.max(...rows.map(r=>r.length)),b=new P.Buf(W,rows.length);
  rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(legend[ch]!=null)b.pset(x,y,legend[ch]);}));return b;};
