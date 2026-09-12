"""Run: Blender --background --python blender/scripts/build_rome.py -- --scene all.
Only completed milestones are exposed in this revision. Blender is authoring-only.
"""
import argparse
import json
import hashlib
import math
import random
import sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent/'lib'))
from rome_kit import Kit, forum, pantheon
ROOT=Path(__file__).resolve().parents[2]

def overview(k):
    k.box((0,-9,0),(26000,16,26000),'earth')
    # Broad curving Tiber, intentionally beyond the central monumental crop.
    def river_strip(left, right, y, material):
        points=[]
        for i in range(161):
            z=-6000+i*75; x=-1070+190*math.sin(z/740)
            points.extend([(x+left,y,z),(x+right,y,z)])
        k.mesh(points,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(160)],material)
    river_strip(-120,-85,.2,'grass')
    river_strip(85,120,.2,'grass')
    river_strip(-85,85,.02,'water')
    rng=random.Random(125)
    # Hill forms support the city; masses are interpretive topographic silhouettes.
    for p,s in [((-150,-25,330),(240,75,210)),((370,-28,750),(350,95,300)),((720,-40,-210),(400,80,420))]:
        k.ellipsoid(p,s,'grass',n=32,rings=12)
    for x in range(-850,1401,45):
        for z in range(-1000,1451,48):
            if abs(x)<125 and abs(z)<135: continue
            if math.hypot((x+590)/1.0,z+300)<110: continue
            if ((x-680)/150)**2+((z-630)/125)**2<1: continue
            if abs(x-230)<330 and abs(z-1070)<90: continue
            if abs(x+120)<190 and abs(z-360)<200: continue
            if abs(x-350)<230 and abs(z-660)<200: continue
            if rng.random()<.13: continue
            w,d=rng.choice([(29,30),(34,27),(23,34),(32,36),(20,25),(36,20)])
            h=rng.choice([9,13,17,20,25,28]); px=x+rng.uniform(-4,4); pz=z+rng.uniform(-4,4)
            k.box((px,h/2,pz),(w,h,d),rng.choice(['plaster','plaster_light','travertine']))
            k.roof((px,h,pz),w+1,d+1,3,rng.choice(['roof','roof_light']))
    forum(k,True)
    # Pantheon dome and north-facing porch at the geographic anchor.
    k.cylinder((-590,11,-280),24,22,'shadow_stone',n=40)
    k.ellipsoid((-590,22,-280),(24,15,24),'travertine',n=40,rings=12)
    k.box((-590,8,-312),(34,16,17),'marble'); k.roof((-590,16,-312),38,21,6,'travertine')
    for x in range(-604,-575,4): k.column(x,-325,13,.9,detail=False)
    # Intact amphitheatre elliptical tiers and open arena.
    for tier in range(4):
        for i in range(80):
            a=i*math.tau/80; x=680+math.cos(a)*94; z=630+math.sin(a)*78
            k.box((x,6+tier*11,z),(5.3,10,4),'travertine',angle=-a)
        for i in range(80):
            a=i*math.tau/80
            k.box((680+math.cos(a)*94,11+tier*11,630+math.sin(a)*78),(8,1.8,6),'marble',angle=math.pi/2-a)
    k.cylinder((680,.7,630),58,1.4,'paving',n=48)
    # Capitoline temple, older forum axis, Palatine palace, Circus trough.
    for x,y,z,w,d in [(-140,55,320,64,85),(190,5,340,100,35),(320,66,690,190,150)]:
        k.box((x,y-2,z),(w+12,4,d+12),'marble')
        k.box((x,y+12,z),(w,24,d),'plaster_light'); k.roof((x,y+24,z),w+4,d+4,10)
    k.box((230,.2,1070),(600,.4,130),'paving')
    for side in [-1,1]: k.box((230,8,1070+side*65),(620,16,22),'travertine')
    k.box((230,2,1070),(530,4,9),'grass')
    for x,z in [(-200,590),(80,460),(110,410)]:
        for i in range(7): k.column(x+i*4,z,11,.7,detail=False)
        k.box((x+12,12,z),(31,2,10),'marble')


def build(name):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    kit=Kit()
    if name=='overview': overview(kit); eye=(-1450,1250,1650); target=(50,40,180)
    elif name=='forum-trajan': forum(kit); eye=(0,1.65,30); target=(0,12,-40)
    else: pantheon(kit); eye=(0,1.65,-42); target=(0,13,0)
    groups=kit.export_objects()
    scene=bpy.context.scene
    scene.world.color=(.65,.69,.71)
    bpy.ops.object.light_add(type='SUN',location=(-80,-30,100)); sun=bpy.context.object
    sun.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-30)); sun.data.energy=2.4; sun.data.angle=.12
    bpy.ops.object.camera_add(location=(eye[0],-eye[2],eye[1])); camera=bpy.context.object
    aim=Vector((target[0],-target[2],target[1])); camera.rotation_euler=(aim-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.lens=36; camera.data.clip_end=30000; scene.camera=camera
    scene.render.engine='CYCLES'; scene.cycles.samples=16
    scene.render.resolution_x=1440; scene.render.resolution_y=900; scene.render.resolution_percentage=100
    source=ROOT/'blender/source/rome-125'; source.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source/f'{name}.blend'))
    out=ROOT/'public/models/rome-125'; out.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(out/f'{name}.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_yup=True,export_apply=True,export_animations=False)
    triangles=0; batches=0; bounds=[]
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles); batches+=len(obj.data.materials)
            bounds.extend([(v.co.x,v.co.z,-v.co.y) for v in obj.data.vertices])
    metrics={'asset':f'/models/rome-125/{name}.glb','generator':'blender/scripts/build_rome.py','sha256':hashlib.sha256((out/f'{name}.glb').read_bytes()).hexdigest(),'bytes':(out/f'{name}.glb').stat().st_size,'triangles':triangles,'materialBatches':batches,'textures':0,'externalResources':0,'groups':list(groups),'bounds':{'min':[min(p[i] for p in bounds) for i in range(3)],'max':[max(p[i] for p in bounds) for i in range(3)]},'confidence':'Source-aware interpretive reconstruction; original procedural geometry, no third-party assets.'}
    assert metrics['bytes']< (8 if name=='overview' else 9 if name=='pantheon-forecourt' else 10)*1024*1024,metrics
    assert triangles<(100000 if name=='overview' else 130000 if name=='pantheon-forecourt' else 150000),metrics
    assert batches<=(45 if name=='pantheon-forecourt' else 50),metrics
    (out/f'{name}.metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    print(json.dumps(metrics))
    if '--render' in sys.argv:
        scene.render.filepath=str(source/f'{name}-review.png'); bpy.ops.render.render(write_still=True)

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser=argparse.ArgumentParser(); parser.add_argument('--scene',choices=['overview','forum-trajan','pantheon-forecourt','all'],default='all'); parser.add_argument('--render',action='store_true')
opts=parser.parse_args(args)
for name in (['overview','forum-trajan','pantheon-forecourt'] if opts.scene=='all' else [opts.scene]): build(name)
