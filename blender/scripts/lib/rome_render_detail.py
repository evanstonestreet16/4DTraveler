"""Render-only surface authoring; the runtime kit and GLBs are never modified."""
import math
import random
from pathlib import Path
import bpy
from rome_kit import Kit as BaseKit, PALETTE

PALETTE.update({'granite':'#8e8176','plinth_stone':'#c4b499','leaf_silver':'#788365','terracotta':'#a45f43'})


def ramp(nt, value, low, high, positions=(.12,.88)):
    node=nt.nodes.new('ShaderNodeValToRGB')
    for item,color,pos in zip(node.color_ramp.elements,[low,high],positions):
        item.color=(*color[:3],1); item.position=pos
    nt.links.new(value,node.inputs[0]); return node.outputs['Color']


def noise(nt,vector,scale,detail=3):
    node=nt.nodes.new('ShaderNodeTexNoise'); node.inputs['Scale'].default_value=scale; node.inputs['Detail'].default_value=detail; node.inputs['Roughness'].default_value=.68
    nt.links.new(vector,node.inputs['Vector']); return node.outputs['Fac']


def mix(nt,a,b,factor=.5,mode='MIX'):
    node=nt.nodes.new('ShaderNodeMixRGB'); node.blend_type=mode
    if isinstance(factor,(float,int)): node.inputs[0].default_value=factor
    else: nt.links.new(factor,node.inputs[0])
    for value,index in [(a,1),(b,2)]:
        if hasattr(value,'node'): nt.links.new(value,node.inputs[index])
        else: node.inputs[index].default_value=(*value[:3],1)
    return node.outputs[0]


def math_node(nt,op,a,b=None):
    node=nt.nodes.new('ShaderNodeMath'); node.operation=op
    for value,index in [(a,0),(b,1)]:
        if value is None: continue
        if isinstance(value,(float,int)): node.inputs[index].default_value=value
        else: nt.links.new(value,node.inputs[index])
    return node.outputs[0]


def projected_vector(nt,vector):
    """Stone courses use XY on ground, XZ/YZ on the corresponding vertical wall."""
    sep=nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(vector,sep.inputs[0])
    normal=nt.nodes.new('ShaderNodeNewGeometry'); ns=nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(normal.outputs['Normal'],ns.inputs[0])
    yzw=nt.nodes.new('ShaderNodeCombineXYZ'); xzw=nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(sep.outputs['Y'],yzw.inputs['X']); nt.links.new(sep.outputs['Z'],yzw.inputs['Y'])
    nt.links.new(sep.outputs['X'],xzw.inputs['X']); nt.links.new(sep.outputs['Z'],xzw.inputs['Y'])
    side=math_node(nt,'GREATER_THAN',math_node(nt,'ABSOLUTE',ns.outputs['X']),.6)
    flat=math_node(nt,'GREATER_THAN',math_node(nt,'ABSOLUTE',ns.outputs['Z']),.7)
    wall=mix(nt,xzw.outputs[0],yzw.outputs[0],side)
    return mix(nt,wall,vector,flat)


def author_materials(asset_root):
    texture_path=Path(asset_root)/'travertine-albedo.png'
    texture=bpy.data.images.load(str(texture_path),check_existing=True) if texture_path.exists() else None
    if texture: texture.pack()
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        nt=mat.node_tree; bs=nt.nodes.get('Principled BSDF')
        if not bs: continue
        name=mat.name; base=tuple(bs.inputs['Base Color'].default_value)
        coord=nt.nodes.new('ShaderNodeTexCoord'); vector=coord.outputs['Object']
        macro=noise(nt,vector,.23 if name not in ['grass','earth'] else .025,3)
        tint=ramp(nt,macro,tuple(c*.60 for c in base[:3]),tuple(min(c*1.18,1) for c in base[:3]))
        rough=ramp(nt,noise(nt,vector,2.3,2),(.42,.42,.42),(.77,.77,.77))
        height=noise(nt,vector,95,2); distance=.008; strength=.20
        projected=projected_vector(nt,vector)
        stone=name in ['travertine','marble','trim','plinth_stone','paving','paving_light','paving_dark','shadow_stone']
        if stone and texture:
            mapping=nt.nodes.new('ShaderNodeVectorMath'); mapping.operation='SCALE'; mapping.inputs['Scale'].default_value=.55
            nt.links.new(vector,mapping.inputs[0])
            tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=texture; tex.projection='BOX'; tex.projection_blend=.28; tex.extension='REPEAT'
            nt.links.new(mapping.outputs[0],tex.inputs[0])
            lum=nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(tex.outputs['Color'],lum.inputs[0])
            stone_tint=ramp(nt,lum.outputs[0],(.64,.64,.64),(1.17,1.17,1.17),(.22,.80))
            tint=mix(nt,tint,stone_tint,.20 if name in ['marble','trim'] else .62,'MULTIPLY')
            height=lum.outputs[0]; distance=.008 if name in ['marble','trim'] else .016; strength=.24
        if name in ['travertine','plinth_stone','shadow_stone','brick','paving','paving_light','paving_dark']:
            brick=nt.nodes.new('ShaderNodeTexBrick'); nt.links.new(projected,brick.inputs['Vector'])
            paving=name.startswith('paving'); is_brick=name=='brick'
            brick.inputs['Scale'].default_value=1
            brick.inputs['Brick Width'].default_value=2.7 if paving else .56 if is_brick else 1.8
            brick.inputs['Row Height'].default_value=1.8 if paving else .12 if is_brick else .68
            brick.inputs['Mortar Size'].default_value=.011 if paving else .008
            brick.inputs['Mortar Smooth'].default_value=.008
            brick.inputs['Color1'].default_value=(.65,.65,.65,1); brick.inputs['Color2'].default_value=(1.08,1.08,1.08,1); brick.inputs['Mortar'].default_value=(.37,.35,.31,1)
            tint=mix(nt,tint,brick.outputs['Color'],.32 if paving else .28,'MULTIPLY')
            micro=nt.nodes.new('ShaderNodeBump'); micro.inputs['Distance'].default_value=distance; micro.inputs['Strength'].default_value=strength
            nt.links.new(height,micro.inputs['Height'])
            joints=nt.nodes.new('ShaderNodeBump'); joints.inputs['Distance'].default_value=.012 if paving else .018; joints.inputs['Strength'].default_value=.28; joints.invert=True
            nt.links.new(brick.outputs['Fac'],joints.inputs['Height']); nt.links.new(micro.outputs['Normal'],joints.inputs['Normal']); nt.links.new(joints.outputs['Normal'],bs.inputs['Normal'])
        else:
            bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value=distance; bump.inputs['Strength'].default_value=strength
            nt.links.new(height,bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        if name=='granite':
            grains=noise(nt,vector,130,2)
            tint=mix(nt,tint,ramp(nt,grains,(.30,.28,.27),(1.20,1.17,1.12),(.26,.74)),.64,'MULTIPLY')
            rough=ramp(nt,grains,(.22,.22,.22),(.46,.46,.46))
        if name in ['plaster','plaster_light']:
            chalk=noise(nt,vector,13,3); tint=mix(nt,tint,ramp(nt,chalk,(.72,.72,.72),(1.07,1.07,1.07)),.44,'MULTIPLY')
            rough=ramp(nt,chalk,(.68,.68,.68),(.88,.88,.88))
        if name in ['roof','roof_light','terracotta']:
            courses=nt.nodes.new('ShaderNodeTexBrick'); nt.links.new(vector,courses.inputs['Vector']); courses.inputs['Scale'].default_value=1
            courses.inputs['Brick Width'].default_value=.42; courses.inputs['Row Height'].default_value=.65; courses.inputs['Mortar Size'].default_value=.02
            courses.inputs['Color1'].default_value=(*[v*.67 for v in base[:3]],1); courses.inputs['Color2'].default_value=(*[v*1.23 for v in base[:3]],1); courses.inputs['Mortar'].default_value=(*[v*.32 for v in base[:3]],1)
            tint=mix(nt,courses.outputs['Color'],ramp(nt,macro,(.66,.66,.66),(1.13,1.13,1.13)),.5,'MULTIPLY')
            tile_bump=nt.nodes.new('ShaderNodeBump'); tile_bump.invert=True; tile_bump.inputs['Distance'].default_value=.055; tile_bump.inputs['Strength'].default_value=.42; nt.links.new(courses.outputs['Fac'],tile_bump.inputs['Height']); nt.links.new(tile_bump.outputs['Normal'],bs.inputs['Normal'])
        if name=='wood':
            stretch=nt.nodes.new('ShaderNodeVectorMath'); stretch.operation='MULTIPLY'; stretch.inputs[1].default_value=(2,2,.10); nt.links.new(vector,stretch.inputs[0]); grain=noise(nt,stretch.outputs[0],17,3)
            tint=mix(nt,tint,ramp(nt,grain,(.38,.38,.38),(1.18,1.18,1.18)),.6,'MULTIPLY')
        if 'bronze' in name:
            bs.inputs['Metallic'].default_value=.85; rough=ramp(nt,macro,(.22,.22,.22),(.43,.43,.43))
        if name=='porphyry':
            tint=mix(nt,tint,ramp(nt,noise(nt,vector,95,2),(.6,.47,.48),(1.16,1.02,.99)),.4,'MULTIPLY'); rough=(.28,.28,.28)
        if name=='water':
            tint=(.045,.105,.10); rough=(.13,.13,.13); bs.inputs['Metallic'].default_value=.24
            wave=nt.nodes.new('ShaderNodeTexWave'); wave.wave_type='BANDS'; wave.bands_direction='X'; wave.inputs['Scale'].default_value=2.5; wave.inputs['Distortion'].default_value=5; nt.links.new(vector,wave.inputs[0]); bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value=.09; bump.inputs['Strength'].default_value=.28; nt.links.new(wave.outputs['Color'],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bs.inputs['Normal'])
        if name in ['foliage','leaf_light','leaf_silver']:
            tint=ramp(nt,noise(nt,vector,6,3),tuple(c*.42 for c in base[:3]),tuple(c*1.25 for c in base[:3])); rough=(.8,.8,.8)
            bs.inputs['Subsurface Weight'].default_value=.055
        if name=='grass':
            tint=ramp(nt,noise(nt,vector,.18,4),(.055,.075,.026),(.21,.24,.11)); rough=(.94,.94,.94)
        if name not in ['water','bronze','bronze_dark','letter','dark']:
            # Real contact darkening: limited to 0.8 m around columns, ledges and joints.
            ao=nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value=.8; ao.samples=8
            tint=mix(nt,tint,ao.outputs['Color'],.18,'MULTIPLY')
        if hasattr(tint,'node'): nt.links.new(tint,bs.inputs['Base Color'])
        else: bs.inputs['Base Color'].default_value=(*tint[:3],1)
        if hasattr(rough,'node'): nt.links.new(rough,bs.inputs['Roughness'])
        else: bs.inputs['Roughness'].default_value=rough[0]


def camera_sky(nt, physical, output, asset_root):
    """AI pixels affect direct camera rays only; physical sky retains all illumination."""
    sky_path=Path(asset_root)/'mediterranean-sky.png'
    if not sky_path.exists(): return False
    image=bpy.data.images.load(str(sky_path),check_existing=True); image.pack()
    coord=nt.nodes.new('ShaderNodeTexCoord'); sep=nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coord.outputs['Generated'],sep.inputs[0])
    angle=math_node(nt,'ARCTAN2',sep.outputs['X'],sep.outputs['Y'])
    # Calibration render places the physical 138-degree sun at panorama u=.883.
    u=math_node(nt,'FRACT',math_node(nt,'ADD',math_node(nt,'DIVIDE',angle,math.tau),.5-.148))
    elevation=math_node(nt,'ARCSINE',sep.outputs['Z'])
    v=math_node(nt,'ADD',math_node(nt,'MULTIPLY',elevation,.81/math.pi),.5)
    def sample(horizontal):
        uv=nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(horizontal,uv.inputs['X']); nt.links.new(v,uv.inputs['Y'])
        tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=image; tex.extension='REPEAT'; nt.links.new(uv.outputs[0],tex.inputs[0]); return tex.outputs['Color']
    a=sample(u); b=sample(math_node(nt,'SUBTRACT',1,u))
    edge=math_node(nt,'MINIMUM',u,math_node(nt,'SUBTRACT',1,u))
    fade=nt.nodes.new('ShaderNodeMapRange'); fade.clamp=True; fade.interpolation_type='SMOOTHERSTEP'; fade.inputs['From Min'].default_value=0; fade.inputs['From Max'].default_value=.045; fade.inputs['To Min'].default_value=.5; fade.inputs['To Max'].default_value=0; nt.links.new(edge,fade.inputs['Value'])
    seamless=mix(nt,a,b,fade.outputs['Result'])
    polar=nt.nodes.new('ShaderNodeMapRange'); polar.clamp=True; polar.interpolation_type='SMOOTHERSTEP'; polar.inputs['From Min'].default_value=.96; polar.inputs['From Max'].default_value=1; nt.links.new(math_node(nt,'ABSOLUTE',sep.outputs['Z']),polar.inputs['Value'])
    seamless=mix(nt,seamless,(.105,.20,.32),polar.outputs['Result'])
    bg=nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value=2.1; nt.links.new(seamless,bg.inputs['Color'])
    path=nt.nodes.new('ShaderNodeLightPath'); switch=nt.nodes.new('ShaderNodeMixShader'); nt.links.new(path.outputs['Is Camera Ray'],switch.inputs[0]); nt.links.new(physical,switch.inputs[1]); nt.links.new(bg.outputs[0],switch.inputs[2]); nt.links.new(switch.outputs[0],output.inputs[0])
    return True


def sculpted_tree(k,x,z,h=13,y=0):
    """Branching crown with irregular leaf silhouettes; no billboard spheres."""
    rng=random.Random(round(x*71+z*19+h*11)); radius=max(.7,h*.22)
    k.cylinder((x,y+h*.33,z),max(.08,h*.023),h*.66,'wood',top=max(.04,h*.011),n=12)
    for branch in range(9):
        angle=branch*math.tau/9+rng.uniform(-.16,.16); spread=radius*rng.uniform(.5,1.1)
        px=x+math.cos(angle)*spread; pz=z+math.sin(angle)*spread; py=y+h*.77+rng.uniform(-.06,.09)*h
        k.rod((x,y+h*.5,z),(px,py,pz),max(.045,h*.006),'wood',n=10)
        k.ellipsoid((px,py,pz),(radius*.55,h*.10,radius*.5),rng.choice(['foliage','leaf_light']),n=12,rings=7)
        for leaf in range(12):
            a=rng.random()*math.tau; r=rng.uniform(.3,.75)*radius
            cx=px+math.cos(a)*r; cz=pz+math.sin(a)*r; cy=py+rng.uniform(-.06,.07)*h; size=max(.09,h*.029)
            vx=math.cos(a)*size; vz=math.sin(a)*size
            k.mesh([(cx-vx,cy,cz-vz),(cx-vz*.45,cy+size*.45,cz+vx*.45),(cx+vx,cy+size*.12,cz+vz),(cx+vz*.45,cy-size*.15,cz-vx*.45)],[(0,1,2,3)],rng.choice(['foliage','leaf_light','leaf_silver']))


class RenderKit(BaseKit):
    """POI-only geometry refinements; overview keeps its independent authoring path."""
    def column(self,x,z,height=10,r=.62,y=0,material='marble',group=None,detail=True):
        material='granite' if material=='shadow_stone' else material
        super().column(x,z,height,r,y,material,group,detail)
        if detail:
            # Additional torus-like base profiles and capital rings create real shadows.
            for dy,rad in [(.29,1.30),(.43,1.38),(.61,1.13),(height-.89,.96)]:
                self.cylinder((x,y+dy,z),r*rad,.12,'trim',n=40,group=group)
            for i in range(8):
                a=i*math.tau/8
                self.rod((x+math.cos(a)*r*.8,y+height-.95,z+math.sin(a)*r*.8),(x+math.cos(a)*r*1.26,y+height-.38,z+math.sin(a)*r*1.26),r*.065,'trim',group,n=8)

    def cylinder(self,p,r,height,material='marble',top=None,n=16,group=None):
        if height>3 and r<3 and material in ['granite','marble','porphyry']: n=max(n,48)
        super().cylinder(p,r,height,material,top,n,group)

    def ellipsoid(self,p,size,material='marble',group=None,n=12,rings=8):
        if material=='grass' and max(size)>35: n=max(n,96); rings=max(rings,48)
        super().ellipsoid(p,size,material,group,n,rings)

    def tree(self,x,z,y=0,h=13): sculpted_tree(self,x,z,h,y)


def window_frame(k,x,z,y,width=2,height=3,shutters=True,material='trim'):
    """A dark reveal, projecting sill and partly opened wooden leaves."""
    k.box((x,y,z),(width,height,.10),'dark')
    for side in [-1,1]:
        k.box((x+side*(width/2+.11),y,z+.10),(.22,height+.3,.28),material)
        if shutters:
            k.box((x+side*(width/2+.40),y,z+.32),(.70,height*.94,.10),'wood',angle=side*.55)
    k.box((x,y-height/2-.09,z+.19),(width+.55,.20,.52),material)
    k.box((x,y+height/2+.12,z+.08),(width+.55,.26,.31),material)
