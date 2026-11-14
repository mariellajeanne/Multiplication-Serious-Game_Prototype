"""Import approved illustration outputs and slice isolated transparent sprite atlases.

Usage: python scripts/import-bakery-art.py <built-in image generation directory>
No recoloring, painting, filtering, or image synthesis is performed here.
"""
import json
from collections import deque
from pathlib import Path
import sys
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(sys.argv[1])
OUT=ROOT/'assets/bakery-ui/illustrated'
OUT.mkdir(parents=True,exist_ok=True)
FILES={
 'room':'exec-d04d2f4d-320d-4aa3-aaec-cd3959767b8c.png',
 'cabinet':'exec-6d1e2acc-6980-4c56-8c0c-9467810b50f2.png',
 'clipboard':'exec-3d39d346-34e2-4e4c-8e89-4fc818dd0925.png',
 'title':'exec-8f412706-7d6d-4aee-99b1-be7f576e7a23.png',
 'register':'exec-39d71d25-8eff-403d-85a0-86d7db92cc29.png',
 'home-controls':'exec-fba99596-4894-48e9-80a5-91b554ba6b68.png',
 'tickets':'exec-93d1b6b4-bc50-4068-bb35-1fe743fc2e8b.png',
 'coins':'exec-c56f9ca0-96db-4f45-b84a-5c95e73c530a.png',
 'foods':'exec-916f6593-78cf-46c6-a3c3-310fc2d0466c.png',
 'controls':'exec-d8bec8ad-78de-4d82-8d39-5f0bde397520.png',
}
manifest={}

def save(im,name,trim=True):
 if trim and im.mode=='RGBA':
  bounds=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
  if bounds:im=im.crop(bounds)
 im.save(OUT/(name+'.png'),optimize=True)
 manifest[name]={'size':im.size}
 return im

for name in ['room','cabinet','clipboard','title','register']:
 im=Image.open(SOURCE/FILES[name]);original={'room':'bakery-room.png','cabinet':'cabinet-wood.png','clipboard':'clipboard-wood.png','title':'title-sign-refined.png','register':'cash-register-facing.png'}[name]
 size=Image.open(ROOT/'assets/bakery-ui'/original).size
 save(im.resize(size,Image.Resampling.LANCZOS),name,trim=False)

def cells(atlas,cols,rows):
 im=Image.open(SOURCE/FILES[atlas]).convert('RGBA')
 for i in range(cols*rows):
  yield im.crop((round(i%cols*im.width/cols),round(i//cols*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows)))

def isolated_cell(im):
 """Choose the sprite's crop, excluding any disconnected adjacent-cell fragment."""
 alpha=im.getchannel('A');seen=set();largest=[]
 for y in range(im.height):
  for x in range(im.width):
   if (x,y) in seen or alpha.getpixel((x,y))<128:continue
   queue=deque([(x,y)]);seen.add((x,y));component=[]
   while queue:
    px,py=queue.popleft();component.append((px,py))
    for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
     if 0<=nx<im.width and 0<=ny<im.height and (nx,ny) not in seen and alpha.getpixel((nx,ny))>=128:
      seen.add((nx,ny));queue.append((nx,ny))
   if len(component)>len(largest):largest=component
 xs,ys=zip(*largest)
 bounds=(max(0,min(xs)-2),max(0,min(ys)-2),min(im.width,max(xs)+3),min(im.height,max(ys)+3))
 clean=Image.new('RGBA',im.size);clean.paste(im.crop(bounds),bounds[:2]);return clean

for i,im in enumerate(cells('tickets',2,4)):
 save(isolated_cell(im),f'ticket-{i+1:02}',trim=False)
# Objects retain their original equal cell bounds and their designed size hierarchy.
for i,im in enumerate(cells('coins',4,2)):save(isolated_cell(im),f'coin-{i+1:02}',trim=False)
for i,im in enumerate(cells('foods',4,5)):
 if i<17:save(isolated_cell(im),f'food-{i+1:02}',trim=False)
for name,im in zip(['button-cream','button-gold','button-teal','help','settings','close','boost','cloche','thumb'],cells('controls',3,3)):
 if name!='button-gold':save(im,name)

home=Image.open(SOURCE/FILES['home-controls']).convert('RGBA')
# Crop the atlas's deliberately isolated objects; their rows have different heights.
home_bounds=[(35,107,740,356),(771,129,1499,336),(31,434,758,705),(791,384,1511,711),(25,769,764,949),(795,768,1508,963)]
for name,bounds in zip(['nav-packages','nav-play','nav-collection','packages-entry','menu-heading','wallet'],home_bounds):
 im=home.crop(bounds)
 # Dedicated icon+text illustrations retain their original spacing and aspect.
 # Never extend a pixel column between icon and text to fill an unrelated slot.
 if name=='wallet':
  continue  # Its live number field retains the established HUD registration.
 save(im,name,trim=False)

(OUT/'provenance.json').write_text(json.dumps({
 'tool':'Built-in image_gen',
 'direction':'User references: illustrated bakery drawing and eight progressive ticket designs; Coin Bag blue, Coin Bucket purple, Coin Cart yellow.',
 'construction':'Art in place: original panel footprints, source canvas roles, masks, scrolling, hit regions and popup placement retained. Reference illustrations fit the existing slots. Dynamic numbers stay live.',
 'source_outputs':FILES,'assets':manifest,
 'prompts':[
  'Faithfully recreate reference bakery composition and simplified dimensional illustration, leaving center empty for independent live UI.',
  'Illustrated empty caramel display cabinet and clipboard; reference-style My Panaderya sign; teal/cream register.',
  'Eight blank wide ticket frames following reference silhouettes and ornaments, cream/mint/blue/purple/yellow/coral/gold/rainbow; three empty internal panels and blank top plaque.',
  'Eight isolated coin reward silhouettes, from modest stack to crowned winged treasury, consistent cell bounds.',
  'Seventeen Filipino bakery foods in catalog order. Remove grain, crumbs and speckling; broad clean cel shading and consistent outlines.',
  'Matching illustrated cream/gold/teal blank pill controls, help/settings/close, boost diamond, serving cloche and scrollbar thumb.',
  'Reusable cream popup frame, caramel wood rim, gold inner bevel, narrow teal accent, nine-slice compatible edges.'
 ]},indent=2),encoding='utf-8')
print(f'Imported {len(manifest)} illustrated assets into {OUT}')
