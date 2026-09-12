"""Offline, original Rome image authoring. Does not export or modify runtime GLBs.
Blender --background --python blender/scripts/render_rome.py -- --scene all
Then: python3 blender/scripts/package_rome_renders.py
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / 'lib'))
from rome_kit import Kit, PALETTE, forum, pantheon, colosseum
from rome_render_detail import author_materials, camera_sky, RenderKit, sculpted_tree, window_frame

OUT = ROOT / 'blender/source/rome-125/renders'
AI_ASSETS = ROOT / 'blender/assets/rome-125/ai'
EYES = {'forum-trajan': (0, 1.65, 30), 'pantheon-forecourt': (0, 1.65, -42), 'colosseum-valley': (0, 1.65, 0)}
TARGETS = {'forum-trajan': (0, 12, -40), 'pantheon-forecourt': (0, 13, 0), 'colosseum-valley': (80, 18, 0)}
ANCHORS = {
    'forum-trajan': {'trajan-equestrian-statue': (0, 5.6, 0), 'basilica-ulpia-facade': (-24, 17, -42.5), 'dacian-prisoner-statue': (42, 3.7, -9)},
    'pantheon-forecourt': {'pantheon-agrippa-inscription': (0, 16.8, -11.1), 'pantheon-granite-columns': (-10.5, 8, -7.8), 'pantheon-forecourt-colonnade': (26, 7.5, -41)},
    'colosseum-valley': {'colosseum-outer-arcade': (81, 21, 0), 'meta-sudans': (16, 8, 36), 'venus-roma-worksite': (-55, 6, -13)},
}
MARKERS = {'forum-trajan': (0, 42, 0), 'pantheon-forecourt': (-590, 52, -300), 'colosseum-valley': (680, 68, 630)}

PALETTE.update({'skin': '#ad7952', 'skin_light': '#c99776', 'cloth_cream': '#d9cdb1', 'cloth_rust': '#9e5341', 'cloth_blue': '#52666b', 'cloth_ochre': '#bb914f', 'hair': '#42342b', 'brick': '#b28165', 'leaf_light': '#72805a', 'rope': '#af9570', 'arcade_interior':'#78644e'})


def human(k, x, z, yaw=0, cloth='cloth_cream', height=1.7, y=0):
    """Small original sculpted civic figures, scaled in metres; no animation or NPCs."""
    q = height / 1.7
    def p(a,b,c): return (x + q*(a*math.cos(yaw)+c*math.sin(yaw)), y+q*b, z+q*(-a*math.sin(yaw)+c*math.cos(yaw)))
    skin = 'skin_light' if int(abs(x*7+z))%3 else 'skin'
    k.ellipsoid(p(0,1.5,0),(.115*q,.15*q,.115*q),skin,n=12)
    k.ellipsoid(p(0,1.59,.012),(.119*q,.076*q,.116*q),'hair',n=12)
    k.cylinder(p(0,1.035,0),.25*q,.69*q,cloth,top=.19*q,n=14)
    k.rod(p(-.13,.77,0),p(-.14,.1,-.1),.07*q,skin)
    k.rod(p(.13,.77,0),p(.14,.1,.1),.07*q,skin)
    for side in [-1,1]:
        k.rod(p(side*.18,1.3,0),p(side*.29,.96,-.02),.065*q,cloth)
        k.rod(p(side*.29,.96,-.02),p(side*.24,.75,-.12),.045*q,skin)
        k.ellipsoid(p(side*.14,.065,side*.1-.065),(.085*q,.045*q,.15*q),'wood',n=10)
    if cloth=='cloth_cream':
        k.rod(p(-.15,1.3,.15),p(.16,.77,.19),.12*q,cloth,n=12)


def cart(k,x,z):
    k.box((x,.75,z),(2.2,.16,1.4),'wood')
    for dz in [-.75,.75]:
        k.box((x,1.06,z+dz),(2.3,.6,.09),'wood')
        for i in range(12):
            a=i*math.tau/12
            k.rod((x,.52,z+dz),(x+.49*math.cos(a),.52+.49*math.sin(a),z+dz),.033,'wood')
            b=(i+1)*math.tau/12
            k.rod((x+.49*math.cos(a),.52+.49*math.sin(a),z+dz),(x+.49*math.cos(b),.52+.49*math.sin(b),z+dz),.055,'wood')
    for dz in [-.45,.45]: k.rod((x+.8,.62,z+dz),(x+3,.58,z+dz),.065,'wood')


def tree(k,x,z,h=13,y=0):
    rng=random.Random(round(x*10+z*11))
    k.rod((x,y,z),(x+.3,y+h*.8,z),.24,'wood',n=10)
    for i in range(11):
        a=rng.random()*math.tau; r=rng.random()*2.7
        px=x+math.cos(a)*r; pz=z+math.sin(a)*r
        py=y+h*.76+rng.random()*h*.15
        k.rod((x,y+h*.6,z),(px,py,pz),.10,'wood')
        k.ellipsoid((px,py,pz),(1.8,h*.15,1.8),rng.choice(['foliage','leaf_light']),n=16,rings=10)


def forum_detail(k):
    rng=random.Random(301)
    # Longitudinal basilica roofs: ridge runs along X, not across its 116 m facade.
    group='rome125_basilica_ulpia_facade'
    for material,w,d,y,rise in [('roof',122,32,26.3,4),('roof_light',93,17,32.5,3)]:
        verts,faces=k.batches[(group,material)]
        verts[:]=[(-w/2,y,-59-d/2),(-w/2,y,-59+d/2),(-w/2,y+rise,-59),(w/2,y,-59-d/2),(w/2,y,-59+d/2),(w/2,y+rise,-59)]
    # Render-only modelling refines the inherited equestrian silhouette.
    statue='rome125_trajan_equestrian_statue'
    for x in [-1.25,1.15]: k.ellipsoid((x,5.35,0),(.77,.85,.74),'bronze',statue,n=24,rings=16)
    k.ellipsoid((1.5,5.7,0),(.47,.72,.58),'bronze',statue,n=24,rings=16)
    k.ellipsoid((2.58,6.54,0),(.54,.18,.31),'bronze_dark',statue,n=20,rings=12)
    for x,z in [(-1.4,-.4),(-1.4,.4),(1.2,-.4),(1.2,.4)]:
        k.ellipsoid((x,4.75,z),(.26,.46,.22),'bronze',statue,n=16)
        k.ellipsoid((x-.1,4.02,z),(.16,.19,.16),'bronze',statue,n=16)
        k.box((x-.18,3.33,z),(.35,.2,.28),'bronze_dark',statue)
    for i in range(10):
        t=i/9
        k.ellipsoid((1.3+.65*t,5.8+1.03*t,.02),(.14,.21,.5*(1-t)+.16),'bronze_dark',statue,n=12)
    for z in [-.31,.31]: k.ellipsoid((2.46,6.81,z),(.045,.045,.027),'bronze_dark',statue,n=12)
    for a,b,r in [((-1.8,5.5,0),(-2.38,5.13,0),.22),((-2.38,5.13,0),(-2.6,4.38,.1),.18),((-2.6,4.38,.1),(-2.42,3.98,.2),.13)]: k.rod(a,b,r,'bronze_dark',statue,n=14)
    k.mesh([(-.53,6.85,.18),(-.67,6.82,-.12),(-1.24,5.61,-.12),(-1.0,5.45,.36),(-.34,5.8,.44)],[(0,1,2,3,4)],'bronze_dark',statue)
    k.ellipsoid((-.01,7.45,-.01),(.30,.28,.27),'bronze',statue,n=20,rings=12)
    # Projecting dentils and shallow decorative shields catch grazing sunlight.
    for x in range(-56,57):
        k.box((x,12.95,-42.5),(.32,.33,.62),'trim')
        k.box((x,25.35,-43),(.38,.38,.68),'trim')
    for x in range(-51,52,6):
        k.ellipsoid((x,14.45,-42.95),(.61,.72,.15),'bronze',n=16)
        k.box((x,18.5,-44.1),(2.8,3.8,.25),'shadow_stone')
    for side in [-1,1]:
        for z in range(-40,44,2):
            k.box((side*44,10.45,z),(.48,.36,.33),'trim')
            k.box((side*44,19.92,z),(.5,.38,.36),'trim')
        for z in range(-36,41,7):
            k.box((side*57,2.4,z),(.12,4.1,3.6),'porphyry')
            k.box((side*57,9.1,z),(.2,.3,4.2),'trim')
            # Visible coffered soffit between exterior columns and back wall.
            for dx in [48,52,56]:
                k.box((side*dx,9.45,z),(2.7,.13,3.8),'shadow_stone')
                k.box((side*dx,9.37,z),(2.35,.1,3.45),'plaster_light')
    for x in range(-48,49,8):
        k.box((x,12.52,45),(3.2,.42,3.0),'trim')
    # Ordinary morning population, each figure at least 8 m from the fixed eye.
    for i in range(36):
        x=rng.uniform(-38,38); z=rng.uniform(-31,35)
        if math.hypot(x,z-30)<9 or math.hypot(x,z)<7: continue
        human(k,x,z,rng.random()*math.tau,rng.choice(['cloth_cream','cloth_cream','cloth_rust','cloth_blue','cloth_ochre']),rng.uniform(1.5,1.8))
    for side in [-1,1]:
        for z in [-70,70]: sculpted_tree(k,side*67,z,14)
    for i in range(7):
        x=(i-3)*17.1
        window_frame(k,x,-43.55,6,3.2,8,False)
        for side in [-1,1]: k.box((x+side*.80,6,-43.54),(1.5,7.8,.10),'wood')
        for y in [2.9,6,9.2]: k.box((x,y,-43.42),(3.15,.16,.15),'bronze_dark')
    for x in range(-40,41,8): window_frame(k,x,-52.25,29,3,3,False)
    for side in [-1,1]:
        for z in [-25,3,24]:
            k.box((side*53,.7,z),(2.0,.22,3.8),'marble')
            for dz in [-1.4,1.4]: k.box((side*53,.34,z+dz),(1.4,.65,.3),'travertine')
    # Relief mouldings on the hero plinth; the statue pose remains interpretive.
    for y in [.65,1.0,2.73]: k.box((0,y,0),(6.35,.12,3.98),'trim')
    k.box((0,1.8,1.93),(3.2,.7,.04),'bronze_dark')


def pantheon_detail(k):
    # A solid front cornice backing closes the inherited gap behind its outline.
    k.roof((0,17.78,-11.8),38,.5,5.62,'travertine')
    k.roof((0,18.18,-12.08),33.8,.06,4.77,'shadow_stone')
    for x in [v*.66 for v in range(-27,28)]:
        k.box((x,17.61,-11.88),(.25,.3,.46),'trim')
    # Porch roof coffers are geometric shadows, not baked photographs.
    for x in range(-15,16,3):
        for z in [-5,-1,3,7]:
            k.box((x,15.04,z),(2.65,.10,3.4),'shadow_stone')
            k.box((x,14.97,z),(2.2,.09,2.9),'trim')
    for side in [-1,1]:
        for z in range(-87,15): k.box((side*25.25,12.7,z),(.45,.30,.3),'trim')
        for z in range(-80,12,6):
            k.box((side*34.65,2.1,z),(.13,3.5,3.3),'porphyry')
            for x in [28,32]:
                k.box((side*x,12.01,z),(2.9,.12,4.5),'shadow_stone')
        for z in [-79,26,56]: sculpted_tree(k,side*44,z,14)
    rng=random.Random(303)
    for i in range(32):
        x=rng.uniform(-22,22); z=rng.uniform(-85,-17)
        if math.hypot(x,z+42)<16: continue
        human(k,x,z,rng.random()*math.tau,rng.choice(['cloth_cream','cloth_cream','cloth_rust','cloth_blue']),rng.uniform(1.5,1.8))
    cart(k,-19,-72)
    facade_rng=random.Random(126)
    for x in range(-65,66,13):
        height=15+facade_rng.random()*6
        for dx in [-3,3]: window_frame(k,x+dx,-96.70,height-4,1.6,2.4,True)
        window_frame(k,x,-96.64,3,2.5,6,False)
        k.box((x,3,-96.45),(2.2,5.7,.12),'wood')
    # Panel seams and bosses on the original porch portal remain illustrative.
    for x in [-1.7,1.7]:
        for y in [3.2,5.8,8.4]: k.box((x,y,5.52),(3.1,2.3,.18),'bronze_dark')
    for x in [-3.65,3.65]: k.box((x,6.6,5.60),(.5,10.9,.6),'marble')
    k.box((0,12.3,5.6),(8.0,.6,.6),'trim')


def valley_detail(k):
    rng=random.Random(305)
    for i in range(80):
        a=i*math.tau/80; x=175+96*math.cos(a); z=80*math.sin(a)
        angle=math.atan2(-78*math.cos(a),-94*math.sin(a))
        # Attic pilasters and projecting brackets supplement the intact arcades.
        k.box((x,39.4,z),(1.05,10.8,.7),'marble',angle=angle)
        for y in [34.3,44.6]: k.box((x,y,z),(1.6,.4,1.0),'trim',angle=angle)
        if i%2: k.ellipsoid((175+96.1*math.cos(a),39.7,80.1*math.sin(a)),(.7,.9,.7),'bronze_dark',n=12)
    # Render-only timber scaffold bracing and incomplete stone courses.
    for x in range(-190,-39,15):
        for z in [-49,30]:
            k.rod((x,3,z),(x,11,z),.14,'wood')
            k.rod((x,4,z),(x+12,10,z),.10,'wood')
            k.rod((x,10,z),(x+12,4,z),.10,'wood')
            for y in [5.5,9.5]: k.box((x+6,y,z),(13,.13,2),'wood')
        if x%2: human(k,x,-40,.5,'cloth_cream',1.7,y=3)
    for i in range(25):
        x=rng.uniform(-185,-45); z=rng.uniform(-40,25)
        k.box((x,3.22,z),(rng.uniform(.4,1.2),.44,rng.uniform(.4,1.1)),'marble',angle=rng.random())
    cart(k,-42,18); cart(k,-32,-31)
    for i in range(48):
        x=rng.uniform(-22,62); z=rng.uniform(-82,88)
        if math.hypot(x,z)<13 or math.hypot(x-16,z-36)<12: continue
        human(k,x,z,rng.random()*math.tau,rng.choice(['cloth_cream','cloth_cream','cloth_rust','cloth_blue','cloth_ochre']),rng.uniform(1.5,1.8))
    for x,z in [(-100,95),(-180,122),(60,175),(-245,-95),(-235,80),(-27,154),(32,164)]: sculpted_tree(k,x,z,17)
    # Shade the deep circulation wall separately from exterior limestone.
    inner=k.batches.pop(('rome125_colosseum_outer_arcade','shadow_stone'),None)
    if inner: k.batches[('rome125_colosseum_outer_arcade','arcade_interior')]=inner
    # The smooth Palatine slope gains a visible elevated gallery and planted shoulders.
    for x in range(-113,28,14):
        k.column(x,177,16,.85,y=42,detail=True)
        k.box((x,49,182.40),(7,11,.16),'arcade_interior')
    k.box((-43,58.5,177),(152,1.2,4),'trim')
    for x,z in [(-180,130),(-130,133),(-80,140),(-190,190),(110,178),(130,218),(78,246),(-192,252)]:
        term=1-((x+45)/235)**2-((z-205)/140)**2
        y=max(0,-28+70*math.sqrt(max(0,term)))
        sculpted_tree(k,x,z,9 if z<150 else 14,y)
    for x,z in [(-153,109),(-124,118),(90,119),(143,152),(-232,174),(154,239)]:
        term=1-((x+45)/235)**2-((z-205)/140)**2
        y=max(0,-28+70*math.sqrt(max(0,term)))
        sculpted_tree(k,x,z,2.0,y)
    # Continuous distant ring closes the southeast gap that runtime GLB fog hid.
    # At 450 m it stays beneath the amphitheatre and Palatine hero silhouettes.
    for i in range(100):
        angle=i*math.tau/100; x=450*math.cos(angle); z=450*math.sin(angle)
        height=rng.uniform(25,38)
        k.box((x,height/2,z),(45,height,44),rng.choice(['plaster','plaster_light','brick']))
        k.roof((x,height,z),47,46,4)
        if i%3==0: sculpted_tree(k,x*.95,z*.95,16)
    # More distant civic frontage hides empty ground beyond the northern street.
    for x in range(-260,221,24):
        if -62<x<-22: continue
        k.box((x,10,-210),(22,20,30),'plaster_light')
        k.roof((x,20,-210),24,32,4)
        for dx in [-7,0,7]:
            window_frame(k,x+dx,-194.75,13,2.2,3,True)
            k.box((x+dx,5,-194.8),(3.1,7,.14),'wood')


def overview_detail(k):
    # Riverbank trees and stone quays are continuous through the final crop.
    for i in range(90):
        z=-2000+i*46; x=-1070+190*math.sin(z/740)
        if i%2: tree(k,x+118,z,12)
        k.box((x+96,2,z),(10,4,48),'travertine',angle=-math.atan(190/740*math.cos(z/740)))
    for z in [-650,80,640]:
        x=-1070+190*math.sin(z/740)
        k.box((x,7,z),(190,3,16),'travertine')
        for dx in [-65,-25,25,65]: k.box((x+dx,2.5,z),(7,8,16),'shadow_stone')


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
    # Original procedural families: courtyard houses, L-shaped blocks, narrow rows,
    # flat terraces, gabled insulae and warehouse groups, all with jittered alignment.
    for gx in range(-3200,3501,54):
        for gz in range(-3300,3501,57):
            x=gx+rng.uniform(-6,6)+9*math.sin(gz/190); z=gz+rng.uniform(-6,6)+7*math.sin(gx/220)
            river_x=-1070+190*math.sin(z/740)
            if abs(x-river_x)<112: continue
            if abs(x)<110 and abs(z)<115: continue
            if abs(x+590)<92 and abs(z+300)<145: continue
            if ((x-680)/122)**2+((z-630)/110)**2<1: continue
            if abs(x-230)<330 and abs(z-1070)<100: continue
            if abs(x+150)<90 and abs(z-330)<95: continue
            if abs(x-350)<170 and abs(z-715)<125: continue
            if abs(x-185)<230 and abs(z-340)<46: continue
            if abs(x-65)<80 and abs(z-180)<100: continue
            if rng.random()<.045: continue
            base=hill(x,z); h=rng.choice([9,11,14,17,21,25]); family=rng.randrange(7)
            plaster=rng.choice(['plaster','plaster_light','travertine','brick']); roof=rng.choice(['roof','roof_light'])
            w=rng.uniform(23,40); d=rng.uniform(24,43)
            def block(px,pz,bw,bd,bh,roofed=True):
                k.box((px,base+bh/2,pz),(bw,bh,bd),plaster)
                if roofed: k.roof((px,base+bh,pz),bw+.8,bd+.8,2.5,roof)
                else:
                    k.box((px,base+bh+.12,pz),(bw+.3,.24,bd+.3),'paving_light')
                    for side in [-1,1]: k.box((px+side*(bw/2-.2),base+bh+.5,pz),(.4,1,bd),plaster)
            if family in [0,1]:
                block(x-w/2+4,z,8,d,h); block(x+w/2-4,z,8,d,h)
                block(x,z-d/2+4,w-16,8,h); block(x,z+d/2-4,w-16,8,h)
                k.box((x,base+.08,z),(w-16,.16,d-16),'paving_light')
            elif family==2:
                block(x,z,w,d,h); block(x+w*.3,z+d*.5,w*.55,8,h*.7)
            elif family==3:
                for off in [-1,0,1]: block(x+off*11,z,10,d,h+rng.uniform(-2,2))
            elif family==4:
                block(x,z,w,d,h,False); block(x-5,z-5,10,11,4+h)
            elif family==5:
                block(x,z,w,d*.46,h); block(x+w/2-5,z+d*.36,10,d*.6,h)
            else: block(x,z,w,d,h)
            # Window rhythm only in the central crop; distant fabric gets simpler.
            if -1700<x<1600 and -1500<z<1800:
                for dx in [-w*.3,0,w*.3]:
                    k.box((x+dx,base+h-4,z+d/2+.07),(1.7,2.6,.13),'dark')
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
    overview_detail(k)


def materials():
    author_materials(AI_ASSETS)


def environment(name):
    scene=bpy.context.scene
    world=bpy.data.worlds.new('Rome Mediterranean daylight'); world.use_nodes=True; scene.world=world
    nt=world.node_tree; nt.nodes.clear()
    output=nt.nodes.new('ShaderNodeOutputWorld'); bg=nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value=.12
    sky=nt.nodes.new('ShaderNodeTexSky'); sky.sky_type='MULTIPLE_SCATTERING'; sky.sun_elevation=math.radians(38); sky.sun_rotation=math.radians(138); sky.sun_disc=True; sky.sun_size=math.radians(.75); sky.altitude=.05; sky.air_density=1.1; sky.aerosol_density=1.8; sky.ozone_density=1.0
    nt.links.new(sky.outputs['Color'],bg.inputs['Color']); nt.links.new(bg.outputs[0],output.inputs[0])
    camera_sky(nt,bg.outputs[0],output,AI_ASSETS)
    if name=='overview':
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,480))
        haze=bpy.context.object; haze.name='Render-only atmospheric depth'; haze.scale=(18000,18000,1050)
        fog=bpy.data.materials.new('Aerial haze'); fog.use_nodes=True; fn=fog.node_tree; fn.nodes.clear()
        fo=fn.nodes.new('ShaderNodeOutputMaterial'); volume=fn.nodes.new('ShaderNodeVolumePrincipled')
        volume.inputs['Density'].default_value=.000055; volume.inputs['Color'].default_value=(.69,.77,.86,1); volume.inputs['Anisotropy'].default_value=.3
        fn.links.new(volume.outputs['Volume'],fo.inputs['Volume']); haze.data.materials.append(fog)
    if name=='colosseum-valley':
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,190))
        haze=bpy.context.object; haze.name='Valley distant air'; haze.scale=(3000,3000,400)
        mat=bpy.data.materials.new('Valley subtle haze'); mat.use_nodes=True; vn=mat.node_tree; vn.nodes.clear()
        out=vn.nodes.new('ShaderNodeOutputMaterial'); vol=vn.nodes.new('ShaderNodeVolumePrincipled')
        vol.inputs['Density'].default_value=.00010; vol.inputs['Color'].default_value=(.75,.82,.89,1); vol.inputs['Anisotropy'].default_value=.25
        vn.links.new(vol.outputs[0],out.inputs['Volume']); haze.data.materials.append(mat)
    # Sky model provides both direct sunlight and coherent environment lighting.
    scene.render.engine='CYCLES'; scene.cycles.samples=40; scene.cycles.use_denoising=True; scene.cycles.adaptive_threshold=.025
    scene.cycles.max_bounces=6; scene.cycles.diffuse_bounces=3; scene.cycles.glossy_bounces=3; scene.cycles.transmission_bounces=4
    prefs=bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type='METAL'; prefs.get_devices()
        for device in prefs.devices: device.use=device.type=='METAL'
        scene.cycles.device='GPU'
    except Exception: scene.cycles.device='CPU'
    scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'; scene.render.image_settings.color_depth='8'
    scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.view_settings.exposure=-.65 if name=='overview' else -.25
    scene.render.film_transparent=False; scene.render.resolution_percentage=100
    scene.render.image_settings.compression=35
    scene.render.threads_mode='AUTO'
    # Rounded arrises and smooth sculpture silhouettes are exclusively offline costs.
    for obj in scene.objects:
        if obj.type!='MESH': continue
        name_part=obj.data.materials[0].name if obj.data.materials else ''
        if name_part in ['bronze','bronze_dark','skin','skin_light','hair','foliage','leaf_light','leaf_silver','granite'] or name!='overview' and name_part=='grass':
            for polygon in obj.data.polygons: polygon.use_smooth=True
        if name!='overview' and name_part in ['travertine','marble','trim','porphyry','wood']:
            bevel=obj.modifiers.new('Tiny worn stone edges','BEVEL'); bevel.width=.027; bevel.segments=2; bevel.limit_method='ANGLE'; bevel.angle_limit=.65
    return scene


def camera(scene, eye, target):
    bpy.ops.object.camera_add(location=(eye[0],-eye[2],eye[1])); cam=bpy.context.object; cam.name='Authored delivery camera'
    aim=Vector((target[0],-target[2],target[1])); cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.clip_end=30000; scene.camera=cam
    return cam


def render_scene(name,preview=False):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for mat in list(bpy.data.materials): bpy.data.materials.remove(mat)
    k=Kit() if name=='overview' else RenderKit(); {'overview':overview_city,'forum-trajan':forum,'pantheon-forecourt':pantheon,'colosseum-valley':colosseum}[name](k)
    {'overview':lambda kit:None,'forum-trajan':forum_detail,'pantheon-forecourt':pantheon_detail,'colosseum-valley':valley_detail}[name](k)
    k.export_objects(); materials(); scene=environment(name)
    if preview: scene.cycles.samples=16
    OUT.mkdir(parents=True,exist_ok=True)
    metadata={'scene':name,'generator':'blender/scripts/render_rome.py','coordinates':'+X east, +Y up, +Z south. Panorama center north; positive yaw west; positive pitch up; radians.', 'provenance':'Original procedural architecture, figures and staging; AI-assisted camera-only sky and generic stone surface image with procedural materials. Interpretive reconstruction, not a surveyed model.', 'aiInputs':[str(path.relative_to(ROOT)) for path in sorted(AI_ASSETS.glob('*.png'))]}
    if name=='overview':
        cam=camera(scene,(-1450,1250,1650),(50,40,180)); cam.data.type='PERSP'; cam.data.lens=36
        metadata['markers']={key:{} for key in MARKERS}
        metadata['cameras']={}
        for variant,width,height,lens in [('desktop',2560,1600,42),('mobile',1170,1800,36)]:
            scene.render.resolution_x=width//2 if preview else width; scene.render.resolution_y=height//2 if preview else height
            cam.data.lens=lens; cam.data.sensor_fit='HORIZONTAL'
            if variant=='mobile':
                cam.data.type='ORTHO'; cam.data.ortho_scale=2250
                cam.location=(1450,-1650,3300)
                cam.rotation_euler=(Vector((0,-180,0))-cam.location).to_track_quat('-Z','Y').to_euler()
            bpy.context.view_layer.update()
            metadata['cameras'][variant]={'eye':[cam.location.x,cam.location.z,-cam.location.y], 'target':[0,0,180] if variant=='mobile' else [50,40,180], 'projection':cam.data.type, 'lensMm':cam.data.lens, 'orthoScale':cam.data.ortho_scale if variant=='mobile' else None}
            for key,p in MARKERS.items():
                pos=world_to_camera_view(scene,cam,Vector((p[0],-p[2],p[1]))); metadata['markers'][key][variant]=[round(pos.x,6),round(1-pos.y,6)]
            scene.render.filepath=str(OUT/f'overview-{variant}{"-preview" if preview else ""}.png'); bpy.ops.render.render(write_still=True)
        cam.data.type='PERSP'; cam.data.lens=42; cam.location=(-1450,-1650,1250); cam.rotation_euler=(Vector((50,-180,40))-cam.location).to_track_quat('-Z','Y').to_euler(); scene.render.resolution_x=2560; scene.render.resolution_y=1600
    else:
        eye=EYES[name]; cam=camera(scene,eye,(eye[0],eye[1],eye[2]-1))
        cam.data.type='PANO'; cam.data.panorama_type='EQUIRECTANGULAR'
        scene.render.resolution_x=2048 if preview else 6144; scene.render.resolution_y=1024 if preview else 3072
        cam.data.longitude_min=-math.pi; cam.data.longitude_max=math.pi; cam.data.latitude_min=-math.pi/2; cam.data.latitude_max=math.pi/2
        metadata['eye']=eye; metadata['initialTarget']=TARGETS[name]; metadata['hotspots']=[]
        for object_id,p in ANCHORS[name].items():
            dx,dy,dz=[p[i]-eye[i] for i in range(3)]
            metadata['hotspots'].append({'objectId':object_id,'yaw':round(math.atan2(-dx,-dz),7),'pitch':round(math.atan2(dy,math.hypot(dx,dz)),7),'anchor':p})
            anchor=bpy.data.objects.new('hotspot_'+object_id,None); bpy.context.collection.objects.link(anchor); anchor.location=(p[0],-p[2],p[1])
        scene.render.filepath=str(OUT/f'{name}-360{"-preview" if preview else ""}.png'); bpy.ops.render.render(write_still=True)
    if not preview:
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'blender/source/rome-125/{name}.blend'),compress=True)
    (OUT/f'{name}{"-preview" if preview else ""}.json').write_text(json.dumps(metadata,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--scene',choices=['overview','forum-trajan','pantheon-forecourt','colosseum-valley','panoramas','all'],default='all'); parser.add_argument('--preview',action='store_true')
    opts=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    names=['overview','forum-trajan','pantheon-forecourt','colosseum-valley'] if opts.scene=='all' else ['forum-trajan','pantheon-forecourt','colosseum-valley'] if opts.scene=='panoramas' else [opts.scene]
    for name in names: render_scene(name,opts.preview)
