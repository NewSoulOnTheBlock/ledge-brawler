const P=require(process.env.HOME+"/.claude/skills/codixel/core/pixel.js");const grid=require("./grid.cjs");
const ink=P.hueRamp(4,{hue:250,sat:0.14,light:[0.04,0.27],shift:20});
const gold=P.hueRamp(5,{hue:45,sat:0.88,light:[0.3,0.84],shift:14});
const L={K:ink[0],k:ink[1],m:ink[2],n:ink[3],o:gold[0],G:gold[1],g:gold[2],y:gold[3],Y:P.col(P.hsl(50,1,0.62))};
const body=["..................KK............",
"................KKkmK...........",
"...............KkkmnmK..........",
"..............KkkmmnnmK.........",
"..y..........KkkmmmnnmkK........",
".yyG........KkkGGGGGkmmkK.......",
"yyyoG.......KkGKKKKKGmmkK.......",
".yyyoG......KGKYYKYYKGmkK.......",
"..yyoG......KkKKKKKKKkmmkK......",
"..yyyoG.....KkKoKKKoKkmmmkK.....",
"...yyoG.....KkKKoGoKKkmmmmkK....",
"...yyyoG.....KkKKKKKkkmmmmmkK...",
"....yyoG....KKkkkkkkkkkmmmnmmkK.",
".....yoG..KKkkmmmmkkkkkmmnnmmkK.",
".....yoGKKkkmmmnnmmkkkkmmnnnmkK.",
".....yoKkkmmmnnnmmkkkkmmmnnmmkK.",
".....KoGkmmmnnmmkkkkkkmmmmmmkkK.",
"....KgGokKkkkkkkkkkkkkkmmmmmkkK.",
"....KGoKK.KkkkkkkkkkkkkkmmmmkkK.",
".....oK....KkkmkkkkkkkkkkmmkkK..",
".....o.....KkkmmkkGkkkkkkmkkkK..",
".....G.....KkkmmkkgkkkkkkkkkK...",
"...........KkkmkkkGkkGkkkkkkK...",
"...........KkkmkkkkkkkkkkkkkK...",
"...........KkKmkkKkkkkkKkkkkK...",
"...........KkKkkKKkkGkKKkkKkK...",
"...........KkKKkK.Kk.kK.KkKKk...",
"...........Kk..kK.Kk..K..Kk.K...",
"............K..Kk.KG.....Kk.....",
"...............K..Kk......K.....",
"..................K............."];
const b=grid(body,L);P.save(b,"work/wraith-hand.png");
const ref=P.load("work/wraith-cut.png");
const hero=P.crop(P.load("../../apps/app/src/game/seeker/Ember/Seeker_Ember_Idle_30x30_24f.png"),0,0,30,30);
P.save(P.sheet([{buf:ref,label:"ref",fit:250},{buf:b,label:"v4",scale:8},{buf:hero,label:"hero",scale:8},{buf:b,label:"1x",scale:1},{buf:hero,label:"1x",scale:1}],{cols:3}),"work/wraith-hand-view.png");
module.exports={ink,gold,L};
