"""Kyoto's original offline kit. All dimensions/staging are interpretive unless noted.
Reuse only the existing batch mesh primitives; no Rome geometry or runtime assets.
Author metres in +X east, +Y up, +Z south; export_objects converts to Blender Z-up.
"""
import math
import random
from rome_kit import Kit, PALETTE

PALETTE.update({
 'wood':'#67503a','wood_light':'#a18a67','wood_dark':'#352b22',
 'plaster':'#d8d3be','plaster_old':'#b9b5a2','roof':'#414749','roof_light':'#575b58',
 'bark':'#5b4d3c','earth':'#a4977b','gravel':'#b1a78f','stone':'#7c7b6c',
 'foliage':'#344c30','leaf_light':'#526444','cedar':'#284136','grass':'#737653',
 'water':'#66877f','gold':'#b59a51','lacquer':'#242420','red':'#875040',
 'skin':'#a8896b','cloth':'#858779','indigo':'#424e5d','fish':'#89999a',
 'fish_dark':'#48575a','basket':'#9a805b','paper':'#b6ab8e','dark':'#272a25',
})

class KyotoKit(Kit):
    def hip_roof(self,p,w,d,rise,material='roof',detail=False):
        x,y,z=p; halfw=w/2; halfd=d/2
        # Curved hipped roof, short ridge along X, continuous closed underside.
        rings=12 if detail else 3
        points=[]
        for j in range(rings+1):
            t=j/rings; a=halfw-min(halfw*.90,halfd)*t; b=halfd*(1-t)
            yy=y+rise*(t*t*.35+t*.65)+(.3 if detail else .05)*(1-t)**10
            points.extend([(x-a,yy,z-b),(x+a,yy,z-b),(x+a,yy,z+b),(x-a,yy,z+b)])
        faces=[(0,3,2,1)]+[(j*4+i,j*4+(i+1)%4,(j+1)*4+(i+1)%4,(j+1)*4+i) for j in range(rings) for i in range(4)]
        self.mesh(points,faces,material)
        self.rod((x-max(halfw-halfd,halfw*.1),y+rise+.14,z),(x+max(halfw-halfd,halfw*.1),y+rise+.14,z),.13 if detail else .25,material)
        if detail:
            # Rafters exposed beneath the wide eaves; tiled ribs catch sunlight.
            for i in range(int(w/.45)+1):
                dx=-halfw+i*.45
                if abs(dx)>halfw-.12: continue
                for sign in [-1,1]:
                    self.rod((x+dx,y-.12,z+sign*(halfd-1.7)),(x+dx,y+.04,z+sign*(halfd-.12)),.075,'wood_dark')
                    max_t=min(1,(halfw-abs(dx))/max(min(halfw*.90,halfd),.01))
                    prev=None
                    for j in range(9):
                        t=j/8*max_t
                        point=(x+dx,y+rise*(t*t*.35+t*.65)+.3*(1-t)**10+.055,z+sign*halfd*(1-t))
                        if prev: self.rod(prev,point,.042,material,n=6)
                        prev=point
            for sign in [-1,1]: self.rod((x-halfw,y+.3,z+sign*halfd),(x+halfw,y+.3,z+sign*halfd),.13,material)

    def gable(self,p,w,h,depth=.45,ornate=False):
        x,y,z=p
        # Curved kara-hafu outline with a central rise and lifted ends, ornamental hypothesis.
        last=None
        for i in range(65):
            u=-1+2*i/64
            yy=y+h*(.27+.73*math.exp(-u*u*5))+.24*abs(u)**8
            point=(x+w*u/2,yy,z)
            if last:
                self.rod(last,point,.19,'wood_dark')
                self.rod((last[0],last[1]-.08,z-.12),(point[0],point[1]-.08,z-.12),.052,'gold')
            self.box((point[0],(yy+y)/2,z+depth/2),(w/65+.03,yy-y,depth),'bark')
            last=point
        if ornate:
            for i in range(15):
                dx=(i-7)*w/17
                self.ellipsoid((x+dx,y+.3+math.sin(i*1.8)*.1,z-.28),(.24,.22,.08),'gold',n=10,rings=6)
            for j in [-1,0,1]:
                for i in range(8):
                    a=i*math.tau/8
                    self.ellipsoid((x+j*w*.26+math.cos(a)*.33,y+.75+math.sin(a)*.28,z-.29),(.18,.1,.055),'gold',n=8,rings=5)

    def wall(self,x,z,length,angle=0,height=3):
        self.box((x,.5,z),(length,1,1.35),'stone',angle=angle)
        self.box((x,1.2+height/2,z),(length,height,1.05),'plaster',angle=angle)
        # Roof strips rotated when wall runs north/south.
        sub=KyotoKit(); sub.hip_roof((0,1.2+height,0),length+1,2.5,.8)
        self.include(sub,(x,0,z),angle)

    def include(self,sub,origin=(0,0,0),angle=0):
        c,s=math.cos(angle),math.sin(angle)
        for (group,mat),(verts,faces) in sub.batches.items():
            self.mesh([(origin[0]+a*c+b*s,origin[1]+y,origin[2]-a*s+b*c) for a,y,b in verts],faces,mat,group)

    def hall(self,x,z,w,d,h=5,y=0,detail=False,bark=False,wallmaterial="plaster"):
        self.box((x,y+.35,z),(w+2,.7,d+2),'stone')
        self.box((x,y+1,z),(w+1,.5,d+1),'wood_dark')
        self.box((x,y+h*.55+.6,z),(w,h-.8,d),wallmaterial)
        self.box((x,y+1,z+d/2+.65),(w+2,.4,2),'wood')
        for i in range(int(w/2.2)+1):
            dx=-w/2+i*2.2
            self.box((x+dx,y+h/2+.7,z+d/2+.06),(.19,h-.2,.28),'wood')
            self.box((x+dx,y+h/2+.7,z-d/2-.06),(.19,h-.2,.28),'wood')
            if detail and i<int(w/2.2):
                self.box((x+dx+1,y+2.9,z+d/2+.08),(1.72,2.5,.14),'wood_dark')
                for j in range(6): self.box((x+dx+.25+j*.29,y+2.9,z+d/2+.2),(.055,2.5,.09),'wood')
        for side in [-1,1]:
            self.box((x,y+h-.1,z+side*d/2),(w+.4,.3,.45),'wood_dark')
            self.box((x,y+1.5,z+side*d/2),(w+.4,.18,.2),'wood')
        self.hip_roof((x,y+h+.35,z),w+4,d+4,min(d*.29,5.5),'bark' if bark else 'roof',detail)

    def pine(self,x,z,h=12,y=0,seed=0):
        rng=random.Random(seed+int(x*93+z*133))
        self.rod((x,y,z),(x+.7,y+h*.85,z+.3),.22,'wood',n=9)
        for j in range(9):
            a=rng.random()*math.tau; r=rng.uniform(1,3.4); py=y+h*(.55+.045*j)
            px=x+math.cos(a)*r; pz=z+math.sin(a)*r
            self.rod((x+.3,y+h*.52,z),(px,py,pz),.09,'wood')
            for i in range(6):
                self.ellipsoid((px+rng.uniform(-1,1),py+rng.uniform(-.35,.35),pz+rng.uniform(-1,1)),(1.1,.5,1.15),rng.choice(['foliage','leaf_light']),n=9,rings=5)

    def cedar(self,x,z,h=15,y=0):
        rng=random.Random(round(x*87+z*23))
        self.cylinder((x,y+h*.43,z),.24,h*.86,'wood',n=8)
        for j in range(9):
            py=y+h*(.28+j*.075); radius=h*.19*(1-j*.09)
            for branch in range(5):
                a=branch*math.tau/5+j*.9+rng.uniform(-.2,.2)
                px=x+math.cos(a)*radius; pz=z+math.sin(a)*radius
                self.rod((x,py+.2,z),(px,py-.3,pz),.035,'wood',n=5)
                for t in [.5,.85,1.1]:
                    self.ellipsoid((x+(px-x)*t,py+rng.uniform(-.3,.2),z+(pz-z)*t),(radius*.48,.5,radius*.42),rng.choice(['cedar','foliage']),n=7,rings=4)

    def person(self,x,z,y=0,cloth='indigo',yaw=0):
        sub=KyotoKit()
        sub.ellipsoid((0,1.53,0),(.105,.13,.10),'skin',n=12)
        sub.ellipsoid((0,1.63,.025),(.108,.07,.105),'wood_dark',n=10)
        sub.cylinder((0,.86,0),.24,1.12,cloth,top=.18,n=12)
        sub.box((0,1.06,0),(.45,.13,.39),'wood_dark')
        for side in [-1,1]:
            sub.rod((side*.15,1.32,0),(side*.28,.86,-.05),.105,cloth)
            sub.rod((side*.28,.86,-.05),(side*.19,.79,-.15),.04,'skin')
            sub.box((side*.11,.055,-.03),(.15,.1,.29),'basket')
        self.include(sub,(x,y,z),yaw)
