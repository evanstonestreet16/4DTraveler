"""Compress authored renders and project review/fallback views from the actual 360 image.
Requires Pillow and NumPy. Packaging is local; AI art inputs are checked in offline.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'blender/source/rome-125/renders'
DEST=ROOT/'public/images/rome-125'


def perspective(source, yaw, pitch=0, width=1440, height=900, fov=70):
    """North=0, +yaw west, +pitch up, matching the runtime Three YXZ view."""
    pixels=np.asarray(source.convert('RGB'))
    xx,yy=np.meshgrid((np.arange(width)+.5)/width*2-1,1-(np.arange(height)+.5)/height*2)
    xx*=math.tan(math.radians(fov)/2)*width/height; yy*=math.tan(math.radians(fov)/2)
    forward=np.array([-math.sin(yaw)*math.cos(pitch),math.sin(pitch),-math.cos(yaw)*math.cos(pitch)])
    right=np.array([math.cos(yaw),0,-math.sin(yaw)])
    up=np.array([math.sin(yaw)*math.sin(pitch),math.cos(pitch),math.cos(yaw)*math.sin(pitch)])
    rays=forward+xx[...,None]*right+yy[...,None]*up
    rays/=np.linalg.norm(rays,axis=2)[...,None]
    angle=np.arctan2(-rays[...,0],-rays[...,2]); elevation=np.arcsin(rays[...,1])
    px=((.5-angle/(2*math.pi))*source.width-.5)%source.width
    py=np.clip((.5-elevation/math.pi)*source.height-.5,0,source.height-1)
    x0=np.floor(px).astype(int); y0=np.floor(py).astype(int); x1=(x0+1)%source.width; y1=np.minimum(y0+1,source.height-1)
    xf=(px-x0)[...,None]; yf=(py-y0)[...,None]
    out=(pixels[y0,x0]*(1-xf)*(1-yf)+pixels[y0,x1]*xf*(1-yf)+pixels[y1,x0]*(1-xf)*yf+pixels[y1,x1]*xf*yf)
    return Image.fromarray(np.uint8(np.clip(out,0,255)))


def save_asset(image,name,quality,budget):
    path=DEST/name; image.save(path,'WEBP',quality=quality,method=6)
    assert path.stat().st_size<=budget, f'{name} exceeds budget'
    data=path.read_bytes(); digest=hashlib.sha256(data).hexdigest()
    return {'url':f'/images/rome-125/{name}?v={digest[:12]}','width':image.width,'height':image.height,'bytes':len(data),'sha256':digest}


def package(panoramas_only=False):
    DEST.mkdir(parents=True,exist_ok=True)
    manifest={'generator':'blender/scripts/render_rome.py + package_rome_renders.py','projection':'equirectangular; center north (-Z), +yaw west (-X), +pitch up; radians','provenance':'POI panoramas are interpretive reconstructions with authored geometry, people, foliage and physical lighting. Their AI-generated sky and generic stone surface art are offline appearance inputs, not historical evidence; POI architecture and object placement are not AI-generated. The separately authored overview may use additional enhancement; consult overview.provenance for its image-specific process.', 'overview':{},'panoramas':{}}
    manifest['aiInputs'] = [
        {'path':str(path.relative_to(ROOT)), 'role':role, 'generator':'Codex built-in image generation', 'historicalEvidence':False, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        for path,role in [
            (ROOT/'blender/assets/rome-125/ai/mediterranean-sky.png', 'sky-background'),
            (ROOT/'blender/assets/rome-125/ai/travertine-albedo.png', 'generic-stone-albedo'),
        ]
    ]
    manifest['references']=[
        {'id':'R1','url':'https://www.uffizi.it/en/online-exhibitions/following-in-trajan-s-footsteps-hypervision','supports':'Forum plan/envelope and monument relationships','reuse':'Link-only research; no copied source images or geometry'},
        {'id':'R6','url':'https://smarthistory.org/the-pantheon/','supports':'Pantheon forecourt, porch proportions and granite column context','reuse':'Link-only research; original interpreted model'},
        {'id':'R7','url':'https://colosseo.it/en/area/the-colosseum/','supports':'Amphitheatre architectural system and intact Flavian silhouette','reuse':'Link-only research; original interpreted model'},
        {'id':'R8','url':'https://colosseo.it/en/area/arch-of-constantine-and-meta-sudans/','supports':'Meta Sudans general fountain form','reuse':'Link-only research; later Arch of Constantine excluded'},
        {'id':'R9','url':'https://colosseo.it/en/marvels/temple-of-venus-and-roma/','supports':'Temple project chronology; exact 125 construction stage is illustrative','reuse':'Link-only research; original interpreted worksite'},
    ]
    if panoramas_only:
        # The dedicated overview workstream owns its assets and projection metadata.
        manifest['overview']=json.loads((DEST/'manifest.json').read_text())['overview']
    else:
        meta=json.loads((SOURCE/'overview.json').read_text())
        for variant in ['desktop','mobile']:
            src=Image.open(SOURCE/f'overview-{variant}.png').convert('RGB')
            manifest['overview'][variant]=save_asset(src,f'overview{"-mobile" if variant=="mobile" else ""}.webp',88,1_500_000)
        overview=Image.open(SOURCE/'overview-desktop.png').convert('RGB'); overview.thumbnail((1280,800),Image.Resampling.LANCZOS)
        manifest['overview']['fallback']=save_asset(overview,'overview-fallback.webp',76,500_000)
        manifest['overview']['markers']=meta['markers']
        manifest['overview']['cameras']=meta.get('cameras',{})
    for name in ['forum-trajan','pantheon-forecourt','colosseum-valley']:
        if not (SOURCE/f'{name}-360.png').exists(): continue
        src=Image.open(SOURCE/f'{name}-360.png').convert('RGB'); meta=json.loads((SOURCE/f'{name}.json').read_text())
        assert src.width==2*src.height
        data={'desktop':save_asset(src,f'{name}-360.webp',90,6_000_000)}
        src=Image.open(DEST/f'{name}-360.webp').convert('RGB')
        # A narrow portrait view magnifies a small part of the sphere: retain 4K detail.
        mobile=src.resize((4096,2048),Image.Resampling.LANCZOS)
        data['mobile']=save_asset(mobile,f'{name}-360-mobile.webp',88,3_000_000)
        delta=[meta['initialTarget'][i]-meta['eye'][i] for i in range(3)]
        yaw=math.atan2(-delta[0],-delta[2]); pitch=math.atan2(delta[1],math.hypot(delta[0],delta[2]))
        fallback=perspective(src,yaw,pitch,1600,1000,50)
        data['fallback']=save_asset(fallback,f'{name}-fallback.webp',84,500_000)
        data['hotspots']=[{key:value for key,value in h.items() if key!='anchor'} for h in meta['hotspots']]
        data['eye']=meta['eye']; data['initialTarget']=meta['initialTarget']; data['anchors']={h['objectId']:h['anchor'] for h in meta['hotspots']}
        pixels=np.asarray(src).astype(float)
        data['seamMeanRGBDifference']=round(float(np.abs(pixels[:,0]-pixels[:,-1]).mean()),3)
        # Inspect all cardinal directions and both pixel edges from the shipped panorama.
        sheet=Image.new('RGB',(1920,1256),'#eeeae0'); draw=ImageDraw.Draw(sheet)
        for i,(direction,angle) in enumerate([('North',0),('East',-math.pi/2),('South',math.pi),('West',math.pi/2)]):
            view=perspective(src,angle,.1,960,600,65); x=(i%2)*960; y=(i//2)*628
            sheet.paste(view,(x,y+28)); draw.text((x+12,y+9),f'{name}: {direction}',fill='#233831')
        sheet.save(SOURCE/f'{name}-cardinal-review.jpg',quality=92)
        data['review']='Cardinal views and longitudinal seam measured from final delivered pixels; see authored render folder.'
        manifest['panoramas'][name]=data
    if panoramas_only:
        manifest['overview']=json.loads((DEST/'manifest.json').read_text())['overview']
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'overview':manifest['overview'],'panoramas':{k:{'desktop':v['desktop'],'mobile':v['mobile'],'seam':v['seamMeanRGBDifference']} for k,v in manifest['panoramas'].items()}},indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--panoramas-only',action='store_true',help='Preserve delivered overview images and manifest.overview during independent POI updates.')
    package(parser.parse_args().panoramas_only)
