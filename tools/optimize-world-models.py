"""Build browser-sized copies of the user's GLBs; preserve meshes and native rigs."""
import io,json,pathlib,struct,sys
from PIL import Image
SOURCE=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path('../upload')
DEST=pathlib.Path('assets/world');DEST.mkdir(parents=True,exist_ok=True)
NAMES={'hospital_door_old_free.glb':'hospital-door.glb','run_forward_horror_tale_ethan.glb':'outdoor-runner.glb','an_abandoned_garage.glb':'garage.glb','abandoned_store_for_free.glb':'store.glb','psx_-_backroom.glb':'backroom.glb','office_is_old_abandoned_free.glb':'office.glb'}
for original,name in NAMES.items():
 b=(SOURCE/original).read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);raw=b[28+n:];image_views={im['bufferView']:im for im in doc.get('images',[]) if 'bufferView'in im};parts=[];offset=0
 for i,view in enumerate(doc['bufferViews']):
  data=raw[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
  if i in image_views:
   im=Image.open(io.BytesIO(data));im.thumbnail((512,512),Image.Resampling.LANCZOS)
   alpha=im.getchannel('A').getextrema()[0]<255 if 'A'in im.getbands() else False
   out=io.BytesIO()
   if alpha:im.convert('RGBA').save(out,format='PNG',optimize=True);image_views[i]['mimeType']='image/png'
   else:im.convert('RGB').save(out,format='JPEG',quality=80,optimize=True);image_views[i]['mimeType']='image/jpeg'
   data=out.getvalue()
  pad=(-offset)%4
  if pad:parts.append(b'\0'*pad);offset+=pad
  view['byteOffset']=offset;view['byteLength']=len(data);view['buffer']=0;parts.append(data);offset+=len(data)
 binary=b''.join(parts);binary+=b'\0'*((-len(binary))%4);doc['buffers']=[{'byteLength':len(binary)}]
 doc.setdefault('asset',{}).setdefault('extras',{})['facility_modifications']='Textures resized to at most 512px; geometry, materials and native rig retained.'
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 result=struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 (DEST/name).write_bytes(result);print(f'{original}: {len(b)/1e6:.2f} MB -> {name}: {len(result)/1e6:.2f} MB')
