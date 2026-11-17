import sys,os
from PIL import Image, ImageDraw
def components(im, step=1, minarea=30, gap=1):
    a=im.getchannel("A")
    if step>1: a=a.resize((im.width//step, im.height//step), Image.BOX)
    w,h=a.size; px=a.load(); seen=bytearray(w*h); out=[]
    for y in range(h):
        for x in range(w):
            if px[x,y]>24 and not seen[y*w+x]:
                st=[(x,y)]; seen[y*w+x]=1; x0=x1=x; y0=y1=y; n=0
                while st:
                    cx,cy=st.pop(); n+=1
                    if cx<x0:x0=cx
                    if cx>x1:x1=cx
                    if cy<y0:y0=cy
                    if cy>y1:y1=cy
                    for dx in range(-gap,gap+1):
                        for dy in range(-gap,gap+1):
                            nx,ny=cx+dx,cy+dy
                            if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx] and px[nx,ny]>24:
                                seen[ny*w+nx]=1; st.append((nx,ny))
                if n>=minarea: out.append((x0*step,y0*step,(x1+1)*step,(y1+1)*step))
    return sorted(out,key=lambda r:(r[1]//max(1,(40*step)),r[0]))
if __name__=="__main__":
    path,step,name,out=sys.argv[1],int(sys.argv[2]),sys.argv[3],sys.argv[4]
    im=Image.open(path).convert("RGBA"); cs=components(im,step, minarea=int(sys.argv[5]) if len(sys.argv)>5 else 30, gap=int(sys.argv[6]) if len(sys.argv)>6 else 1)
    k=min(4,max(1,1400//im.width)) if im.width<1400 else 0
    if k: pv=im.resize((im.width*k,im.height*k),Image.NEAREST); f=k
    else: f=1400/im.width; pv=im.resize((1400,int(im.height*f)),Image.LANCZOS)
    bg=Image.new("RGBA",pv.size,(110,120,130,255)); bg.alpha_composite(pv); d=ImageDraw.Draw(bg)
    for i,(x0,y0,x1,y1) in enumerate(cs):
        d.rectangle((x0*f,y0*f,x1*f,y1*f),outline=(255,60,60,255)); d.text((x0*f+3,y0*f+2),str(i),fill=(255,255,0,255))
        print(i,(x0,y0,x1,y1))
    bg.convert("RGB").save(os.path.join(out,name+".png"))
