"""Package original Kyoto Blender renders; no external media or network required.
Perspective resampling reuses the proven Rome panorama projection convention.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'blender/source/kyoto-1700/renders'
DEST=ROOT/'public/images/kyoto-1700'
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


def asset(image,name,quality,budget):
    path=DEST/name; image.save(path,'WEBP',quality=quality,method=6)
    data=path.read_bytes(); digest=hashlib.sha256(data).hexdigest()
    assert len(data)<=budget, f'{name}: exceeds image budget'
    return {'url':f'/images/kyoto-1700/{name}?v={digest[:12]}','width':image.width,'height':image.height,'bytes':len(data),'sha256':digest}

def package():
    DEST.mkdir(parents=True,exist_ok=True)
    manifest={'generator':'Blender Cycles panoramas; built-in ImageGen overview illustrations from Blender layouts; package_kyoto_renders.py','projection':'equirectangular; center north (-Z); positive yaw west; positive pitch up; radians','provenance':'Panoramas use original Blender geometry, shaders and static figures. Overview illustrations use built-in ImageGen with original Blender layout references. No third-party visual media copied. All fine architecture/staging is inferred or illustrative; see docs/visual/KYOTO_1700_CONTENT_REVIEW.md and KYOTO_1700_ASSETS.md.','overview':{},'panoramas':{}}
    illustrated=(SOURCE.parent/'overview-illustration.png').exists() and (SOURCE.parent/'overview-mobile-illustration.png').exists()
    overview_paths={variant: SOURCE.parent/f'overview{"-mobile" if variant=="mobile" else ""}-illustration.png' if illustrated else SOURCE/f'overview-{variant}.png' for variant in ['desktop','mobile']}
    if (SOURCE/'overview.json').exists():
        for variant in ['desktop','mobile']:
            src=Image.open(overview_paths[variant]).convert('RGB')
            manifest['overview'][variant]=asset(src,f'overview{"-mobile" if variant=="mobile" else ""}.webp',88,1_500_000)
        small=Image.open(overview_paths['desktop']).convert('RGB'); small.thumbnail((1280,800),Image.Resampling.LANCZOS)
        manifest['overview']['fallback']=asset(small,'overview-fallback.webp',78,500_000)
        manifest['overview']['markers']=json.loads((SOURCE.parent/'overview-illustration.markers.json').read_text()) if illustrated else json.loads((SOURCE/'overview.json').read_text())['markers']
    for name in ['nijo-ninomaru','kiyomizu-hillside','nishiki-fish-market']:
        if not (SOURCE/f'{name}.json').exists(): continue
        meta=json.loads((SOURCE/f'{name}.json').read_text()); src=Image.open(SOURCE/f'{name}-360.png').convert('RGB')
        assert src.width==2*src.height
        data={'desktop':asset(src,f'{name}-360.webp',90,6_000_000)}
        data['mobile']=asset(src.resize((2048,1024),Image.Resampling.LANCZOS),f'{name}-360-mobile.webp',88,3_000_000)
        d=[meta['initialTarget'][i]-meta['eye'][i] for i in range(3)]
        fallback=perspective(src,math.atan2(-d[0],-d[2]),math.atan2(d[1],math.hypot(d[0],d[2])),1600,1000,50)
        data['fallback']=asset(fallback,f'{name}-fallback.webp',85,500_000)
        data['hotspots']=[{key:value for key,value in h.items() if key!='anchor'} for h in meta['hotspots']]
        data['anchors']={h['objectId']:h['anchor'] for h in meta['hotspots']}
        pixels=np.asarray(src).astype(float); data['seamMeanRGBDifference']=round(float(np.abs(pixels[:,0]-pixels[:,-1]).mean()),3)
        sheet=Image.new('RGB',(1920,1256),'#ede8dc'); draw=ImageDraw.Draw(sheet)
        for i,(direction,yaw) in enumerate([('North',0),('East',-math.pi/2),('South',math.pi),('West',math.pi/2)]):
            x=(i%2)*960; y=(i//2)*628; sheet.paste(perspective(src,yaw,.1,960,600,65),(x,y+28)); draw.text((x+12,y+9),f'{name} — {direction}',fill='#25342b')
        sheet.save(SOURCE/f'{name}-cardinal-review.jpg',quality=91)
        manifest['panoramas'][name]=data
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({name:{'desktop':v['desktop']['bytes'],'mobile':v['mobile']['bytes'],'seam':v['seamMeanRGBDifference']} for name,v in manifest['panoramas'].items()},indent=2))

if __name__=='__main__': package()
