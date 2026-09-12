"""Dedicated Rome overview authoring; never writes POI renders or the shared manifest.

Blender --background --python blender/scripts/render_rome_overview_detail.py -- --preview
Blender --background --python blender/scripts/render_rome_overview_detail.py
python3 blender/scripts/package_rome_overview_detail.py

Shared kit/render functions are consumed read-only. All overview geometry is editable
in overview.blend; final PNGs/metadata stage in renders/overview-detail/ for integration.
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
sys.path.insert(0,str(Path(__file__).parent/'lib'))
from rome_kit import Kit, PALETTE, forum, pantheon, colosseum
from render_rome import forum_detail, tree, environment, camera, MARKERS
from rome_render_detail import author_materials, noise, ramp, mix
OUT=ROOT/'blender/source/rome-125/renders/overview-detail'
PALETTE.update({
    'ov_ochre':'#b7976d','ov_lime':'#d3c6a5','ov_sand':'#bfb092',
    'ov_warm':'#bd9c79','ov_brick':'#ad8164','ov_weathered':'#a79e89',
    'ov_roof_umber':'#6d4936','ov_roof_red':'#934e35','ov_roof_russet':'#a66443',
    'ov_roof_ochre':'#9c7656','ov_roof_clay':'#ae7450','ov_roof_pale':'#bc8d64',
    'ov_cornice':'#b9a48a','ov_terrace':'#b1a288','ov_window':'#3f3a31',
    'ov_court':'#a7997b','ov_garden':'#596146','ov_lane':'#a29479',
    'ov_water':'#4b6b61','ov_leaf_dark':'#354733','ov_leaf_mid':'#596346',
    'ov_leaf_silver':'#7c805c','ov_reed':'#7d7a4f','ov_bank':'#7d7856',
})


class OverviewKit(Kit):
    """Aerial windows are flush planes; hidden box sides add no visible detail."""
    def box(self, p, size, material='marble', group=None, angle=0):
        if material != 'ov_window':
            return super().box(p, size, material, group, angle)
        x, y, z = p
        w, h, d = (value / 2 for value in size)
        if w < d:
            points = [(x,y-h,z-d),(x,y+h,z-d),(x,y+h,z+d),(x,y-h,z+d)]
        else:
            points = [(x-w,y-h,z),(x-w,y+h,z),(x+w,y+h,z),(x+w,y-h,z)]
        self.mesh(points, [(0,1,2,3)], material, group)


def hip_roof(k,p,w,d,rise,mat):
    x,y,z=p
    # Hipped roof leaves a long ridge and returns at each end.
    run=min(w*.36,d*.2)
    verts=[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x,y+rise,z-d/2+run),(x,y+rise,z+d/2-run)]
    k.mesh(verts,[(0,4,1),(1,4,5,2),(2,5,3),(3,5,4,0)],mat)
    k.box((x,y+rise+.12,z),(.38,.3,max(.2,d-2*run)),mat)


def small_tree(k,x,z,y,h,rng):
    k.rod((x,y,z),(x+.12,y+h*.8,z),.24,'wood',n=6)
    for i in range(3):
        angle=i*math.tau/3+rng.random(); r=rng.uniform(.5,2)
        k.ellipsoid((x+math.cos(angle)*r,y+h*.77+rng.uniform(-.5,1),z+math.sin(angle)*r),
                    (h*.25,h*.20,h*.26),rng.choice(['ov_leaf_dark','ov_leaf_mid','ov_leaf_silver']),n=6,rings=4)


def grove(k,x,z,w,d,count,rng,hill):
    k.box((x,hill(x,z)-.15,z),(w*2,.2,d*2),'ov_garden')
    for _ in range(count):
        px=x+rng.uniform(-w,w); pz=z+rng.uniform(-d,d)
        small_tree(k,px,pz,hill(px,pz),rng.uniform(8,16),rng)


def river_detail(k,hill,rng):
    # Both banks use irregular planted edges and intermittent Roman stone quays;
    # no modern concrete river walls. Keep the inherited channel and bridge sites.
    for side in [-1,1]:
        strip=[]
        for i in range(151):
            z=-3000+i*40; x=-1070+190*math.sin(z/740)
            strip.extend([(x+side*85,.10,z),(x+side*(108+4*math.sin(z/70)),.18,z)])
            if i%2==0:
                small_tree(k,x+side*rng.uniform(101,117),z,0,rng.uniform(11,19),rng)
            if i%3==0:
                k.box((x+side*90,1.1,z),(6,2.2,26),'shadow_stone',angle=-math.atan(190/740*math.cos(z/740)))
            if i%4==0:
                for j in range(3):
                    k.ellipsoid((x+side*rng.uniform(85,103),.7,z+rng.uniform(-15,15)),(2.5,1.1,4),'ov_reed',n=8,rings=4)
        k.mesh(strip,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(150)],'ov_bank')
    for z in [-650,80,640]:
        x=-1070+190*math.sin(z/740)
        k.box((x,7,z),(188,2.2,15),'travertine')
        for side in [-1,1]: k.box((x,8.45,z+side*7),(188,1.2,.9),'marble')
        for dx in [-68,-34,0,34,68]:
            k.box((x+dx,2.2,z),(6,6,15),'shadow_stone')
            # Voussoirs describe the openings beneath the continuous bridge deck.
            for i in range(11):
                a=i*math.pi/10
                k.box((x+dx+16*math.cos(a),2.2+3.5*math.sin(a),z),(3.8,1.4,15),'travertine',angle=0)
    # Small low cargo craft with oars: overview-scale life cues, not a ship fleet.
    for z in [-900,-470,-160,280,570,840]:
        x=-1070+190*math.sin(z/740)+rng.uniform(-45,45)
        k.ellipsoid((x,.25,z),(3,.6,11),'wood',n=10,rings=5)
        k.box((x,.7,z),(4,.25,14),'ov_court')
        for dz in [-3,0,3]: k.box((x,1.15,z+dz),(3,1,2),'ov_roof_umber')


def landmark_finish(k,hill,rng):
    # Explicit civic pavements, portico rhythms and planted terraces articulate
    # the existing monumental footprints without moving any POI anchor.
    for x,z,w,d in [(0,0,173,220),(-590,-300,129,213),(185,340,435,80)]:
        k.box((x,.005,z),(w,.012,d),'paving_light')
        for dx in range(int(-w/2),int(w/2),12):
            k.box((x+dx,.03,z),(.32,.045,d),'paving_dark')
        for dz in range(int(-d/2),int(d/2),12):
            k.box((x,.03,z+dz),(w,.045,.32),'paving_dark')
    # Dome ribs and lower stepped annuli improve the Pantheon's aerial silhouette.
    for i in range(5):
        y=21.7+i*1.1; rad=22.7-i*.28
        for j in range(64):
            a=j*math.tau/64
            k.box((-590+rad*math.cos(a),y,-280+rad*math.sin(a)),(2.5,.45,1),'shadow_stone',angle=math.pi/2-a)
    k.cylinder((-590,42.98,-280),2.5,.12,'dark',n=32)
    # Monument precincts retain bare approaches while surrounding slopes receive
    # dense irregular canopies and cypress silhouettes instead of smooth discs.
    for cx,cz,rx,rz in [(-170,350,190,195),(350,770,288,205),(750,-300,215,225)]:
        for i in range(180):
            a=rng.random()*math.tau; r=rng.uniform(.65,1.12)
            x=cx+math.cos(a)*rx*r; z=cz+math.sin(a)*rz*r
            if abs(x-350)<179 and abs(z-715)<137: continue
            if abs(x+150)<103 and abs(z-330)<109: continue
            small_tree(k,x,z,hill(x,z),rng.uniform(9,20),rng)
    # Palatine rear court garden, long arcaded terraces and slender perimeter trees.
    for x in [280,420]:
        for z in range(677,759,10):
            k.box((x,70,z),(2,12,2),'shadow_stone')
            k.box((x,77,z),(3,2,8),'travertine')
    for x in range(298,405,12):
        k.ellipsoid((x,72,785),(2.1,8,2.1),'ov_leaf_dark',n=8,rings=8)
    # Circus seating tier bands replace uninterrupted broad smooth sides.
    for side in [-1,1]:
        for tier in range(5):
            k.box((230,4+tier*2.2,1070+side*(57+tier*3)),(554,1.2,3.6),'travertine')
    k.box((230,2.3,1070),(516,.6,7),'paving_dark')
    for x in [-10,120,250,380,475]: k.cylinder((x,5,1070),1.4,5.5,'marble',n=10)

def overview_city(k):
    """Aerial-only city: articulated landmarks, varied courts, continuous distant fabric."""
    rng=random.Random(12506)
    k.box((0,-10,0),(26000,18,26000),'earth')
    def hill(x,z):
        return 47*math.exp(-((x+150)/195)**2-((z-330)/195)**2)+61*math.exp(-((x-360)/280)**2-((z-715)/225)**2)+35*math.exp(-((x-700)/340)**2-((z+350)/390)**2)
    # A continuous terrain mesh, with built-up slopes instead of isolated green discs.
    points=[(x,hill(x,z)-.6,z) for z in range(-3500,3501,70) for x in range(-3500,3501,70)]
    k.mesh(points,[(r*101+c,r*101+c+1,(r+1)*101+c+1,(r+1)*101+c) for r in range(100) for c in range(100)],'earth')
    river=[]
    for i in range(181):
        z=-7000+i*80; x=-1070+190*math.sin(z/740)
        river.extend([(x-85,.03,z),(x+85,.03,z)])
    k.mesh(river,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(180)],'water')
    # Ten independently articulated Roman housing/warehouse families, tightly
    # grouped along gently turning lanes. Dimensions remain in metres.
    for gx in range(-2900,3301,53):
        for gz in range(-3000,3301,55):
            x=gx+10*math.sin(gz/210)+3*math.sin(gz/71)
            z=gz+9*math.sin(gx/195)+3*math.sin(gx/89)
            x+=rng.uniform(-2,2); z+=rng.uniform(-2,2)
            river_x=-1070+190*math.sin(z/740)
            if abs(x-river_x)<111: continue
            if abs(x)<90 and abs(z)<117: continue
            if abs(x+590)<70 and abs(z+300)<111: continue
            if ((x-680)/133)**2+((z-630)/112)**2<1: continue
            if abs(x-230)<353 and abs(z-1070)<92: continue
            if abs(x+150)<99 and abs(z-330)<105: continue
            if abs(x-350)<178 and abs(z-715)<138: continue
            if abs(x-185)<238 and abs(z-340)<49: continue
            if abs(x-65)<73 and abs(z-180)<82: continue
            if rng.random()<.025:
                grove(k,x,z,21,15,7,rng,hill); continue
            base=hill(x,z); h=rng.choice([9,12,15,18,21,24]); family=rng.randrange(10)
            wall=rng.choice(['ov_ochre','ov_lime','ov_sand','ov_warm','ov_brick','ov_weathered'])
            roof=rng.choice(['ov_roof_umber','ov_roof_red','ov_roof_russet','ov_roof_ochre','ov_roof_clay','ov_roof_pale'])
            w=rng.uniform(38,46); d=rng.uniform(40,48)
            angle=.05*math.sin(gz/210)-.045*math.cos(gx/195)
            # Sub-pixel windows outside the main central crop are omitted; roof
            # families and continuous street/building massing remain everywhere.
            nearby=-1150<x<1300 and -850<z<1400
            def block(px,pz,bw,bd,bh,roofed=True):
                # Per-building alignment is deliberate: street walls are nearly
                # continuous and courtyards provide the principal open ground.
                k.box((px,base+bh/2,pz),(bw,bh,bd),wall)
                k.box((px,base+bh-.4,pz),(bw+.65,.55,bd+.65),'ov_cornice')
                if roofed:
                    hip_roof(k,(px,base+bh,pz),bw+.9,bd+.9,rng.uniform(2,3.8),roof)
                else:
                    k.box((px,base+bh+.12,pz),(bw,.24,bd),'ov_terrace')
                    for side in [-1,1]:
                        k.box((px+side*(bw/2-.25),base+bh+.5,pz),(.5,1,bd),wall)
                        k.box((px,base+bh+.5,pz+side*(bd/2-.25)),(bw,1,.5),wall)
                if nearby:
                    for level in range(1,max(2,int(bh/4))):
                        py=base+min(bh-2,level*3.8)
                        for side in [-1,1]:
                            for j in range(max(1,int(bw/5))):
                                xx=px-bw/2+2.7+j*5
                                if xx>px+bw/2-1: continue
                                k.box((xx,py,pz+side*(bd/2+.035)),(1.25,1.8,.10),'ov_window')
                                if j%3==0: k.box((xx+.72,py,pz+side*(bd/2+.10)),(.28,1.85,.14),'wood')
                            for j in range(max(1,int(bd/6))):
                                zz=pz-bd/2+3+j*6
                                if zz>pz+bd/2-1: continue
                                k.box((px+side*(bw/2+.035),py,zz),(.1,1.8,1.25),'ov_window')
                    if bw>12:
                        k.box((px,base+2,pz+bd/2+.055),(2.4,4,.16),'wood')
                if roofed and bw>13 and bd>13:
                    k.box((px,base+bh+1.4,pz+bd*.24),(2.6,2.8,2.4),wall)
                    k.box((px,base+bh+2.85,pz+bd*.24),(3.1,.3,2.9),'ov_cornice')
            if family in [0,1,2]:
                wing=rng.uniform(7,10)
                block(x-w/2+wing/2,z,wing,d,h)
                block(x+w/2-wing/2,z,wing,d,h+rng.choice([-2,0,2]))
                block(x,z-d/2+wing/2,w-2*wing,wing,h)
                block(x,z+d/2-wing/2,w-2*wing,wing,h-2)
                k.box((x,base+.04,z),(w-2*wing,.08,d-2*wing),'ov_court')
                if family==0:
                    k.box((x,base+.12,z),(7,.24,8),'ov_water')
                    for a,b in [(-6,-7),(6,7)]: small_tree(k,x+a,z+b,base,8,rng)
                if family==2:
                    for side in [-1,1]:
                        for dz in range(-9,10,6):
                            px=x+side*(w/2-wing-1)
                            k.box((px,base+3,z+dz),(.56,6,.56),'marble')
                            k.box((px,base+5.8,z+dz),(.85,.35,.85),'trim')
            elif family==3:
                # Closely packed shop-house ranges facing a small service lane.
                for off in [-1.5,-.5,.5,1.5]: block(x+off*10.5,z,10,d,h+rng.uniform(-3,3))
            elif family==4:
                block(x-w*.25,z,w*.5,d,h)
                block(x+w*.25,z-d*.24,w*.5,d*.51,h-4,False)
                k.box((x+w*.25,base+.1,z+d*.27),(w*.47,.2,d*.43),'ov_court')
                small_tree(k,x+w*.24,z+d*.25,base,9,rng)
            elif family==5:
                block(x,z-d*.25,w,d*.5,h)
                block(x-w*.33,z+d*.24,w*.33,d*.5,h-3)
                block(x+w*.33,z+d*.24,w*.33,d*.5,h-2)
                k.box((x,base+.1,z+d*.24),(w*.33,.2,d*.47),'ov_court')
            elif family==6:
                block(x,z,w,d,h,False)
                block(x-w*.22,z-d*.15,w*.35,d*.35,h+3)
            elif family==7:
                # Warehouse roofs with visible clerestory and loading court.
                for off in [-1,0,1]: block(x+off*14.5,z-3,13.5,d-7,h*.65)
                for off in [-1,1]: k.box((x+off*13,base+2,z+d/2-2),(5,4,4),'wood')
            elif family==8:
                block(x,z,w,d,h)
                block(x,z,w*.44,d*.72,h+3)
            else:
                # Lower domus with its peristyle garden and roofed entrance wing.
                for side in [-1,1]: block(x+side*(w/2-4),z,8,d,h*.6)
                block(x,z-d/2+4,w-16,8,h*.6)
                block(x,z+d/2-5,w-16,10,h*.75)
                k.box((x,base+.12,z),(w-16,.24,d-18),'ov_garden')
                for side in [-1,1]: small_tree(k,x+side*6,z,base,8,rng)
            # Narrow pale street ribbons define circulation below continuous roofs.
            if abs(x-river_x)>145 and nearby and family%3==0:
                k.box((x,base-.12,z+d/2+2),(w+3,.10,2.5),'ov_lane')
    def include(sub,origin,groups=None):
        for (group,mat),(verts,faces) in sub.batches.items():
            if mat=='earth' or groups is not None and group not in groups: continue
            k.mesh([(p[0]+origin[0],p[1]+origin[1],p[2]+origin[2]) for p in verts],faces,mat)
    f=Kit(); forum(f); forum_detail(f); include(f,(0,0,0))
    # The Column remains behind the Basilica Ulpia, correctly visible only aerially.
    k.cylinder((0,20,-91),1.8,34,'marble',n=24); k.box((0,2,-91),(7,4,7),'trim')
    p=Kit(); pantheon(p); include(p,(-590,0,-308),{'rome125_pantheon_granite_columns','rome125_pantheon_agrippa_inscription','rome125_pantheon_forecourt_colonnade'})
    k.cylinder((-590,11,-280),22,22,'shadow_stone',n=64); k.ellipsoid((-590,22,-280),(22.4,21,22.4),'travertine',n=64,rings=20)
    k.box((-590,16.6,-307),(36,1.5,24),'trim'); k.roof((-590,17.75,-307),37,25,5.4,'travertine')
    c=Kit(); colosseum(c); include(c,(505,0,630),{'rome125_colosseum_outer_arcade','rome125_meta_sudans','rome125_venus_roma_worksite'})
    # Inner seating rings frame an open arena instead of a hollow cylindrical wall.
    for tier in range(7):
        radius=78-tier*4
        for i in range(80):
            a=i*math.tau/80
            k.box((680+radius*math.cos(a),34-tier*4,630+(radius*.78)*math.sin(a)),(6.5,3.0,5),'travertine',angle=math.pi/2-a)
    k.box((680,.2,630),(75,.4,42),'paving')
    # Capitoline temple front, Forum temple axis, layered Palatine terraces.
    for x,z,w,d,h in [(-150,330,64,85,48),(185,340,100,35,4)]:
        k.box((x,h,z),(w+18,5,d+18),'travertine'); k.box((x,h+15,z),(w,26,d),'plaster_light'); k.roof((x,h+28,z),w+5,d+5,10)
        for px in range(int(x-w/2+5),int(x+w/2),8): k.column(px,z-d/2-2,24,1.15,y=h+2,detail=False)
    # Articulated Palatine courts, galleries and terraces replace a single roof block.
    for x,z,w,d,h in [(350,755,94,46,29),(277,715,38,124,22),(423,715,38,124,22),(350,666,108,20,18)]:
        k.box((x,64+h/2,z),(w,h,d),'plaster_light'); k.roof((x,64+h,z),w+3,d+3,5,'roof')
    k.box((350,64,717),(196,4,157),'travertine')
    k.box((350,66.2,715),(85,.4,54),'paving_light')
    for side in [-1,1]:
        for z in range(692,742,7): k.column(350+side*46,z,15,.8,y=66,detail=False)
    for z in [651,645,639]: k.box((350,60+(z-639)*.4,z),(190,2,7),'marble')
    # Vegetated slopes and grove clusters make the three topographic rises legible.
    for cx,cz,rx,rz in [(-150,350,185,195),(355,785,300,205),(750,-300,220,220)]:
        vertices=[]
        for ring in range(13):
            r=ring/12
            for i in range(48):
                angle=i*math.tau/48; x=cx+math.cos(angle)*rx*r; z=cz+math.sin(angle)*rz*r
                vertices.append((x,hill(x,z)+.6,z))
        k.mesh(vertices,[(ring*48+i,ring*48+(i+1)%48,(ring+1)*48+(i+1)%48,(ring+1)*48+i) for ring in range(12) for i in range(48)],'grass')
        for i in range(65):
            angle=rng.random()*math.tau; r=rng.uniform(.65,1.08); x=cx+math.cos(angle)*rx*r; z=cz+math.sin(angle)*rz*r
            tree(k,x,z,rng.uniform(10,18),hill(x,z))
    for x,z in [(95,180),(160,160),(-100,520),(80,490)]:
        k.box((x,2,z),(40,4,55),'marble'); k.box((x,12,z),(27,20,38),'travertine'); k.roof((x,22,z),32,44,7)
        for dx in [-12,-6,0,6,12]: k.column(x+dx,z-24,18,.9,y=2,detail=False)
    k.box((230,.2,1070),(600,.4,130),'paving')
    for side in [-1,1]:
        k.box((230,8,1070+side*65),(560,16,22),'travertine')
        for x in range(-30,501,12): k.box((x,12,1070+side*66),(2,24,24),'trim')
    for side in [-1,1]:
        for i in range(30):
            a=-math.pi/2+i*math.pi/29
            x=230+side*(280+math.cos(a)*64); z=1070+math.sin(a)*64
            k.box((x,8,z),(9,16,18),'travertine',angle=-side*a)
    k.box((230,2,1070),(530,4,9),'grass')
    river_detail(k, hill, rng)
    landmark_finish(k, hill, rng)


def finish_materials():
    author_materials(ROOT/'blender/assets/rome-125/ai')
    for mat in bpy.data.materials:
        if not mat.name.startswith('ov_'): continue
        bs=mat.node_tree.nodes.get('Principled BSDF')
        if not bs: continue
        nt=mat.node_tree
        # Large-scale tonal mottling survives aerial downsampling; fine stone/tile
        # structure is kept to a subtle bump instead of noisy high-frequency color.
        rgb=mat.diffuse_color[:3]
        for link in list(bs.inputs['Base Color'].links): nt.links.remove(link)
        coord=nt.nodes.new('ShaderNodeTexCoord')
        macro=noise(nt,coord.outputs['Object'],.13,3)
        tint=ramp(nt,macro,tuple(c*.57 for c in rgb),tuple(c*1.22 for c in rgb))
        ao=nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value=2.7; ao.samples=8
        tint=mix(nt,tint,ao.outputs['Color'],.34,'MULTIPLY')
        nt.links.new(tint,bs.inputs['Base Color'])
        bs.inputs['Roughness'].default_value=.86
        if 'roof' in mat.name:
            wave=nt.nodes.new('ShaderNodeTexWave'); wave.wave_type='BANDS'; wave.bands_direction='X'
            wave.inputs['Scale'].default_value=2.8; wave.inputs['Distortion'].default_value=.2
            nt.links.new(coord.outputs['Object'],wave.inputs['Vector'])
            bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value=.065; bump.inputs['Strength'].default_value=.45
            nt.links.new(wave.outputs['Color'],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        if 'leaf' in mat.name: bs.inputs['Subsurface Weight'].default_value=.055
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH' and obj.data.materials and 'leaf' in obj.data.materials[0].name:
            for poly in obj.data.polygons: poly.use_smooth=True


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--preview',action='store_true'); parser.add_argument('--source-only',action='store_true'); parser.add_argument('--variant',choices=['desktop','mobile','both'],default='both'); parser.add_argument('--samples',type=int,default=56)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for mat in list(bpy.data.materials): bpy.data.materials.remove(mat)
    k=OverviewKit(); overview_city(k); k.export_objects(); finish_materials()
    scene=environment('overview'); scene.cycles.samples=16 if args.preview else args.samples
    scene.cycles.adaptive_threshold=.04 if args.preview else .018
    scene.view_settings.exposure=-.55
    # Directional late-morning light retains roof modeling and crisp lane shadows.
    for node in scene.world.node_tree.nodes:
        if node.type=='TEX_SKY': node.sun_elevation=math.radians(33); node.aerosol_density=1.3
    for mat in bpy.data.materials:
        if mat.name=='Aerial haze':
            mat.node_tree.nodes.get('Principled Volume').inputs['Density'].default_value=.000025
    OUT.mkdir(parents=True,exist_ok=True)
    cam=camera(scene,(-1450,1250,1650),(50,40,180))
    metadata={'scene':'overview','generator':'blender/scripts/render_rome_overview_detail.py','coordinates':'+X east, +Y up, +Z south; camera projections retained from the original delivery.','provenance':'Original authored 10-family Roman urban fabric, terrain, landmarks, vegetation and physical light. Generic stone and camera sky consume the existing offline appearance inputs; architecture is editable geometry. Interpretive, not a surveyed reconstruction.','markers':{key:{} for key in MARKERS},'cameras':{}}
    for variant,width,height in [('desktop',2560,1600),('mobile',1170,1800)]:
        cam.data.sensor_fit='HORIZONTAL'
        if variant=='desktop':
            cam.data.type='PERSP'; cam.data.lens=42; cam.location=(-1450,-1650,1250)
            cam.rotation_euler=(Vector((50,-180,40))-cam.location).to_track_quat('-Z','Y').to_euler()
        else:
            cam.data.type='ORTHO'; cam.data.lens=36; cam.data.ortho_scale=2250; cam.location=(1450,-1650,3300)
            cam.rotation_euler=(Vector((0,-180,0))-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.resolution_x=width//2 if args.preview else width; scene.render.resolution_y=height//2 if args.preview else height
        bpy.context.view_layer.update()
        metadata['cameras'][variant]={'eye':[cam.location.x,cam.location.z,-cam.location.y], 'target':[0,0,180] if variant=='mobile' else [50,40,180], 'projection':cam.data.type,'lensMm':cam.data.lens,'orthoScale':cam.data.ortho_scale if variant=='mobile' else None}
        for key,p in MARKERS.items():
            pos=world_to_camera_view(scene,cam,Vector((p[0],-p[2],p[1]))); metadata['markers'][key][variant]=[round(pos.x,6),round(1-pos.y,6)]
        if args.source_only or args.variant not in ['both',variant]: continue
        scene.render.filepath=str(OUT/f'overview-{variant}{"-preview" if args.preview else ""}.png')
        bpy.ops.render.render(write_still=True)
    (OUT/f'overview{"-preview" if args.preview else ""}.json').write_text(json.dumps(metadata,indent=2)+'\n')
    if not args.preview:
        cam.data.type='PERSP'; cam.data.lens=42; cam.location=(-1450,-1650,1250)
        cam.rotation_euler=(Vector((50,-180,40))-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.resolution_x=2560; scene.render.resolution_y=1600
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/source/rome-125/overview.blend'),compress=True)
    print(json.dumps(metadata))


if __name__=='__main__': main()
