"""Original offline Kyoto reconstruction. Blender --background --python ... -- --scene overview
Render Nijō and review it in-browser before authoring the ordered stretch scenes.
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
sys.path.insert(0,str(Path(__file__).parent/'lib'))
from kyoto_kit import KyotoKit
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'blender/source/kyoto-1700/renders'
EYES={'nijo-ninomaru':(0,1.65,0),'kiyomizu-hillside':(18,1.65,24),'nishiki-fish-market':(0,1.65,0)}
TARGETS={'nijo-ninomaru':(0,6,-24),'kiyomizu-hillside':(0,10,0),'nishiki-fish-market':(0,1.8,-18)}
ANCHORS={'nijo-ninomaru':{'nijo-karamon':(0,4.2,17),'nijo-ninomaru-palace':(-14,7,-26),'nijo-kurumayose':(4,4.8,-16)}}
ANCHORS['kiyomizu-hillside']={'kiyomizu-main-hall':(-4,22,-15),'kiyomizu-stage':(-4,8,6),'otowa-waterfall':(38,1.5,10.5)}
ANCHORS['nishiki-fish-market']={'nishiki-fish-stall':(0,1.03,-2.95),'nishiki-groundwater':(8.2,.7,-2.1),'nishiki-machiya-shopfront':(-8,3.7,-3.2)}
MARKERS={'nijo-ninomaru':(0,55,0),'kiyomizu-hillside':(3350,210,2150),'nishiki-fish-market':(1500,28,1000)}

def nijo(k):
    k.box((0,-.5,0),(1500,1,1500),'earth')
    k.box((0,.018,0),(76,.035,72),'gravel')
    # Tozamurai bay counts constrain the concept; metric sizes remain inferred.
    # The six-room sequence extends north-west, away from the controlled forecourt.
    for x,z,w,d in [(0,-30,34,25),(-13,-57,27,21),(-26,-80,31,24),(-38,-105,27,21),(-51,-126,24,20),(-60,-147,22,19)]:
        k.hall(x,z,w,d,5.2,detail=True)
    # Articulated upper irimoya massing above the entrance roof.
    k.box((0,8.9,-30),(10,1.6,10),'plaster')
    k.roof((0,9.7,-30),11,11,3.5,'roof')
    for sign in [-1,1]:
        k.rod((-5.5,9.7,-30+sign*5.5),(0,13.2,-30+sign*5.5),.14,'wood_dark')
        k.rod((0,13.2,-30+sign*5.5),(5.5,9.7,-30+sign*5.5),.14,'wood_dark')
    # Kurumayose: five bays wide × three deep; early-Edo core, inferred carving.
    k.group='kyoto1700_nijo_kurumayose'
    k.hall(4,-18,10.5,6.3,4.6,detail=True,bark=True)
    # Open porch eliminates the facade below the gable, visible ceremonial threshold.
    k.box((4,2.4,-14.78),(8.8,3.3,.12),'dark')
    for x in [-.3,2,6,8.3]:
        k.box((x,2.8,-14.1),(.3,4.1,.38),'lacquer')
        k.box((x,1,-14.1),(.45,.25,.48),'gold')
        k.box((x,4.5,-14.1),(.55,.34,.48),'gold')
    porch_gable=KyotoKit(); porch_gable.gable((0,4.8,0),11.3,2.1,ornate=True)
    k.include(porch_gable,(4,0,-13.9),math.pi)
    for x in range(-1,10): k.box((x,4.25,-14.25),(.7,.36,.12),'gold')
    k.group='scenery'
    # Kara-mon backs the full south view. Its decorations are original abstractions.
    k.group='kyoto1700_nijo_karamon'
    for x in [-4.5,4.5]:
        for z in [15.7,18.5]:
            k.box((x,2.5,z),(.48,5,.48),'lacquer')
            for y in [.6,4.2]: k.box((x,y,z),(.53,.3,.53),'gold')
    k.box((0,4.5,17.1),(10.7,.65,3.2),'lacquer')
    k.hip_roof((0,5,17.1),13,6.5,2.25,'bark',True)
    for z in [13.75,20.45]:
        k.gable((0,4.95,z),12.5,2.4,ornate=True)
    for x in [-2.3,2.3]:
        k.box((x,2.3,17.4),(4.5,4.1,.35),'wood_dark')
        for dx in [-1.7,0,1.7]:
            k.box((x+dx,2.3,17.18),(.11,4.1,.09),'gold')
        for y in [.55,3.2,4.1]: k.box((x,y,17.17),(4.5,.12,.1),'gold')
        for i in range(12):
            a=i*math.tau/12
            k.ellipsoid((x+.49*math.cos(a),2.55+.49*math.sin(a),17.13),(.16,.11,.06),'gold',n=10,rings=5)
    k.group='scenery'
    for x in [-23,23]: k.wall(x,18,32,height=2.3)
    k.wall(-40,-4,58,math.pi/2,height=2.5); k.wall(40,-4,58,math.pi/2,height=2.5)
    k.wall(0,66,150,height=2.5)
    for side in [-1,1]:
        for z in [-45,-10,32,65]: k.pine(side*48,z,12+(z%4))
        for z in [34,51]: k.hall(side*28,z,17,13,4)
        # Stone edge and narrow drainage flanking the packed earth approach.
        k.box((side*12,.04,1),(.5,.08,30),'stone')
        k.box((side*12.35,.015,1),(.18,.03,30),'dark')
    for x,z in [(-29,-16),(29,-9),(31,7)]: k.pine(x,z,11)
    gravel_rng=random.Random(17)
    for i in range(5500):
        x=gravel_rng.uniform(-37,37); z=gravel_rng.uniform(-13,17)
        r=gravel_rng.uniform(.008,.045)
        k.ellipsoid((x,.035,z),(r,r*.35,r*.7),gravel_rng.choice(['stone','gravel','earth']),n=5,rings=3)
    for x,z in [(-25,-4),(22,9),(-7,35)]: k.person(x,z,cloth='indigo')
    # Original Honmaru enclosure silhouette beyond the palace, no relocated palace.
    k.hall(-88,-110,31,27,7)
    rng=random.Random(1700)
    for i in range(55):
        a=i*math.tau/55; r=rng.uniform(170,240)
        k.pine(math.cos(a)*r,math.sin(a)*r,rng.uniform(12,20))

def overview(k):
    k.box((0,-30,0),(200000,40,200000),'grass')
    rng=random.Random(1700)
    def terrain(x,z):
        edge=max((x-3200)/3500,(-x-2400)/3200,(-z-2900)/3700,(z-4200)/3500,0)
        edge=min(edge,1)
        waves=1+.23*math.sin(x/510+z/870)+.18*math.sin(x/230-z/410)+.08*math.cos(x/105+z/180)
        return max(0,edge*edge*(3-2*edge)*950*waves)+160*math.exp(-((x-3370)/420)**2-((z-2145)/580)**2)
    # A continuous terrain mesh closes the basin; hills never float on a flat plane.
    points=[]; n=241
    for iz in range(n):
        for ix in range(n):
            x=-19000+ix*160; z=-19000+iz*160
            points.append((x,terrain(x,z)-.06,z))
    k.mesh(points,[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)],'foliage')
    k.box((650,-.45,350),(6650,.8,8150),'earth')
    # Kamo east of the grid. Banks are earthen; bridges have no modern infrastructure.
    pts=[]
    for i in range(181):
        z=-7600+i*85; x=2250+100*math.sin(z/1800)
        pts.extend([(x-67,1,z),(x+67,1,z)])
    k.mesh(pts,[(2*i,2*i+2,2*i+3,2*i+1) for i in range(180)],'water')
    for z in [-900,350,1500,2450]:
        x=2250+100*math.sin(z/1800)
        k.box((x,4,z),(160,3,11),'wood')
    # Eight reproducible building families with varied rooflines and footprints.
    for x in range(-2900,4101,39):
        for z in range(-3400,4001,47):
            if abs(x-(2250+100*math.sin(z/1800)))<90: continue
            if abs(x)<270 and abs(z)<260: continue
            if 800<x<1530 and -2040<z<-980: continue
            if x>3050 and z>1650: continue
            if x>3100 and rng.random()<.62: continue
            if (abs(x+100)>2700 or abs(z)>3300) and rng.random()<.38: continue
            if abs((x+8)%312)<16 or abs((z+10)%282)<15: continue
            if rng.random()<.08: continue
            family=rng.randrange(8); w=rng.uniform(25,35); d=rng.uniform(34,44); h=rng.uniform(4.1,8)
            k.box((x,h/2,z),(w,h,d),rng.choice(['plaster','plaster_old','wood']))
            k.hip_roof((x,h,z),w+2,d+2,h*.65,rng.choice(['roof','roof','roof_light','bark']))
            if family<2:
                k.box((x+w*.4,2.4,z+d*.3),(7,4.8,10),'plaster')
                k.hip_roof((x+w*.4,4.8,z+d*.3),9,12,2.3)
            elif family==2: k.hip_roof((x,3,z+d*.48),w+3,5,1.2,'bark')
    # Nijō's rectangular outer moat ~500 m site, original keep and Honmaru massing.
    k.box((0,.2,0),(550,.4,500),'water')
    k.box((0,1.2,0),(482,2.4,433),'grass')
    for side in [-1,1]:
        k.wall(0,side*215,484,height=5)
        k.wall(side*241,0,430,math.pi/2,height=5)
    k.box((-81,2,-36),(216,4,204),'water')
    k.box((-81,5,-36),(175,6,164),'grass')
    for side in [-1,1]:
        k.wall(-81,-36+side*82,175,height=4)
        k.wall(-81+side*87,-36,164,math.pi/2,height=4)
    k.hall(-80,-45,70,55,9,y=8)
    for j in range(5):
        w=38-j*4.8; y=11+j*6.5
        k.hall(-139,17,w,w*.8,5.7,y=y)
    for x,z,w,d in [(110,8,55,41),(85,-35,45,33),(60,-65,50,35),(35,-90,45,30),(17,-122,40,30),(0,-146,35,28)]: k.hall(x,z,w,d,7)
    # Conservative enclosure only: no modern imperial palace copied into 1700.
    for side in [-1,1]:
        k.wall(1170,-1500+side*410,600,height=4)
        k.wall(1170+side*300,-1500,820,math.pi/2,height=4)
    for x,z in [(1110,-1610),(1180,-1470),(1210,-1290)]: k.hall(x,z,78,49,8)
    # Eastern hillside and recognizable elevated temple silhouette.
    # The temple is on the continuous Higashiyama terrain, not a separate mound.
    k.hall(3350,2145,40,30,10,y=175,bark=True)
    k.box((3350,175,2175),(40,2,14),'wood')
    for x in range(3332,3369,6): k.box((x,166,2178),(1,18,1),'wood_dark')
    for i in range(2400):
        x=rng.uniform(-5000,5700); z=rng.uniform(-5700,6500)
        y=terrain(x,z)
        if y<20 and -2600<x<2800 and -3000<z<3200: continue
        h=rng.uniform(9,18)
        k.cylinder((x,y+h*.3,z),.45,h*.6,'wood',n=5)
        k.ellipsoid((x,y+h*.75,z),(h*.3,h*.35,h*.3),rng.choice(['foliage','cedar','leaf_light']),n=7,rings=4)
    for z in [-430,740,1950]:
        k.hall(2700,z,55,44,10)
        for j in range(4): k.hip_roof((2720,12+j*9,z+70),30-j*4,30-j*4,5)


def kiyomizu(k):
    # Lower hillside landing: fixed eye at [18,1.65,24]. North has the 1633 hall.
    def slope(x,z):
        base=max(-18,min(27,(-z+10)*.4 + (x-35)*.10))
        landing=math.exp(-((x-18)/25)**4-((z-24)/22)**4)
        return base*(1-landing)
    points=[]; n=111
    for j in range(n):
        for i in range(n):
            x=-420+i*8; z=-420+j*8
            y=slope(x,z)+.65*math.sin(x/14)*math.sin(z/17)
            points.append((x,y,z))
    k.mesh(points,[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)],'grass')
    k.box((18,-.38,24),(32,.75,23),'earth')
    # Main hall and an approximately 200 m² stage. 25×8m is an inferred aspect ratio.
    k.group='kyoto1700_kiyomizu_main_hall'
    k.hall(-4,-15,35,25,9,y=13,detail=True,bark=True,wallmaterial="wood_dark")
    for x in [-19,-13,-7,-1,5,11]:
        for z in [-23,-16,-9,-2]:
            base=slope(x,z); k.box((x,(base+13)/2,z),(.65,13-base,.65),'wood_dark')
    # The temple's eighteen pillars and penetrating rails support the 13m stage.
    k.group='kyoto1700_kiyomizu_stage'
    k.box((-4,13,3),(25,.5,8),'wood_dark')
    for i in range(72): k.box((-16.4+i*.35,13.30,3),(.32,.13,8),'wood')
    for x in [-15,-10.6,-6.2,-1.8,2.6,7]:
        for z in [0,3,6]:
            k.box((x,6.3,z),(.62,13.2,.62),'wood_dark')
            k.box((x,-.15,z),(1.2,.45,1.2),'stone')
        for y in [1.4,5,8.7,11.8]: k.box((x,y,3),(.34,.27,9),'wood')
    for z in [0,3,6]:
        for y in [1.4,5,8.7,11.8]: k.box((-4,y,z),(27,.3,.35),'wood')
    for x in range(-16,9,2):
        k.box((x,13.9,7),(.14,1.3,.14),'wood')
    for y in [13.6,14.45]: k.box((-4,y,7),(25,.16,.18),'wood')
    for side in [-1,1]:
        for z in [0,2,4,6]: k.box((-4+side*12.5,13.9,z),(.14,1.3,.14),'wood')
        k.box((-4+side*12.5,14.45,3),(.18,.16,8),'wood')
    k.person(-8,0,13.4,cloth='cloth'); k.person(4,1,13.4,cloth='indigo')
    # Water channel/shelter is an explicitly inferred setting, not modern copied fittings.
    k.group='kyoto1700_otowa_waterfall'
    k.box((38,-1.1,11),(10,1.3,7),'stone')
    k.box((38,-.38,11),(8,.05,5),'water')
    k.box((38,1.6,8),(11,4.8,1.6),'stone')
    for x in [34.7,38,41.3]:
        k.rod((x,3.6,8),(x,3.6,10.5),.13,'wood')
        k.cylinder((x,1.6,10.5),.045,4,'water',n=12)
    for x in [32,44]:
        for z in [7,14]: k.box((x,2.2,z),(.28,6.3,.28),'wood_dark')
    k.hip_roof((38,5.4,10.5),15,10,3.0,'bark',True)
    k.group='scenery'
    # Paths and terraces follow the slope, with no exposed terrain edge.
    for j in range(25):
        k.box((28+j*.22,(-2.4+j*.16)/2,18-j*.55),(4,1.6+j*.16,.7),'stone')
    for x,z,y in [(65,-45,15),(-62,-50,16),(-66,42,-5)]: k.hall(x,z,17,14,5,y=y,bark=True)
    rng=random.Random(1633)
    for i in range(230):
        x=rng.uniform(-160,190); z=rng.uniform(-165,175)
        if -32<x<26 and -42<z<48: continue
        if 25<x<51 and -2<z<31: continue
        y=slope(x,z)
        if i%3: k.cedar(x,z,rng.uniform(12,25),y)
        else: k.pine(x,z,rng.uniform(11,18),y)
    # Layers of lower Kyoto roofs provide the western vista through the trees.
    for x in range(-390,-159,24):
        for z in range(-20,240,27):
            k.hall(x,z,17,20,5,y=-20)
    k.person(23,30,cloth='cloth'); k.person(-20,22,cloth='indigo')
    # Complete distant basin/ridge ring, below the eye and closed in every direction.
    pts=[]; n=121
    for j in range(n):
        for i in range(n):
            x=-6000+i*100; z=-6000+j*100; r=math.hypot(x,z)
            rise=max(0,min(1,(r-900)/2500))
            y=-35+rise*340*(1+.22*math.sin(x/290)+.17*math.cos(z/370))
            pts.append((x,y,z))
    k.mesh(pts,[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)],'foliage')
    for i in range(240):
        a=i*math.tau/240; r=rng.uniform(280,550)
        k.pine(math.cos(a)*r,math.sin(a)*r,rng.uniform(12,22),-18)



def nishiki(k):
    k.box((0,-.5,0),(1800,1,1800),'earth')
    rng=random.Random(1615)
    def shop():
        house=KyotoKit()
        house.box((0,.2,0),(7.5,.4,10),'stone')
        house.box((0,2.4,-4.8),(7.3,4.6,.2),'plaster_old')
        for side in [-1,1]:
            house.box((side*3.6,2.4,0),(.22,4.6,10),'wood_dark')
            house.box((side*3.5,2.1,4.7),(.24,4.2,.3),'wood')
        house.box((0,.5,0),(7.2,.2,10),'wood')
        house.box((0,3.35,4.7),(7.4,.25,.34),'wood_dark')
        house.box((0,4.1,4.75),(7.2,1.3,.18),'plaster_old')
        for x in [-2.3,2.3]:
            house.box((x,4.1,4.84),(1.6,.9,.08),'dark')
            for j in range(7): house.box((x-.72+j*.24,4.1,4.94),(.055,.95,.06),'wood')
        for x in [-3.2,-2.8,-2.4]: house.box((x,1.95,4.82),(.11,2.6,.11),'wood')
        for x in [-3.4,3.4]: house.box((x,1.9,1),(.18,3,.18),'wood')
        house.hip_roof((0,4.8,0),9.3,12,3.1,'roof',True)
        house.hip_roof((0,3.5,4.4),8.4,2.8,.8,'bark',True)
        return house
    for side in [-1,1]:
        for x in range(-24,25,8):
            house=shop()
            if x%16: house.box((2,1.95,4.85),(2.7,2.7,.09),'wood')
            if x in [-16,16]: house.box((-1.6,2.7,5.25),(2.8,1.25,.035),'indigo')
            k.include(house,(x,0,side*8),0 if side==-1 else math.pi)
    # Side-facing end buildings close the lane beyond a short dogleg, with full roofs.
    for side in [-1,1]:
        for z in [-15,0,15]: k.include(shop(),(side*40,0,z),math.pi/2)
    def tub(x,z,r=.48,y=0):
        k.cylinder((x,y+.1,z),r,.16,'basket',n=24)
        for j in range(24):
            a=j*math.tau/24
            k.box((x+math.cos(a)*r,y+.4,z+math.sin(a)*r),(.10,.65,.055),'basket',angle=-a)
            for h in [.18,.6]:
                b=(j+1)*math.tau/24
                k.rod((x+math.cos(a)*r,y+h,z+math.sin(a)*r),(x+math.cos(b)*r,y+h,z+math.sin(b)*r),.025,'wood_dark',n=5)
        k.cylinder((x,y+.56,z),r*.89,.025,'water',n=24)
    def fish(x,z,y=1,angle=0):
        sub=KyotoKit(); sub.ellipsoid((0,y,0),(.28,.065,.085),'fish',n=14,rings=7)
        sub.ellipsoid((.03,y+.044,0),(.22,.025,.055),'fish_dark',n=12,rings=5)
        sub.mesh([(-.24,y,0),(-.4,y,-.12),(-.38,y,.12)],[(0,1,2)],'fish_dark')
        for sign in [-1,1]: sub.ellipsoid((.19,y+.023,sign*.053),(.017,.017,.01),'dark',n=7,rings=4)
        k.include(sub,(x,0,z),angle)
    # Hero stall lies directly north; identifiable separate groundwater point lies east.
    k.group='kyoto1700_nishiki_fish_stall'
    k.box((0,.86,-2.95),(4.3,.15,1.25),'wood')
    for x in [-1.8,1.8]:
        for z in [-3.35,-2.55]: k.box((x,.42,z),(.12,.84,.12),'wood_dark')
    for x in [-1.45,-.5,.5,1.45]:
        k.box((x,.96,-2.95),(.86,.08,.86),'basket')
        for j in range(3): fish(x,-3.2+j*.22,1.03,rng.uniform(-.18,.18))
    for x in [-2.7,2.8]: tub(x,-3.8)
    k.group='kyoto1700_nishiki_groundwater'
    # Low timber cistern is explicitly inferred, not a claimed surviving 1700 well.
    tub(8.2,-2.1,.86)
    for x in [7.3,9.1]: k.box((x,1.3,-2.1),(.15,2.6,.15),'wood_dark')
    k.box((8.2,2.5,-2.1),(2.1,.18,.2),'wood')
    k.rod((8.2,2.45,-2.1),(8.2,.8,-2.1),.018,'basket',n=6)
    tub(9.5,-1.9,.29)
    k.group='scenery'
    k.person(.4,-4.3,cloth='indigo',yaw=math.pi)
    for x,z in [(-11,-4.2),(17,1.2),(-22,-1.1),(29,2),(-30,1)]: k.person(x,z,cloth=rng.choice(['indigo','cloth']),yaw=rng.random()*math.tau)
    for side in [-1,1]:
        k.box((0,.024,side*2.35),(72,.047,.18),'dark')
        for x in range(-24,25,8):
            if side==-1 and x in [0,8]: continue
            tub(x+2,side*3.1,rng.uniform(.35,.6))
            k.box((x,.72,side*3.8),(3.3,.15,1.3),'wood')
            for leg in [-1.3,1.3]: k.box((x+leg,.35,side*3.8),(.14,.7,.14),'wood_dark')
            for j in range(5): fish(x-1+j*.48,side*3.8,.86,side*.15)
    for i in range(1800):
        x=rng.uniform(-34,34); z=rng.uniform(-2.2,2.2); r=rng.uniform(.01,.035)
        k.ellipsoid((x,.018,z),(r,r*.25,r*.75),'stone',n=5,rings=3)


def materials():
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        nt=mat.node_tree; bs=nt.nodes.get('Principled BSDF')
        if not bs: continue
        color=tuple(bs.inputs['Base Color'].default_value)
        coord=nt.nodes.new('ShaderNodeTexCoord')
        noise=nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=2.3; noise.inputs['Detail'].default_value=4
        nt.links.new(coord.outputs['Object'],noise.inputs['Vector'])
        ramp=nt.nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=tuple(v*.7 for v in color[:3])+(1,); ramp.color_ramp.elements[1].color=tuple(min(v*1.23,1) for v in color[:3])+(1,)
        nt.links.new(noise.outputs['Fac'],ramp.inputs[0]); nt.links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
        fine=nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value=85; fine.inputs['Detail'].default_value=3
        nt.links.new(coord.outputs['Object'],fine.inputs['Vector'])
        bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.32; bump.inputs['Distance'].default_value=.023
        nt.links.new(fine.outputs['Fac'],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        bs.inputs['Roughness'].default_value=.78
        if 'wood' in mat.name or mat.name=='bark':
            mapping=nt.nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=(2,2,.075)
            nt.links.new(coord.outputs['Object'],mapping.inputs[0]); nt.links.new(mapping.outputs[0],fine.inputs['Vector']); bump.inputs['Distance'].default_value=.014
        if mat.name in ['roof','roof_light']:
            bs.inputs['Roughness'].default_value=.52; bump.inputs['Distance'].default_value=.006
        if mat.name=='fish': bs.inputs['Metallic'].default_value=.4; bs.inputs['Roughness'].default_value=.35
        if mat.name=='gold': bs.inputs['Metallic'].default_value=.72; bs.inputs['Roughness'].default_value=.34
        if mat.name=='water': bs.inputs['Metallic'].default_value=.35; bs.inputs['Roughness'].default_value=.16; fine.inputs['Scale'].default_value=5
        if mat.name in ['foliage','leaf_light','cedar']: fine.inputs['Scale'].default_value=8; bump.inputs['Distance'].default_value=.09


def environment(name,samples):
    scene=bpy.context.scene; world=bpy.data.worlds.new('Kyoto early autumn morning'); world.use_nodes=True; scene.world=world
    nt=world.node_tree; nt.nodes.clear(); out=nt.nodes.new('ShaderNodeOutputWorld'); bg=nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value=.18
    sky=nt.nodes.new('ShaderNodeTexSky'); sky.sky_type='MULTIPLE_SCATTERING'; sky.sun_elevation=math.radians(32); sky.sun_rotation=math.radians(115); sky.sun_size=math.radians(.9); sky.altitude=.05; sky.air_density=1.1; sky.aerosol_density=1.7
    nt.links.new(sky.outputs['Color'],bg.inputs['Color']); nt.links.new(bg.outputs[0],out.inputs[0])
    if name=='overview':
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,900))
        haze=bpy.context.object; haze.name='Basin atmospheric perspective'; haze.scale=(50000,50000,2400)
        fog=bpy.data.materials.new('Mountain haze'); fog.use_nodes=True; fn=fog.node_tree; fn.nodes.clear()
        fo=fn.nodes.new('ShaderNodeOutputMaterial'); volume=fn.nodes.new('ShaderNodeVolumePrincipled')
        volume.inputs['Density'].default_value=.000012; volume.inputs['Color'].default_value=(.58,.69,.76,1); volume.inputs['Anisotropy'].default_value=.3
        fn.links.new(volume.outputs['Volume'],fo.inputs['Volume']); haze.data.materials.append(fog)
    if name=='nishiki-fish-market':
        # Broad, invisible diffuse bounce fill: no represented fixtures or emitted signs.
        for z in [-4,4]:
            bpy.ops.object.light_add(type='AREA',location=(0,-z,3.1))
            light=bpy.context.object; light.data.energy=130; light.data.shape='RECTANGLE'; light.data.size=24; light.data.size_y=2; light.data.color=(.78,.85,1)
    scene.render.engine='CYCLES'; scene.cycles.samples=samples; scene.cycles.use_denoising=True; scene.cycles.adaptive_threshold=.03; scene.cycles.max_bounces=5
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type='METAL'; prefs.get_devices()
        for d in prefs.devices: d.use=d.type=='METAL'
        scene.cycles.device='GPU'
        if hasattr(scene.cycles,'denoising_use_gpu'): scene.cycles.denoising_use_gpu=True
    except Exception: scene.cycles.device='CPU'
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.view_settings.exposure=-.3
    for obj in scene.objects:
        if obj.type!='MESH': continue
        mat=obj.data.materials[0].name
        if mat in ['foliage','leaf_light','cedar','skin','fish']:
            for p in obj.data.polygons: p.use_smooth=True
        if name!='overview' and mat in ['wood','wood_dark','wood_light','stone','lacquer']:
            bevel=obj.modifiers.new('Offline softened edges','BEVEL'); bevel.width=.018; bevel.segments=2
    return scene


def camera(scene,eye,target):
    bpy.ops.object.camera_add(location=(eye[0],-eye[2],eye[1])); cam=bpy.context.object; cam.name='Kyoto delivery camera'
    cam.rotation_euler=(Vector((target[0],-target[2],target[1]))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.clip_end=50000; scene.camera=cam
    return cam


def render(name,preview=False):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    k=KyotoKit(); {'overview':overview,'nijo-ninomaru':nijo,'kiyomizu-hillside':kiyomizu,'nishiki-fish-market':nishiki}[name](k)
    k.export_objects(); materials(); scene=environment(name,12 if preview else 36); OUT.mkdir(parents=True,exist_ok=True)
    meta={'scene':name,'coordinates':'+X east, +Y up, +Z south; metres. Panorama center north, positive yaw west, positive pitch up, radians.','provenance':'Original procedural mesh, shader, vegetation, figures; no copied photos, textures or models. Inferred architectural reconstruction.'}
    suffix='-preview' if preview else ''
    if name=='overview':
        eye=(-2800,2200,3800); target=(1400,100,700); cam=camera(scene,eye,target); cam.data.type='PERSP'
        meta['markers']={key:{} for key in MARKERS}
        for variant,w,h,lens in [('desktop',2560,1600,35),('mobile',1170,1800,23)]:
            scene.render.resolution_x=w//2 if preview else w; scene.render.resolution_y=h//2 if preview else h; cam.data.lens=lens; cam.data.sensor_fit='HORIZONTAL'; bpy.context.view_layer.update()
            for key,p in MARKERS.items():
                pos=world_to_camera_view(scene,cam,Vector((p[0],-p[2],p[1]))); meta['markers'][key][variant]=[round(pos.x,6),round(1-pos.y,6)]
            scene.render.filepath=str(OUT/f'overview-{variant}{suffix}.png'); bpy.ops.render.render(write_still=True)
        meta['eye']=eye; meta['initialTarget']=target
    else:
        eye=EYES[name]; cam=camera(scene,eye,(eye[0],eye[1],eye[2]-1)); cam.data.type='PANO'; cam.data.panorama_type='EQUIRECTANGULAR'
        scene.render.resolution_x=2048 if preview else 4096; scene.render.resolution_y=1024 if preview else 2048
        meta['eye']=eye; meta['initialTarget']=TARGETS[name]; meta['hotspots']=[]
        for obj,p in ANCHORS[name].items():
            dx,dy,dz=[p[i]-eye[i] for i in range(3)]
            meta['hotspots'].append({'objectId':obj,'yaw':round(math.atan2(-dx,-dz),7),'pitch':round(math.atan2(dy,math.hypot(dx,dz)),7),'anchor':p})
            anchor_name='kyoto1700_'+obj.replace('-','_')
            existing=bpy.data.objects.get(anchor_name)
            if existing: existing.name='geometry_'+anchor_name
            anchor=bpy.data.objects.new(anchor_name,None); bpy.context.collection.objects.link(anchor); anchor.location=(p[0],-p[2],p[1])
        scene.render.filepath=str(OUT/f'{name}-360{suffix}.png'); bpy.ops.render.render(write_still=True)
    (OUT/f'{name}{suffix}.json').write_text(json.dumps(meta,indent=2)+'\n')
    if not preview:
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT.parent/f'{name}.blend'),compress=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--scene',choices=['overview','nijo-ninomaru','kiyomizu-hillside','nishiki-fish-market'],required=True); parser.add_argument('--preview',action='store_true')
    opts=parser.parse_args(sys.argv[sys.argv.index('--')+1:]); render(opts.scene,opts.preview)
