const P=require(process.env.HOME+"/.claude/skills/codixel/core/pixel.js");const cut=require("./cut.cjs");
const pale=c=>{const [r,g,b]=P.unpack(c);return r>170&&g>140&&b>90&&r-b<110;};
const b=cut(185,66,275,158,{tol:+process.argv[2]||10,flood:true,minPart:60,drop:cols=>cols.filter(pale).length/cols.length>0.25});
P.save(b,"work/wraith-cut.png");console.log(b.w,b.h);
P.save(P.sheet([{buf:b,label:"cut",scale:3}]),"work/wraith-cut-view.png");
