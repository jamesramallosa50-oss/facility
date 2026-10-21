/* The Facility: native uploaded environments, physical hospital doors, and a
   connected night courtyard. All static colliders derive from the same meshes. */
(function(global){
 'use strict';const T=global.THREE,assets=new Map(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));let pending;
 const settings={garage:{scale:1.35,floor:.006395},store:{scale:.9,floor:.033886},office:{scale:1.1,floor:.02576},backroom:{scale:.95,floor:-.336001}};
 const placements=[{name:'garage',x:12,y:4.025,z:57},{name:'store',x:12,y:4.025,z:73},{name:'office',x:13,y:4.025,z:89},{name:'backroom',x:97,y:4.025,z:68}];
 const outsideRects=[[2,48,44,99],[44,76,72,99],[72,79,74,85]];
 function insideRect(r,x,z,pad=0){return x>=r[0]+pad&&z>=r[1]+pad&&x<=r[2]-pad&&z<=r[3]-pad;}
 function outside(p){return Math.abs(p.y-4)<1.5&&outsideRects.some(r=>insideRect(r,p.x,p.z));}
 function enemyOutside(p){return outside(p)||(p.x>72&&Math.abs(p.y-4)<1.5);}
 function nativeAt(W,x,z){return (W.nativeRooms||[]).some(r=>insideRect(r,x,z));}
 function shared(g){g.userData.facShared=true;return g;}
 function clipMesh(geo,box){
  // Triangle minus AABB, preserving UVs and normals. This opens a real entrance
  // in the uploaded maze instead of leaving an invisible wall in its doorway.
  const source=geo.index?geo.toNonIndexed():geo,attrs=Object.entries(source.attributes).filter(([k,v])=>['position','normal','uv','color'].includes(k)),result=Object.fromEntries(attrs.map(([k])=>[k,[]]));
  const get=i=>Object.fromEntries(attrs.map(([k,a])=>[k,Array.from({length:a.itemSize},(_,j)=>a.array[i*a.itemSize+j])]));
  const lerp=(a,b,t)=>Object.fromEntries(attrs.map(([k])=>[k,a[k].map((v,i)=>v+(b[k][i]-v)*t)]));
  const split=(poly,axis,sign,limit)=>{const inn=[],out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.position[axis]-limit),db=sign*(b.position[axis]-limit),ia=da>=0,ib=db>=0;(ia?inn:out).push(a);if(ia!==ib){const v=lerp(a,b,da/(da-db));inn.push(v);out.push(v);}}return[inn,out];};
  const emit=poly=>{for(let i=1;i<poly.length-1;i++)for(const v of[poly[0],poly[i],poly[i+1]])for(const[k]of attrs)result[k].push(...v[k]);};
  for(let i=0;i<source.attributes.position.count;i+=3){let remain=[get(i),get(i+1),get(i+2)];
   if(remain.some(v=>!v.position.every(Number.isFinite)))continue;
   for(const[axis,sign,limit]of[[0,1,box[0]],[0,-1,box[3]],[1,1,box[1]],[1,-1,box[4]],[2,1,box[2]],[2,-1,box[5]]]){if(remain.length<3)break;const parts=split(remain,axis,sign,limit);emit(parts[1]);remain=parts[0];}
  }
  const g=new T.BufferGeometry();for(const[k,a]of attrs)g.setAttribute(k,new T.Float32BufferAttribute(result[k],a.itemSize));if(!g.attributes.normal)g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 function makeColliders(root){
  const res=.35,cells=new Set(),box=new T.Box3().setFromObject(root),ox=Math.floor(box.min.x/res)-1,oz=Math.floor(box.min.z/res)-1;
  const dist=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[2]-a[2],t=clamp(((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);};
  root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,idx=g.index,v=[new T.Vector3(),new T.Vector3(),new T.Vector3()];
   for(let i=0;i<(idx?idx.count:p.count);i+=3){const a=v.map((q,j)=>q.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(o.matrixWorld).toArray()),lo=a.reduce((r,p)=>r.map((x,k)=>Math.min(x,p[k])),[Infinity,Infinity,Infinity]),hi=a.reduce((r,p)=>r.map((x,k)=>Math.max(x,p[k])),[-Infinity,-Infinity,-Infinity]);
    if(hi[1]<.36||lo[1]>1.9)continue;
    const area=(a[1][0]-a[0][0])*(a[2][2]-a[0][2])-(a[1][2]-a[0][2])*(a[2][0]-a[0][0]);
    for(let z=Math.floor(lo[2]/res);z<=Math.floor(hi[2]/res);z++)for(let x=Math.floor(lo[0]/res);x<=Math.floor(hi[0]/res);x++){
     const px=(x+.5)*res,pz=(z+.5)*res;let hit=false;
     if(Math.abs(area)>1e-8){const u=((px-a[0][0])*(a[2][2]-a[0][2])-(pz-a[0][2])*(a[2][0]-a[0][0]))/area,w=((a[1][0]-a[0][0])*(pz-a[0][2])-(a[1][2]-a[0][2])*(px-a[0][0]))/area;hit=u>=0&&w>=0&&u+w<=1;}
     if(hit||Math.min(dist(px,pz,a[0],a[1]),dist(px,pz,a[1],a[2]),dist(px,pz,a[2],a[0]))<res*.74)cells.add(x+','+z);
    }
   }
  });
  const rows=new Map();for(const c of cells){const[x,z]=c.split(',').map(Number);if(!rows.has(z))rows.set(z,[]);rows.get(z).push(x);}
  const boxes=[];for(const[z,row]of rows){row.sort((a,b)=>a-b);for(let i=0;i<row.length;){const start=row[i];let end=start;while(row[++i]===end+1)end++;boxes.push([start*res,z*res,(end+1)*res,(z+1)*res]);}}
  return boxes;
 }
 function prepare(name,gl){
  if(name==='outdoor-runner')return prepareRunner(gl);
  if(name==='hospital-door')return prepareDoor(gl);
  const cfg=settings[name];if(!cfg)throw Error('Unknown environment '+name);gl.scene.updateMatrixWorld(true);
  const chosen=[];gl.scene.traverse(o=>{if(!o.isMesh)return;const b=new T.Box3().setFromObject(o),c=b.getCenter(new T.Vector3());if(name==='store'&&(Math.abs(c.x)>9||Math.abs(c.z)>9||b.max.y>7||b.getSize(new T.Vector3()).length()>25))return;chosen.push(o);});
  const bounds=new T.Box3();for(const o of chosen)bounds.union(new T.Box3().setFromObject(o));const center=bounds.getCenter(new T.Vector3()),group=new T.Group();group.name='Uploaded '+name;
  const normalize=new T.Matrix4().makeScale(cfg.scale,cfg.scale,cfg.scale);normalize.setPosition(-center.x*cfg.scale,-cfg.floor*cfg.scale,-center.z*cfg.scale);
  for(const o of chosen){let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.applyMatrix4(normalize);
   if(name==='backroom'){const cut=clipMesh(g,[-24,.1,11.9,-17,2.55,16.4]);g.dispose();g=cut;}
   shared(g);const m=(Array.isArray(o.material)?o.material[0]:o.material).clone();m.side=T.DoubleSide;m.roughness=Math.max(.7,m.roughness||0);if(m.emissive){m.emissive.setHex(0x253b40);m.emissiveIntensity=.28;m.emissiveMap=m.map||null;}m.needsUpdate=true;
   const mesh=new T.Mesh(g,m);mesh.name=o.name;mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
  }
  const a={root:group,colliders:makeColliders(group),bounds:new T.Box3().setFromObject(group)};assets.set(name,a);return a;
 }
 function prepareDoor(gl){
  gl.scene.updateMatrixWorld(true);const frame=[],leaf=[];gl.scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);shared(g);const mat=(Array.isArray(o.material)?o.material[0]:o.material).clone();mat.side=T.DoubleSide;mat.roughness=.9;mat.emissive?.setHex(0x202e2b);mat.emissiveIntensity=.32;mat.emissiveMap=mat.map||null;(o.name.toLowerCase().includes('glass')?leaf:frame).push({g,mat});});
  if(!leaf.length||!frame.length)throw Error('Hospital door is missing its frame or moving leaf');const a={frame,leaf};assets.set('hospital-door',a);return a;
 }
 function door(F,d){
  const a=assets.get('hospital-door');if(!a)return null;const leaf=new T.Group(),fixed=new T.Group(),sx=d.w/1.90194,sy=2.3/3.46359,sz=.24;
  for(const[src,parent]of[[a.frame,fixed],[a.leaf,leaf]])for(const p of src){const m=new T.Mesh(p.g,p.mat);m.scale.set(sx,sy,sz);m.position.x=d.w/2;parent.add(m);}
  leaf.position.set(d.hx,d.y,d.hz);leaf.rotation.y=-d.a0;fixed.position.copy(leaf.position);fixed.rotation.y=leaf.rotation.y;F.scene.add(fixed);d.fixedFrame=fixed;return leaf;
 }
 function prepareRunner(gl){
  const root=gl.scene,clip=gl.animations.find(c=>c.duration>.2);if(!clip)throw Error('Outdoor runner has no running animation');
  const mix=new T.AnimationMixer(root),action=mix.clipAction(clip).play(),bounds=new T.Box3();for(let i=0;i<8;i++){mix.setTime(clip.duration*i/8);bounds.union(global.FacilityGhost.poseBounds(root));}mix.stopAllAction();mix.setTime(0);
  const scale=2.16/(bounds.max.y-bounds.min.y),offset=new T.Group(),visual=new T.Group();offset.position.y=-bounds.min.y;offset.add(root);visual.add(offset);visual.scale.setScalar(scale);
  let anchor;root.traverse(o=>{if(o.isBone&&/hips/i.test(o.name))anchor=o;if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.skinning=true;m.roughness=.9;m.emissive?.setHex(0x32251f);m.emissiveIntensity=.22;m.emissiveMap=m.map||null;m.needsUpdate=true;}}});
  const a={root,clip,visual,offset,anchor,scale,owner:null};assets.set('outdoor-runner',a);return a;
 }
 async function load(progress,fetchBuffer){
  if(assets.size===6)return;if(pending)return pending;
  pending=(async()=>{let done=0;for(const name of['hospital-door','outdoor-runner','backroom','garage','store','office']){if(!assets.has(name)){const bytes=await fetchBuffer('assets/world/'+name+'.glb?v=courtyard-r2',p=>progress((done+p)/6));const gl=await new Promise((yes,no)=>new T.GLTFLoader().parse(bytes,'assets/world/',yes,no));prepare(name,gl);}done++;progress(done/6);}})();
  try{await pending;}catch(e){pending=null;throw e;}
 }
 function plan(W){
  const ys=[8,4,0],room=(k,x0,z0,x1,z1,nm,h=3.5)=>{W.rooms.push({k,x0,z0,x1,z1,kd:'cro',h,nm});W.open.push({x0,z0,x1,z1,y0:ys[k],y1:ys[k]+h});W.kinds.push({k,x0,z0,x1,z1,kd:2});},door=(k,x0,z0,x1,z1,extra={})=>{W.open.push({x0,z0,x1,z1,y0:ys[k],y1:ys[k]+2.3});W.kinds.push({k,x0,z0,x1,z1,kd:10});W.doors.push({k,x0,z0,x1,z1,style:'grey',...extra});};
  W.outsideRects=outsideRects;W.nativeRooms=[[74.5,41.5,120,94.5]];W.nativePlacements=placements;
  for(let k=0;k<3;k++){
   room(k,46.5,47,49,74,'LONG ANNEX SPINE');room(k,65.5,47,68,74,'ANNEX RETURN');room(k,49,72,65.5,74,'ANNEX SOUTH LINK');
   room(k,49.5,47.5,65,59,'LONG ARCHIVE');room(k,49.5,59.5,65,71.5,'EXTENDED RESEARCH');for(const [z,text]of [[51.75,'LONG ARCHIVE'],[64.75,'EXTENDED RESEARCH']])W.wingSigns.push({k,x:49,z,y:2.62,nx:-1,nz:0,text,sub:'SOUTH ANNEX / RETURN VIA SPINE'});
   for(const z of[51,64]){door(k,49,z,49.5,z+1.5);door(k,65,z+4,65.5,z+5.5);}
   for(const z of[50,57,64,71])for(const x of[47.75,56,66.75])W.lights.push({k,x,z,ax:'x',col:k===0?'warm':'cyan',dim:.8});
  }
  room(1,34,29,39,47.5,'SERVICE EXIT CORRIDOR');door(1,35,28.5,36.5,29);door(1,35,47.5,37,48,{outside:true,hinge:true});
  W.wingSigns.push({k:1,x:34,z:42,nx:1,nz:0,y:2.2,text:'COURTYARD',sub:'SERVICE EXIT / OUTSIDE',arrow:'right'});
  for(const z of[32,38,44])W.lights.push({k:1,x:36.5,z,ax:'x',col:'warm'});
  for(const r of outsideRects)room(1,...r,'NIGHT COURTYARD',9);
  room(1,74.5,41.5,120,94.5,'THE BACKROOMS',4.2);door(1,74,80.5,74.5,82.5,{outside:true,hinge:true});
  W.worldColliders=[];
  for(const p of placements){const a=assets.get(p.name);if(!a)continue;for(const b of a.colliders){const c={x0:p.x+b[0],y0:4.03,z0:p.z+b[1],x1:p.x+b[2],y1:6.15,z1:p.z+b[3],m:'prop',native:true};W.boxes.push(c);W.worldColliders.push(c);}}
  W.trees=[];W.benches=[];W.streetLights=[];
  for(const z of[52,61,69,88,96])for(const x of[25,42])W.streetLights.push({x,z,y:4});
  for(const x of[49,59,69])for(const z of[78,96])W.streetLights.push({x,z,y:4});
  for(const z of[54,63,92])W.benches.push({x:27,z,rot:Math.PI/2});for(const x of[48,60])W.benches.push({x,z:92,rot:0});
  for(const z of[51,58,65,92,97])for(const x of[3.8,22,29,43])if(!(x===3.8&&z===65))W.trees.push({x,z,size:.85+((x+z)%5)*.09});
  for(const z of[77,94,98])for(const x of[47,54,63,70])W.trees.push({x,z,size:1});
  for(const l of W.streetLights)W.boxes.push({x0:l.x-.1,y0:4,z0:l.z-.1,x1:l.x+.1,y1:8.8,z1:l.z+.1,m:'prop',noVox:true});
  for(const t of W.trees)W.boxes.push({x0:t.x-.22,y0:4,z0:t.z-.22,x1:t.x+.22,y1:6.5,z1:t.z+.22,m:'prop',noVox:true});
  for(const b of W.benches){const w=b.rot?.4:1.12,d=b.rot?1.12:.4;W.boxes.push({x0:b.x-w,y0:4,z0:b.z-d,x1:b.x+w,y1:4.95,z1:b.z+d,m:'prop',noVox:true});}
  // Objective-bearing extensions keep the new rooms useful during a run.
  for(let k=0;k<3;k++){for(const z of[51,56,63,68])for(const x of[51,63.5])W.boxes.push({x0:x-.275,y0:ys[k],z0:z-.8,x1:x+.275,y1:ys[k]+1.85,z1:z+.8,m:'prop'});const z=k===1?65:54;W.fuse[k].push({k,x:57,y:ys[k]+.9,z});W.boxes.push({x0:56.3,y0:ys[k],z0:z-.4,x1:57.7,y1:ys[k]+.87,z1:z+.4,m:'prop',noVox:true});}
  W.bat.push({k:1,x:27,y:4.5,z:54});
 }
 function init(F){
  const group=new T.Group();group.name='Courtyard and uploaded spaces';F.scene.add(group);F.world={g:group,materials:[],lights:[],outside:0,nativeScenes:[]};
  for(const p of placements){const a=assets.get(p.name);if(a){const g=a.root.clone(true);g.position.set(p.x,p.y,p.z);group.add(g);F.world.nativeScenes.push({g,p,bounds:a.bounds});}}
  const mat=(color,options={})=>{const m=new T.MeshStandardMaterial({color,roughness:.95,...options});F.world.materials.push(m);return m;},grass=mat(0x23382c),asphalt=mat(0x202b31),curb=mat(0x68767a),wood=mat(0x65503a),metal=mat(0x263840),foliage=mat(0x173a2c),bark=mat(0x3d3930),bulb=new T.MeshBasicMaterial({color:0xffdea1});F.world.materials.push(bulb);
  const box=(x,y,z,w,h,d,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y+h/2,z);group.add(o);return o;};
  for(const r of outsideRects)box((r[0]+r[2])/2,3.98,(r[1]+r[3])/2,r[2]-r[0],.02,r[3]-r[1],grass);
  box(36,4.005,73.5,6,.018,51,asphalt);box(38.5,4.005,82,72,.019,6,asphalt);
  for(const x of[31.8,40.2]){box(x,4.006,73.5,2.2,.1,51,curb);}
  const paint=new T.MeshBasicMaterial({color:0xbcb47d});F.world.materials.push(paint);
  for(let z=50;z<99;z+=4)box(36,4.03,z,.1,.005,1.7,paint);for(let x=5;x<74;x+=4)if(Math.abs(x-36)>5)box(x,4.03,82,1.7,.005,.1,paint);
  for(let k=0;k<3;k++){const y=[8,4,0][k],z=k===1?65:54;box(57,y,z,1.4,.82,.8,metal);box(57,y+.82,z,1.5,.05,.9,curb);for(const zz of[51,56,63,68])for(const x of[51,63.5])box(x,y,zz,.55,1.85,1.6,wood);}
  for(const b of F.W.benches||[]){const g=new T.Group();g.position.set(b.x,4,b.z);g.rotation.y=b.rot;group.add(g);
   const add=(x,y,z,w,h,d,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);};
   for(const x of[-.85,.85]){add(x,.24,0,.08,.48,.65,metal);add(x,.74,.27,.07,.5,.06,metal);}for(const z of[-.22,0,.22])add(0,.48,z,2.2,.07,.18,wood);for(const y of[.74,.96])add(0,y,.3,2.2,.15,.065,wood);
  }
  const trees=F.W.trees||[],trunkGeo=new T.CylinderGeometry(.14,.23,2.6,7),crownGeo=new T.IcosahedronGeometry(1,1),trunks=new T.InstancedMesh(trunkGeo,bark,trees.length),crowns=new T.InstancedMesh(crownGeo,foliage,trees.length*5),dummy=new T.Object3D();
  trees.forEach((p,i)=>{dummy.position.set(p.x,4+1.3*p.size,p.z);dummy.scale.setScalar(p.size);dummy.rotation.set(0,i*.7,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);for(let k=0;k<5;k++){const a=k*2.4+i*.8;dummy.position.set(p.x+Math.cos(a)*.65,7.2+k%2*.45,p.z+Math.sin(a)*.65);dummy.scale.set(1.35*p.size,1.3*p.size,1.35*p.size);dummy.rotation.set(i*.1,k,i*.2);dummy.updateMatrix();crowns.setMatrixAt(i*5+k,dummy.matrix);}});group.add(trunks,crowns);
  for(const p of F.W.streetLights||[]){const pole=new T.Mesh(new T.CylinderGeometry(.045,.09,4.8,7),metal);pole.position.set(p.x,6.4,p.z);group.add(pole);box(p.x,8.62,p.z,.55,.1,.55,metal);box(p.x,8.59,p.z,.4,.04,.4,bulb);
   const glow=new T.Mesh(new T.CircleGeometry(2.7,20),new T.MeshBasicMaterial({color:0xffdca0,transparent:true,opacity:.075,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.set(p.x,4.035,p.z);group.add(glow);F.world.materials.push(glow.material);
  }
  for(let i=0;i<3;i++){const l=new T.PointLight(0xffd8a1,0,10,1.7);F.scene.add(l);F.world.lights.push(l);}
  const ambient=F.world.ambient=new T.HemisphereLight(0x91afc6,0x16261c,0);F.scene.add(ambient);
  const sky=new T.Mesh(new T.SphereGeometry(140,20,12),new T.MeshBasicMaterial({color:0x081b2a,side:T.BackSide,fog:false}));sky.renderOrder=-2;group.add(sky);F.world.sky=sky;F.world.materials.push(sky.material);
  const moon=new T.Mesh(new T.SphereGeometry(2.2,16,12),new T.MeshBasicMaterial({color:0xcbd9d8,fog:false}));F.scene.add(moon);F.world.moon=moon;F.world.materials.push(moon.material);
  const cfg=assets.get('outdoor-runner');if(cfg){if(cfg.owner)releaseRunner(cfg.owner);const g=new T.Group();g.add(cfg.visual);F.scene.add(g);const mix=new T.AnimationMixer(cfg.root),action=mix.clipAction(cfg.clip).play();const runner=F.runner={g,mix,action,cfg,x:25,y:4,z:68,face:0,on:true,mode:'patrol',radius:.32,height:2.12,eye:1.7,repath:0,path:null,pi:0,age:0,speed:0,lastSeen:-99,contact:0};cfg.owner=runner;}
 }
 function runnerAnimation(a,dt,speed){
  if(!a?.mix)return;a.action.paused=speed<.05;a.action.timeScale=clamp(speed/4.6,.7,1.5);a.mix.update(dt);
  const cfg=a.cfg;cfg.visual.updateMatrixWorld(true);if(cfg.anchor){const p=cfg.anchor.getWorldPosition(new T.Vector3());cfg.offset.worldToLocal(p);cfg.offset.position.x=-p.x;cfg.offset.position.z=-p.z;}
  a.g.position.set(a.x,a.y,a.z);a.g.rotation.y=a.face;
 }
 function runnerTick(F,dt){
  const a=F.runner;if(!a)return;a.age+=dt;const list=global.facPlayers(F).filter(p=>global.facAlive(p)&&enemyOutside(p));let target=null,best=Infinity;
  for(const p of list){const d=Math.hypot(p.x-a.x,p.z-a.z);if(d<34&&d<best&&global.facSee(F,a.x,a.y+1.6,a.z,p.x,p.y+1.3,p.z,true)){target=p;best=d;}}
  if(target){a.lastSeen=F.t;a.memory={x:target.x,y:target.y,z:target.z};if(a.mode!=='chase'){a.mode='chase';a.reactUntil=F.t+1;global.facTip(F,'Something is running toward you. Use the road and the lights.',3);global.facPS(F,a.x,a.y+1.4,a.z,o=>{global.sfxN(o,.45,.15,700,'bandpass');global.sfxT(o,84,35,.6,'sawtooth',.1);},1);}}
  else if(F.t-a.lastSeen>6)a.mode='patrol';
  const oldX=a.x,oldZ=a.z;
  if(a.mode==='chase'&&F.t>=(a.reactUntil||0)&&a.memory)global.facHauntWalk(F,a,a.memory.x,a.memory.y,a.memory.z,5.05,dt);
  else if(a.mode==='patrol'){
   if(!a.goal||Math.hypot(a.x-a.goal[0],a.z-a.goal[1])<1)a.goal=[[25,62],[36,72],[53,88],[27,94]][Math.floor(a.age/6)%4];
   global.facHauntWalk(F,a,a.goal[0],4,a.goal[1],2.15,dt);
  }
  const dx=a.x-oldX,dz=a.z-oldZ;a.speed=Math.hypot(dx,dz)/Math.max(dt,.001);if(a.speed>.05)a.face=Math.atan2(dx,dz);runnerAnimation(a,dt,a.speed);
  for(const p of list){const close=F.t>=(a.reactUntil||0)&&Math.hypot(p.x-a.x,p.z-a.z)<.88&&global.facSee(F,a.x,5.5,a.z,p.x,p.y+1.2,p.z,true);p.runnerContact=close?(p.runnerContact||0)+dt:0;if(p.runnerContact>.3){global.facDamage(F,p,32);p.runnerContact=0;}}
 }
 function tick(F,dt,authority){
  const S=F.world;if(!S)return;for(const o of S.nativeScenes||[]){const x=F.pl.x-o.p.x,z=F.pl.z-o.p.z,b=o.bounds,d=Math.hypot(Math.max(b.min.x-x,0,x-b.max.x),Math.max(b.min.z-z,0,z-b.max.z));o.g.visible=Math.abs(F.pl.y-4)<3&&d<42;}const out=outside(F.pl);S.outside+=(Number(out)-S.outside)*Math.min(1,dt*3);const k=S.outside;
  S.ambient.intensity=k*.65;S.sky.visible=k>.1;S.sky.position.set(F.pl.x,0,F.pl.z);S.moon.visible=k>.1;S.moon.position.set(F.pl.x-65,65,F.pl.z-80);
  const fog=.055*(1-k)+.018*k;if(F.scene.fog)F.scene.fog.density=fog;if(F.U?.uFogD)F.U.uFogD.value=fog;
  const lamps=(F.W.streetLights||[]).map(p=>({p,d:Math.hypot(p.x-F.pl.x,p.z-F.pl.z)})).sort((a,b)=>a.d-b.d);
  S.lights.forEach((l,i)=>{const p=lamps[i];l.intensity=p&&p.d<12?1.8*k:0;if(p)l.position.set(p.p.x,8.5,p.p.z);});
  if(authority)runnerTick(F,dt);
  if(F.runner){const d=Math.hypot(F.runner.x-F.pl.x,F.runner.z-F.pl.z);F.runner.g.visible=d<65&&Math.abs(F.runner.y-F.pl.y)<3;if(enemyOutside(F.pl)&&d<18&&global.facSee(F,F.pl.x,F.pl.y+1.4,F.pl.z,F.runner.x,F.runner.y+1.5,F.runner.z,true))F.pl.fear=Math.max(F.pl.fear||0,(1-d/18)*.85);}
 }
 function releaseRunner(a){if(!a)return;a.mix.stopAllAction();if(a.cfg.visual.parent)a.cfg.visual.parent.remove(a.cfg.visual);a.cfg.owner=null;}
 function dispose(F){if(F.runner)releaseRunner(F.runner);F.runner=null;if(F.world){for(const m of F.world.materials)m.dispose();F.world=null;}}
 global.FacilityWorld={load,prepare,plan,init,tick,dispose,outside,enemyOutside,nativeAt,door,doorReady:()=>assets.has('hospital-door'),assets,runnerAnimation,makeColliders,clipMesh};
})(typeof window!=='undefined'?window:globalThis);
