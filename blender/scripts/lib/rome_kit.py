"""Original metric Roman silhouette kit. Author in runtime XYZ; export through Blender Z-up.
All ornament and placement is interpretive; no third-party geometry/textures are used.
"""
import math
import random
from collections import defaultdict
import bpy
from mathutils import Vector

PALETTE = {
    'travertine': '#d9c5a1', 'marble': '#ece2cc', 'trim': '#f5ecd7',
    'shadow_stone': '#ac967c', 'porphyry': '#7d4f49', 'bronze': '#a77f36',
    'bronze_dark': '#685322', 'roof': '#a85f40', 'roof_light': '#bd7751',
    'plaster': '#c8a880', 'plaster_light': '#dbc299', 'paving': '#bdae93',
    'paving_light': '#cbbfa6', 'paving_dark': '#a99b81', 'earth': '#92866b',
    'grass': '#8b9068', 'foliage': '#4d6544', 'wood': '#75583b',
    'water': '#668c87', 'dark': '#4f473c', 'letter': '#625a48',
}

class Kit:
    def __init__(self):
        self.batches = defaultdict(lambda: ([], []))
        self.group = 'scenery'

    def mesh(self, points, faces, material, group=None):
        verts, polygons = self.batches[(group or self.group, material)]
        start = len(verts)
        verts.extend(points)
        polygons.extend(tuple(start + i for i in face) for face in faces)

    def box(self, p, size, material='marble', group=None, angle=0):
        x,y,z=p; w,h,d=(v/2 for v in size)
        points=[(-w,-h,-d),(w,-h,-d),(w,h,-d),(-w,h,-d),(-w,-h,d),(w,-h,d),(w,h,d),(-w,h,d)]
        c,s=math.cos(angle),math.sin(angle)
        points=[(x+a*c+b*s,y+v,z-a*s+b*c) for a,v,b in points]
        self.mesh(points,[(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)],material,group)

    def cylinder(self,p,r,height,material='marble',top=None,n=16,group=None):
        x,y,z=p; top=r if top is None else top
        points=[(x+math.cos(a*math.tau/n)*rad,y+dy,z+math.sin(a*math.tau/n)*rad) for dy,rad in [(-height/2,r),(height/2,top)] for a in range(n)]
        faces=[tuple(range(n)),tuple(range(2*n-1,n-1,-1))]
        faces += [(a,(a+1)%n,(a+1)%n+n,a+n) for a in range(n)]
        self.mesh(points,faces,material,group)

    def ellipsoid(self,p,size,material='marble',group=None,n=12,rings=8):
        x,y,z=p
        points=[]
        for j in range(rings+1):
            phi=math.pi*j/rings
            for i in range(n):
                a=math.tau*i/n
                points.append((x+size[0]*math.sin(phi)*math.cos(a),y+size[1]*math.cos(phi),z+size[2]*math.sin(phi)*math.sin(a)))
        faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(rings) for i in range(n)]
        self.mesh(points,faces,material,group)

    def rod(self,a,b,r,material='wood',group=None,n=8):
        av,bv=Vector(a),Vector(b); axis=(bv-av).normalized()
        side=axis.cross(Vector((0,0,1)))
        if side.length < .01: side=axis.cross(Vector((1,0,0)))
        side.normalize(); other=axis.cross(side).normalized()
        points=[tuple(v+r*(side*math.cos(i*math.tau/n)+other*math.sin(i*math.tau/n))) for v in [av,bv] for i in range(n)]
        self.mesh(points,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],material,group)

    def roof(self,p,width,depth,rise,material='roof',group=None):
        x,y,z=p; w,d=width/2,depth/2
        self.mesh([(x-w,y,z-d),(x+w,y,z-d),(x,y+rise,z-d),(x-w,y,z+d),(x+w,y,z+d),(x,y+rise,z+d)],[(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)],material,group)

    def column(self,x,z,height=10,r=.62,y=0,material='marble',group=None,detail=True):
        self.box((x,y+.15,z),(r*2.9,.3,r*2.9),'trim',group)
        self.cylinder((x,y+.5,z),r*1.3,.4,'trim',group=group)
        self.cylinder((x,y+height/2,z),r,height-1.1,material,top=r*.86,n=16 if detail else 8,group=group)
        self.cylinder((x,y+height-.65,z),r*1.04,.35,'trim',group=group)
        self.cylinder((x,y+height-.35,z),r*.96,.4,'trim',top=r*1.5,n=8,group=group)
        self.box((x,y+height-.05,z),(r*3,.3,r*3),'trim',group)
        if detail:
            for a in range(8):
                theta=a*math.tau/8
                self.ellipsoid((x+math.cos(theta)*r,y+height-.55,z+math.sin(theta)*r),(.14,.36,.14),'trim',group,n=6,rings=4)

    def tree(self,x,z,y=0,h=13):
        self.cylinder((x,y+h*.3,z),.35,h*.6,'wood',n=6)
        self.ellipsoid((x,y+h*.75,z),(3.8,h*.25,3.8),'foliage',n=10,rings=5)

    def export_objects(self):
        groups={}
        for (group,mat),(verts,faces) in self.batches.items():
            if group not in groups:
                obj=bpy.data.objects.new(group,None); bpy.context.collection.objects.link(obj); groups[group]=obj
            mesh=bpy.data.meshes.new(f'{group}_{mat}')
            mesh.from_pydata([(x,-z,y) for x,y,z in verts],[],faces); mesh.update()
            obj=bpy.data.objects.new(mesh.name,mesh); bpy.context.collection.objects.link(obj); obj.parent=groups[group]
            material=bpy.data.materials.get(mat)
            if not material:
                material=bpy.data.materials.new(mat); color=PALETTE[mat].lstrip('#')
                rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
                # Principled base colors are linear; palette is sRGB.
                rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
                material.diffuse_color=(*rgb,1); material.use_nodes=True
                shader=material.node_tree.nodes.get('Principled BSDF')
                shader.inputs['Base Color'].default_value=(*rgb,1)
                shader.inputs['Roughness'].default_value=.78 if 'bronze' not in mat else .38
                shader.inputs['Metallic'].default_value=.6 if 'bronze' in mat else 0
            obj.data.materials.append(material)
        return groups


def forum(k,overview=False,origin=(0,0,0)):
    """110 x 86 m main piazza, basilica north; Column is behind the opaque basilica."""
    ox,oy,oz=origin
    # Overview is authored with the same origin and scale as the hero.
    if overview:
        k.box((0,.2,0),(110,.4,86),'marble')
        k.box((0,13,-59),(118,26,28),'marble'); k.roof((0,26,-59),122,32,5)
        for side in [-1,1]:
            k.box((side*54,7,-3),(12,14,94),'travertine')
        k.cylinder((0,19,-91),1.8,34,'marble',n=16)
        k.box((0,1.5,-91),(7,3,7),'trim')
        k.box((0,2,0),(7,4,4),'marble')
        return
    k.box((0,-.7,0),(1200,1.2,1200),'earth')
    k.box((0,-.18,0),(110,.35,86),'paving')
    rng=random.Random(125)
    for x in range(-54,55,6):
        for z in range(-42,43,6):
            k.box((x,.01,z),(5.94,.035,5.94),rng.choice(['paving','paving_light','paving_light','paving_dark']))
    # Low relief border and colored paving bands.
    for side in [-1,1]:
        k.box((side*42,.04,0),(.65,.045,85),'porphyry')
        k.box((0,.04,side*36),(84,.045,.65),'porphyry')
    basilica='rome125_basilica_ulpia_facade'
    k.box((0,13,-59),(116,26,29),'travertine',basilica)
    for level in [1.1,12.6,16,24.9]:
        k.box((0,level,-43.6),(117,.6,1.9),'trim',basilica)
    for i in range(19):
        x=(i-9)*5.7
        k.column(x,-41,11.5,.69,y=1.4,material='porphyry',group=basilica)
        k.column(x,-43,7.1,.45,y=16.3,group=basilica)
        if i%3==0:
            k.box((x,6,-44),(3.2,8,.25),'dark',basilica)
        # Recessed attic panels and trim above the lower portico.
        k.box((x,14.4,-43.3),(3.9,1.9,.22),'porphyry',basilica)
    for step in range(5):
        k.box((0,.12+step*.27,-40-step*.8),(114,.27,6-step*.7),'marble',basilica)
    k.roof((0,26.3,-59),122,32,4,'roof',basilica)
    k.box((0,29,-59),(89,7,13),'plaster',basilica)
    k.roof((0,32.5,-59),93,17,3,'roof_light',basilica)
    for x in range(-40,41,8):
        k.box((x,29,-52.4),(3,3,.15),'dark',basilica)
    # Continuous two-storey flank porticoes, back walls and covered roofs.
    for side in [-1,1]:
        k.box((side*58,10,0),(1.8,20,98),'travertine')
        k.box((side*51,10,0),(14,.8,98),'trim')
        k.box((side*51,19.6,0),(15,.7,99),'trim')
        k.box((side*51,20.2,0),(15,.5,100),'roof')
        for z in range(-39,44,7):
            k.column(side*45,z,9.5,.62,y=.35,material='marble')
            k.column(side*46,z,8,.46,y=10.7,material='porphyry')
            k.box((side*56.9,6,z),(.2,7.5,3.8),'shadow_stone')
            k.box((side*57,14,z),(.2,3.7,3.9),'plaster_light')
        # Stepped continuous edge framing the piazza.
        k.box((side*51,.25,0),(16,.5,97),'marble')
    # South entrance has real openings backed by a second closure ring of urban fabric.
    for x in range(-48,49,8):
        k.column(x,44,11,.68)
        if abs(x)>12: k.box((x,6,50),(6,12,2),'travertine')
    k.box((0,11.5,45),(112,1.6,5),'trim')
    for x in [-52,52]: k.box((x,8,47),(9,16,10),'marble')
    for x in range(-85,86,17):
        h=15+rng.random()*6
        k.box((x,h/2,83),(16,h,20),'plaster_light')
        k.roof((x,h,83),17,22,3)
        for window in [-4,4]: k.box((x+window,h-4,72.9),(2,3,.1),'dark')
    for side in [-1,1]:
        k.box((side*90,14,0),(35,28,220),'plaster')
    # Gilt equestrian monument, an explicitly inferred silhouette.
    statue='rome125_trajan_equestrian_statue'
    k.box((0,.35,0),(8,.7,5.4),'trim',statue)
    k.box((0,1.75,0),(6.2,2.2,3.8),'marble',statue)
    k.box((0,3.05,0),(7.1,.4,4.6),'trim',statue)
    k.ellipsoid((0,5.25,0),(2.1,.9,.68),'bronze',statue,n=16)
    for x,z in [(-1.4,-.4),(-1.4,.4),(1.2,-.4),(1.2,.4)]:
        k.rod((x,5,z),(x-.18,3.3,z),.17,'bronze_dark',statue)
    k.rod((1.4,5.2,0),(2.1,6.7,0),.43,'bronze',statue)
    k.ellipsoid((2.35,6.7,0),(.73,.35,.34),'bronze',statue)
    for z in [-.23,.23]: k.rod((2.1,6.9,z),(2,7.35,z),.095,'bronze_dark',statue)
    k.rod((-1.8,5.45,0),(-2.6,4.3,0),.15,'bronze_dark',statue)
    k.ellipsoid((-.25,6.35,0),(.5,.95,.44),'bronze',statue)
    k.ellipsoid((-.2,7.45,0),(.35,.42,.34),'bronze',statue)
    for z in [-.6,.6]: k.rod((-.25,6,z),(.4,4.9,z),.2,'bronze',statue)
    k.rod((-.2,6.7,-.4),(1,6.7,-.6),.15,'bronze',statue)
    k.rod((-.3,6.8,.4),(.5,7.2,.4),.15,'bronze',statue)
    # A single accessible east-portico Dacian figure; placement is provisional.
    dacian='rome125_dacian_prisoner_statue'; x,z=42,-9
    k.box((x,.6,z),(2.6,1.2,2.6),'marble',dacian)
    k.box((x,1.32,z),(2.9,.25,2.9),'trim',dacian)
    k.cylinder((x,2.7,z),.65,2.6,'porphyry',top=.5,n=12,group=dacian)
    k.ellipsoid((x,4.35,z),(.4,.48,.37),'marble',dacian)
    k.cylinder((x,4.8,z),.39,.47,'porphyry',top=.12,n=10,group=dacian)
    k.rod((x-.52,3.75,z),(x+.25,3,z+.6),.2,'porphyry',dacian)
    k.rod((x+.52,3.75,z),(x-.25,3,z+.6),.2,'porphyry',dacian)
    for side in [-1,1]:
        for z in [-75,70]: k.tree(side*69,z)


def inscription(k,text,center,y,z,width,group):
    """Original line-drawn Roman capitals; no font or texture dependency."""
    glyphs={
        'M': [[(0,0),(0,1),(.5,.4),(1,1),(1,0)]],
        'A': [[(0,0),(.5,1),(1,0)],[(.2,.4),(.8,.4)]],
        'G': [[(1,.8),(.8,1),(.2,1),(0,.8),(0,.2),(.2,0),(1,0),(1,.5),(.55,.5)]],
        'R': [[(0,0),(0,1),(.8,1),(1,.8),(1,.6),(.8,.5),(0,.5)],[(.5,.5),(1,0)]],
        'I': [[(0,1),(1,1)],[(.5,1),(.5,0)],[(0,0),(1,0)]],
        'P': [[(0,0),(0,1),(.8,1),(1,.8),(1,.6),(.8,.5),(0,.5)]],
        'L': [[(0,1),(0,0),(1,0)]],
        'F': [[(0,0),(0,1),(1,1)],[(0,.55),(.8,.55)]],
        'C': [[(1,.8),(.8,1),(.2,1),(0,.8),(0,.2),(.2,0),(.8,0),(1,.2)]],
        'O': [[(.2,0),(0,.2),(0,.8),(.2,1),(.8,1),(1,.8),(1,.2),(.8,0),(.2,0)]],
        'S': [[(1,.85),(.8,1),(.2,1),(0,.8),(.1,.6),(.9,.4),(1,.2),(.8,0),(.2,0),(0,.15)]],
        'T': [[(0,1),(1,1)],[(.5,1),(.5,0)]],
        'E': [[(1,1),(0,1),(0,0),(1,0)],[(0,.5),(.8,.5)]],
        'V': [[(0,1),(.5,0),(1,1)]],
    }
    size=width/(len(text)*1.3)
    for i,char in enumerate(text):
        for stroke in glyphs.get(char,[]):
            for a,b in zip(stroke,stroke[1:]):
                def point(v): return (center+width/2-(i*1.3+v[0])*size,y+v[1]*size,z)
                k.rod(point(a),point(b),size*.047,'letter',group,n=6)


def pantheon(k):
    k.box((0,-.6,0),(1200,1.1,1200),'earth')
    k.box((0,-.13,-30),(82,.24,160),'paving')
    rng=random.Random(126)
    for x in range(-36,37,4):
        for z in range(-92,25,4):
            k.box((x,.005,z),(3.95,.025,3.95),rng.choice(['paving_light','paving_light','paving']))
    # The rotunda and dome are exterior scenery, not an enterable interior.
    k.cylinder((0,11,28),22,22,'shadow_stone',n=64)
    for y in [2,10,20.8,22.5]: k.cylinder((0,y,28),22.4,.6,'travertine',n=64)
    k.ellipsoid((0,22,28),(22.4,21,22.4),'travertine',n=64,rings=20)
    # Eight visible front columns, with paired inner rows: sixteen monoliths.
    columns='rome125_pantheon_granite_columns'
    for x in [-14.7,-10.5,-6.3,-2.1,2.1,6.3,10.5,14.7]:
        k.column(x,-7,13.7,.76,y=1.4,material='shadow_stone',group=columns)
    for z in [0,7]:
        for x in [-14.7,-6.3,6.3,14.7]: k.column(x,z,13.7,.76,y=1.4,material='shadow_stone',group=columns)
    k.box((0,1,1),(36,1,25),'marble')
    for step in range(5): k.box((0,.14+step*.27,-15+step*.75),(36,.28,6-step*.65),'marble')
    k.box((0,8.2,11.5),(33,14.2,1.5),'travertine')
    k.box((0,6.5,10.65),(6.8,10,.22),'bronze_dark')
    for x in [-5,5]: k.column(x,10.3,11.2,.5,y=1.4,material='porphyry')
    k.box((0,15.65,1),(36,1,24),'trim')
    label='rome125_pantheon_agrippa_inscription'
    k.box((0,16.6,-9.6),(36,1.6,2.8),'travertine',label)
    inscription(k,'M AGRIPPA L F COS TERTIVM FECIT',0,16.13,-11.05,31,label)
    k.box((0,17.55,1),(37,.4,25),'trim')
    # Solid triangular pediment with an inset field and projecting cornice.
    k.roof((0,17.75,1),37,25,5.4,'travertine')
    k.roof((0,18.1,-11.65),33,.15,4.6,'shadow_stone')
    for a,b in [((-19,17.8,-12),(0,23.4,-12)),((0,23.4,-12),(19,17.8,-12))]: k.rod(a,b,.23,'trim',n=6)
    # Controlled north approach: two continuous side colonnades, no modern fountain.
    court='rome125_pantheon_forecourt_colonnade'
    for side in [-1,1]:
        k.box((side*36,8,-35),(2,16,110),'plaster',court)
        k.box((side*31,12.4,-35),(12,.65,110),'trim',court)
        k.box((side*31,13.1,-35),(12,.65,112),'roof',court)
        for z in range(-83,13,6):
            k.column(side*26,z,12,.64,y=.3,group=court)
            k.box((side*34.8,5.2,z),(.15,7.5,3.4),'shadow_stone',court)
        k.box((side*31,.15,-35),(12,.3,111),'marble',court)
    # Closed urban ring behind the entry, with doorways and terracotta roofs.
    for x in range(-65,66,13):
        h=15+rng.random()*6
        k.box((x,h/2,-107),(12,h,20),'plaster_light'); k.roof((x,h,-107),13,22,3)
        for window in [-3,3]: k.box((x+window,h-4,-96.9),(1.6,2.4,.1),'dark')
        k.box((x,3,-96.8),(2.5,6,.1),'wood')
    for x in [-25,-12,0,12,25]: k.column(x,-91,10,.55)
    k.box((0,10.5,-91),(60,1.2,5),'trim')
    for side in [-1,1]:
        k.box((side*75,14,-20),(50,28,200),'plaster')
        for z in [-85,35,65]: k.tree(side*46,z)


def arch(k,p,r=2.2,spring=5.4,depth=3.5,angle=0,group=None):
    """Visible masonry around an open arched bay; no invisible selection collider."""
    x,y,z=p; c,s=math.cos(angle),math.sin(angle); outer=r+.8
    for side in [-1,1]:
        k.box((x+side*(r+.4)*c,y+spring/2,z-side*(r+.4)*s),(.8,spring,depth),'travertine',group,angle)
    for i in range(12):
        a=i*math.pi/12; b=(i+1)*math.pi/12
        local=[(r*math.cos(a),spring+r*math.sin(a)),(outer*math.cos(a),spring+outer*math.sin(a)),(outer*math.cos(b),spring+outer*math.sin(b)),(r*math.cos(b),spring+r*math.sin(b))]
        vertices=[(x+u*c+v*s,y+h,z-u*s+v*c) for v in [-depth/2,depth/2] for u,h in local]
        k.mesh(vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'marble' if i%3==0 else 'travertine',group)


def colosseum(k):
    rng=random.Random(127)
    k.box((0,-.65,0),(1600,1.2,1600),'earth')
    k.box((22,-.09,0),(155,.15,160),'paving')
    k.box((-25,-.07,-80),(55,.12,270),'paving_dark')
    for x in range(-30,49,6):
        for z in range(-54,61,6): k.box((x,.02,z),(5.96,.035,5.96),rng.choice(['paving','paving','paving_light']))
    # Full intact Flavian ellipse at 188 x 156 m, three arcaded storeys and attic.
    amph='rome125_colosseum_outer_arcade'; cx=175
    for i in range(80):
        a=i*math.tau/80
        tx,tz=-94*math.sin(a),78*math.cos(a); angle=math.atan2(-tz,tx)
        x,z=cx+94*math.cos(a),78*math.sin(a)
        for tier in range(3):
            arch(k,(x,1+tier*11,z),r=2.05,spring=5.9,depth=3.8,angle=angle,group=amph)
            # Engaged orders between bays are simplified by storey.
            ax,az=cx+95.8*math.cos(a+.0375),79.8*math.sin(a+.0375)
            k.cylinder((ax,5.7+tier*11,az),.42,8.8,'marble',top=.36,n=8,group=amph)
            k.box((ax,10.35+tier*11,az),(1.2,.5,1.2),'trim',amph,angle)
        for y in [.6,11.1,22.1,33.1,45.8,48]:
            k.box((x,y,z),(7.65,1.0,5.2),'trim',amph,angle)
        k.box((x,39.5,z),(7.7,11.6,3.8),'travertine',amph,angle)
        # Rectangular attic openings represented by recessed dark faces.
        if i%2==0:
            nx,nz=cx+96*math.cos(a),80*math.sin(a)
            k.box((nx,40,nz),(2.2,3.5,.16),'dark',amph,angle)
        # Deep circulation behind the open bays closes sightlines without false glass.
        k.box((cx+85*math.cos(a),18,69*math.sin(a)),(7.5,36,2.6),'shadow_stone',amph,angle)
        if i%4==0: k.cylinder((cx+94*math.cos(a),50,78*math.sin(a)),.15,6,'wood',n=6,group=amph)
    # Fountain at the southeast junction, with an illustrative water treatment.
    fountain='rome125_meta_sudans'; fx,fz=16,36
    k.cylinder((fx,.45,fz),9,.9,'travertine',n=48,group=fountain)
    k.cylinder((fx,.94,fz),7.9,.16,'water',n=48,group=fountain)
    k.cylinder((fx,8,fz),3.4,14,'travertine',top=.45,n=32,group=fountain)
    k.cylinder((fx,15.3,fz),.7,.8,'trim',n=16,group=fountain)
    for i in range(12):
        a=i*math.tau/12
        k.rod((fx+.48*math.cos(a),14.9,fz+.48*math.sin(a)),(fx+3.3*math.cos(a),1.1,fz+3.3*math.sin(a)),.04,'water',fountain)
    # Hadrian's unfinished platform: no completed cella or pediment in 125.
    works='rome125_venus_roma_worksite'
    k.box((-120,1.5,-10),(170,3,95),'travertine',works)
    for side in [-1,1]:
        for x in [-44,-66,-88,-110,-132,-154,-176,-198]:
            height=rng.choice([2.2,3.4,5,7,9])
            k.cylinder((x,3+height/2,-10+side*42),1.1,height,'marble',n=16,group=works)
            k.box((x,3.2,-10+side*42),(3,.4,3),'trim',works)
    for i in range(20):
        x=-65-rng.random()*120; z=-38+rng.random()*55
        for level in range(rng.choice([1,2,3])): k.box((x,3.5+level*1.05,z),(4,1,2.5),'shadow_stone',works)
    for x,z in [(-65,14),(-140,-18)]:
        k.rod((x-5,3,z-4),(x,21,z),.3,'wood',works)
        k.rod((x+5,3,z-4),(x,21,z),.3,'wood',works)
        k.rod((x,3,z+6),(x,21,z),.3,'wood',works)
        k.rod((x-8,19,z),(x+10,23,z),.25,'wood',works)
        k.rod((x+9,22.8,z),(x+9,7,z),.055,'dark',works)
        k.box((x+9,6.5,z),(2,1,1.5),'marble',works)
    for z in [-51,31]:
        for x in range(-206,-29,8):
            k.rod((x,0,z),(x,4,z),.16,'wood',works)
        k.rod((-206,3,z),(-30,3,z),.13,'wood',works)
    # Palatine slope to the south; an economical, continuous urban closure ring.
    k.ellipsoid((-45,-28,205),(235,70,140),'grass',n=36,rings=12)
    k.box((-45,43,220),(160,35,75),'plaster_light')
    k.roof((-45,60.5,220),166,79,8)
    for x in range(-113,28,14): k.column(x,177,14,.85,y=27,detail=False)
    # North/northwest route threshold evokes the Arch of Titus, not Constantine.
    arch(k,(-42,0,-135),r=4.2,spring=7.2,depth=6,angle=0)
    for side in [-1,1]: k.box((-42+side*8,7.5,-135),(6,15,8),'travertine')
    k.box((-42,15,-135),(23,5,8),'trim')
    for i in range(60):
        a=i*math.tau/60; x=330*math.cos(a); z=300*math.sin(a)
        if z>130: continue
        height=rng.uniform(17,30)
        k.box((x,height/2,z),(39,height,34),rng.choice(['plaster','plaster_light']))
        k.roof((x,height,z),41,36,5)
        if i%3==0: k.tree(x*.9,z*.9,h=16)
    for x,z in [(-100,95),(-180,122),(60,175),(-245,-95),(-235,80)]: k.tree(x,z,h=17)
