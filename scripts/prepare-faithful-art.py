"""Source-preserving second-round exports. No previous editor or derived art inputs.
Usage: python scripts/prepare-faithful-art.py ORIGINAL_ASSETS_ZIP GENERATED_DIRECTORY
Requires Pillow, numpy and scipy for development only; runtime is static.
"""
import hashlib, io, json, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
from scipy import ndimage

OUT=Path(__file__).resolve().parents[1]/'assets/bakery-faithful'
OUT.mkdir(parents=True,exist_ok=True)
manifest=[]
archive=zipfile.ZipFile(sys.argv[1])

def original(name):return Image.open(io.BytesIO(archive.read('images/'+name))).convert('RGBA')
def clean(im,largest=False):
 a=np.array(im);a[:,:,3][a[:,:,3]<24]=0
 if largest:
  labels,_=ndimage.label(a[:,:,3]>40);sizes=np.bincount(labels.ravel());sizes[0]=0
  keep=ndimage.binary_dilation(labels==sizes.argmax(),iterations=2)
  a[:,:,3]=np.where(keep,a[:,:,3],0)
 return Image.fromarray(a)
def save(im,name,source,adaptation='',crop=None,trim=False):
 if trim:
  bbox=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
  im=ImageOps.expand(im.crop(bbox),4,fill=(0,0,0,0))
 if max(im.size)>1800 and not name.startswith('background'):
  im.thumbnail((1800,1800),Image.Resampling.LANCZOS)
 if name.endswith('.webp'):im.convert('RGB').save(OUT/name,quality=94)
 else:im.save(OUT/name)
 member='images/'+source
 manifest.append(dict(file=name,source=source,crop=crop,adaptation=adaptation,size=list(im.size),
  source_sha256=hashlib.sha256(archive.read(member)).hexdigest() if member in archive.namelist() else None))
def cut(source,bounds,name,largest=True):save(clean(original(source).crop(bounds),largest),name,source,'isolated original pixels',bounds,True)

source='Cute Bakery Kiosk Menu Frame.png';im=original(source);a=np.array(im)
neutral=(a[:,:,:3].max(2)-a[:,:,:3].min(2)<35)&(a[:,:,:3].min(2)>180)
seed=np.zeros(neutral.shape,bool);seed[0,:]=neutral[0,:];seed[-1,:]=neutral[-1,:];seed[:,0]=neutral[:,0];seed[:,-1]=neutral[:,-1]
outside=ndimage.binary_propagation(seed,mask=neutral);a[:,:,3][outside]=0
save(clean(Image.fromarray(a),True),'menu-frame.png',source,'connected exterior checkerboard removed, original silhouette retained')
for source,name in [('Glossy Bakery Orders Board.png','orders-frame.png'),('Glossy Packages Game UI Frame.png','packages-frame.png')]:save(clean(original(source)) ,name,source)
source='Glossy Bakery Orders Board.png';im=clean(original(source),True)
save(im.crop((0,0,1367,320)),'orders-top.png',source,'independent original top cap')
save(im.crop((0,940,1367,1151)),'orders-bottom.png',source,'independent original bottom cap')
body=np.array(im.crop((0,320,1367,940)))
for y in range(58,600):body[y,1050:1116]=body[y,1025]
save(Image.fromarray(body),'orders-middle.png',source,'straight posts extend vertically; old thumb track removed for independent capped rail')
rail=np.array(im.crop((1053,376,1110,917)));rgb=rail[:,:,:3].astype(int)
bg=(rgb[:,:,0]<170)&(rgb[:,:,1]<100)&(rgb[:,:,2]<95)
edge=np.zeros(bg.shape,bool);edge[0]=bg[0];edge[-1]=bg[-1];edge[:,0]=bg[:,0];edge[:,-1]=bg[:,-1]
rail[:,:,3][ndimage.binary_propagation(edge,mask=bg)]=0
save(Image.fromarray(rail),'scroll-rail.png',source,'independent rail, exterior brown removed, 28px caps retained')

source='panaderya_golden_buttons_equal_pressed.png'
for name,bounds in [('gold',(0,0,1024,341)),('gold-hover',(1024,0,2048,341)),('gold-pressed',(0,341,1024,682)),('gold-selected',(1024,341,2048,682))]:cut(source,bounds,name+'.png')
source='panaderya_coins_boost_equal_pressed.png'
for row,name in enumerate(['coins','boost']):
 for col,state in enumerate(['','-hover','-pressed']):cut(source,(col*682,row*341,(col+1)*682,(row+1)*341),name+state+'.png')
source='panaderya_help_settings_equal_pressed.png'
for row,name in enumerate(['help','settings']):
 for col,state in enumerate(['','-hover','-pressed']):cut(source,(col*482,row*543,(col+1)*482,(row+1)*543),name+state+'.png')
source='Candy-Style Gift, Chef Hat, and Clipboard Icons.png'
for col,name in enumerate(['gift-icon','hat-icon','orders-icon']):cut(source,(col*724,0,(col+1)*724,724),name+'.png')
source='My_Panaderya_Orders_Button_Assets_Final_Spaced.png'
for name,bounds in [('utility',(70,70,990,350)),('refresh-icon',(1060,420,1430,800)),('utility-gift',(1570,420,1990,820))]:cut(source,bounds,name+'.png')
source='packages.png'
package_bounds=[(15,145,350,504),(353,125,703,512),(697,65,1048,514),(1048,135,1440,520),(0,565,350,985),(345,570,699,985),(676,548,1063,985),(1049,530,1448,985)]
for index,bounds in enumerate(package_bounds):
 im=original(source).crop(bounds);a=np.array(im);labels,_=ndimage.label(a[:,:,3]>40);sizes=np.bincount(labels.ravel());sizes[0]=0;main=sizes.argmax()
 boundary=set(np.concatenate([labels[0],labels[-1],labels[:,0],labels[:,-1]]));boundary.discard(main)
 keep=~np.isin(labels,list(boundary));a[:,:,3]=np.where(keep,a[:,:,3],0)
 save(Image.fromarray(a),f'package-{index+1:02}.png',source,'individual non-grid crop, neighboring components at crop boundary removed',bounds,True)

source=next(n[7:] for n in archive.namelist() if 'Interior.png' in n)
bg=original(source).convert('RGB');bg=ImageEnhance.Color(bg).enhance(.88)
bg=Image.blend(bg,Image.new('RGB',bg.size,'#fff2c8'),.42).filter(ImageFilter.GaussianBlur(1.25))
save(bg,'background.webp',source,'42% warm cream blend; .88 saturation; 1.25px source blur; runtime filters configurable')

# Source concept components are cropped independently, never displayed as screens.
menu='concept art/Integrated Bakery Menu Display (1).png';orders='concept art/Bakery Orders Kiosk UI.png'
pkg='concept art/Mystery Packages Bakery UI.png'
im=original(menu).crop((610,807,698,868));a=np.array(im);r,g,b=[a[:,:,j].astype(int) for j in range(3)]
bg=(r>170)&(g>120)&(b<190)
seed=np.zeros(bg.shape,bool);seed[0]=bg[0];seed[-1]=bg[-1];seed[:,0]=bg[:,0];seed[:,-1]=bg[:,-1]
a[:,:,3][ndimage.binary_propagation(seed,mask=bg)]=0
save(clean(Image.fromarray(a),True),'book-icon.png',menu,'original collection book; gold button background removed',(610,807,698,868),True)
# Erase the occupied center of the food card, keeping its original edge pixels for 9-slicing.
im=original(menu).crop((260,369,535,537));a=np.array(im)
a[:,22:-22]=a[:,25:26]
save(Image.fromarray(a),'food-card.png',menu,'original 22px decorated corners/edges; blank center for live food',(260,369,535,537))
food_bounds=[('ube-ensaymada',(329,374,474,489)),('brazo',(600,372,767,488)),('buko-pie',(881,375,1044,488)),('pianono',(1173,374,1336,487)),('ensaymada',(332,554,490,665)),('ube-pandesal',(607,559,777,673))]
for name,bounds in food_bounds:
 a=np.array(original(menu).crop(bounds));r,g,b=[a[:,:,j].astype(int) for j in range(3)]
 bg=(r>115)&(g>45)&(g<180)&(b>15)&(b<145)&(r>g*1.25)&(g>b*1.1)
 seed=np.zeros(bg.shape,bool);seed[0]=bg[0];seed[-1]=bg[-1];seed[:,0]=bg[:,0];seed[:,-1]=bg[:,-1]
 a[:,:,3][ndimage.binary_propagation(seed,mask=bg)]=0
 if name=='ube-pandesal':
  a[-8:,:45,3]=0
  purple=(a[:,:,2]>a[:,:,0].astype(int)*.75)&(a[:,:,2]>a[:,:,1].astype(int)*1.4)&(a[:,:,2]>90)&(a[:,:,3]>24)
  last_purple=np.where(purple)[0].max()
  a[last_purple+1:,:,3]=0  # Exclude the sample chip's gold line directly below the food.
 save(clean(Image.fromarray(a),True),'food-'+name+'.png',menu,'original recipe illustration, exterior cabinet removed; no sample multiplier pixels',bounds,True)
cut(orders,(805,367,889,408),'tray.png',False)
cut(pkg,(739,707,790,760),'price-coin.png',False)
for name in ['tray.png','price-coin.png']:
 im=Image.open(OUT/name).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
 paper=((rgb.min(2)>150)&((rgb.max(2)-rgb.min(2))<115))|(a[:,:,3]<24)
 edge=np.zeros(paper.shape,bool);edge[0]=paper[0];edge[-1]=paper[-1];edge[:,0]=paper[:,0];edge[:,-1]=paper[:,-1]
 a[:,:,3][ndimage.binary_propagation(edge,mask=paper)]=0
 if name=='price-coin.png':
  mask=Image.new('L',(im.width*8,im.height*8));ImageDraw.Draw(mask).ellipse((4*8,4*8,(im.width-4)*8,(im.height-4)*8),fill=255)
  a[:,:,3]=np.minimum(a[:,:,3],np.array(mask.resize(im.size,Image.Resampling.LANCZOS)))
 Image.fromarray(a).save(OUT/name)
im=original(menu).crop((1400,415,1436,527));a=np.array(im);rgb=a[:,:,:3].astype(int)
paper=(rgb[:, :, 0]<170)&(rgb[:, :, 1]<100)&(rgb[:, :, 2]<95)
edge=np.zeros(paper.shape,bool);edge[0]=paper[0];edge[-1]=paper[-1];edge[:,0]=paper[:,0];edge[:,-1]=paper[:,-1]
a[:,:,3][ndimage.binary_propagation(edge,mask=paper)]=0
save(Image.fromarray(a),'scroll-thumb.png',menu,'original illustrated yellow thumb; 12px endcaps',(1400,415,1436,527),True)
for name,bounds in [('cart',(471,354,568,425)),('chest',(468,494,574,566)),('bucket',(472,634,574,701)),('crown',(470,775,575,845))]:
 im=original(orders).crop(bounds);a=np.array(im);rgb=a[:,:,:3].astype(int)
 # Background is pale low-saturation paper; a flood removes only exterior pixels.
 paper=(rgb.min(2)>155)&((rgb.max(2)-rgb.min(2))<115)
 edge=np.zeros(paper.shape,bool);edge[0]=paper[0];edge[-1]=paper[-1];edge[:,0]=paper[:,0];edge[:,-1]=paper[:,-1]
 a[:,:,3][ndimage.binary_propagation(edge,mask=paper)]=0
 save(clean(Image.fromarray(a),True),'reward-'+name+'.png',orders,'exterior paper and disconnected neighboring label edges removed',bounds,True)

# Genuine generated alpha; only trim empty padding and downsample for runtime.
generated={
 'register.png':'exec-b2aba3a3-e1c2-4d96-b4e3-a5566d2359e5.png',
 'counter-gifts.png':'exec-247195ba-8123-4245-989d-993ec801651b.png',
 'ticket-gold.png':'exec-4989bab9-58a0-45ac-b5ec-37cfaa6fc3d5.png',
 'ticket-pink.png':'exec-a85c46c9-53bb-49f7-9efc-766d5483341f.png',
 'ticket-purple.png':'exec-e188007d-d582-47a8-999a-75d72f20a23a.png',
 'ticket-rainbow.png':'exec-a11ef60a-9b4b-4db3-908f-a3821981ac7d.png',
 'purchase.png':'exec-44eb6096-51bf-4fa9-afc7-738858b64397.png'}
for name,file in generated.items():
 im=clean(Image.open(Path(sys.argv[2])/file).convert('RGBA'),True)
 save(im,name,'image_gen/'+file,'reference-guided transparent reconstruction; trim/downsample only',trim=True)
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f'{len(manifest)} independent faithful assets prepared in {OUT}')
