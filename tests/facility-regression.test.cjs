/* Run with: node --test tests/facility-regression.test.cjs
   Executes the real level, navigation, capsule physics, movement, and creature
   code with the bundled Three.js. No WebGL/browser emulation is involved. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {parseSpider}=require('./helpers/spider-asset.cjs');
const spiderRuntime=fs.readFileSync(path.join(root,'assets/horror/spider.js'),'utf8');
const ghostRuntime=fs.readFileSync(path.join(root,'assets/horror/ghost.js'),'utf8');
const signRuntime=fs.readFileSync(path.join(root,'assets/horror/signs.js'),'utf8');
const html=fs.readFileSync(path.join(root,'game-core.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const core=scripts.find(s=>s.includes('function facPlan()'));
const three=scripts.find(s=>s.includes('Copyright 2010-2021 Three.js Authors'));
function section(start,end){const i=core.indexOf(start),j=core.indexOf(end,i);assert(i>=0&&j>i,start);return core.slice(i,j);}
const threeCtx={};vm.createContext(threeCtx);vm.runInContext(three,threeCtx);
const T=threeCtx.THREE;
function harness(buildGeometry=false){
  const ctx={T,console,performance,Float32Array,Uint8Array,Int8Array,Int16Array,Int32Array,Uint32Array,Map,Set,Math,Promise,setTimeout,clearTimeout,URL,URLSearchParams,addEventListener(){},location:{search:''},
    document:{getElementById:()=>null,createElement:()=>({getContext:()=>({font:'',fillRect(){},strokeRect(){},fillText(){},save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(t){return{width:t.length*(parseFloat(this.font.match(/([0-9]+)px/)?.[1])||25)*.58};}})})},
    keys:{},touchMove:{x:0,y:0},padMove:{x:0,y:0},padRun:false,firing:false,HZ:{},meta:{flash:false},
    sens:()=>1,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),vib:()=>{},
    facSndGasp(){},facSndStep(){},facSndLand(){},facSndClick(){},facSndCreak(){},facSndSlam(){},facSndBump(){},facSndBang(){},facSndLatch(){},facSndRattle(){},facSndPick(){},facSndPlug(){},facSndAlarm(){},facSndBell(){},facSay(){},facDmRoar(){},facDmSniff(){},facDmBreath(){},facDie(){ctx.HZ.dead=true;},facWin(){ctx.HZ.won=true;},facSting(){},facPS(){},sfxT(){},sfxN(){},facTip(){},
  };
  ctx.THREE=T;ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/facility-survival.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'assets/facility-coop.js'),'utf8'),ctx);
  vm.runInContext(spiderRuntime,ctx);vm.runInContext(ghostRuntime,ctx);vm.runInContext(signRuntime,ctx);
  const model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(1,.3,1),new T.MeshStandardMaterial()));
  ctx.FacilitySpider.prepare({scene:model,animations:[new T.AnimationClip('Spider walking',1,[]),new T.AnimationClip('Spider running',.3,[])]});
  const ghost=new T.Group();ghost.add(new T.Mesh(new T.BoxGeometry(.4,2,.3),new T.MeshStandardMaterial()));
  ctx.FacilityGhost.prepare({scene:ghost,animations:['Stalking 1','Stalking 2','Stalking 3','Chasing'].map(n=>new T.AnimationClip('Armature|'+n,5,[]))});
  const code=section('const FCY=','/* ===== BUILD 3.15: THE FACILITY — part 2:')+
    section('function facDoorSeg(d)','/* ---------- doors: heavy leaves')+
    section('function facDoorGeo(F,M,d)','/* ===== BUILD 3.15: THE FACILITY — part 4:')+
    section('const FAC=','let FACW=')+
    section('const FDM=','/* ---------- sound:')+
    section('function facNoise(F','/* ---------- looking at things you can use')+
    section('function facLook(F)','/* ---------- the creature ---------- */')+
    section('const FSP=','/* ---------- each frame ---------- */');
  vm.runInContext(code+'\nglobalThis.api={facPlan,facGrid,facNav,facNodeNear,facNP,facPath,facMove,facPush,facPlayer,facGround,facDoorSeg,facDoorDistance,facDoorSweep,facDoorsInit,facDoorsTick,facDoorOpen,facHauntInit,facHauntDoor,facHauntWalk,facHauntTick,facHauntEnd,facHauntFree,facHauntSpawn,facHauntDispose,facHauntClear,facSpiderPursue,facDmCatch,facDmState,facDmReveal,facDmPlace,facDmGo,facDemonTick,facDirector,facDmSee,facWallLightMount,facWallLightGeo,facGeomLights,facLightsPrep,FDM,facGeomAll,facBake,FAC,FCY,FNX,FNZ,facHealthInit,facDamage,facHealthTick,facRevive,facHuntTarget,facPlayers,facNetRandom,facNetInput,facNetAction,facNetSnapshot,facNetWorld,facNetQueue,facCoopUse,facCoopConfig,facNetValidPose};',ctx);
  vm.runInContext('facDoorGeo=()=>({rotation:{y:0}});facLook=()=>{};',ctx);
  Object.assign(ctx.api,{facCoopStart:ctx.facCoopStart,facCoopTick:ctx.facCoopTick,facCoopDispose:ctx.facCoopDispose,facItems:ctx.facItems});
  const A=ctx.api,W=A.facPlan();A.facGrid(W);if(buildGeometry)A.facGeomAll(W);
  const F={W,doors:[],scene:new T.Scene(),t:20,noise:[],dm:{x:2,y:4,z:2,on:false,vis:false,st:'away'},stage:'find',fuses:0,dir:{t:0,lastChase:0,lastSeen:0,recoverUntil:0,graceUntil:0},camY:5.62,U:{uPow:{value:1},uEmg:{value:1}},pl:{x:11,y:4,z:8.2,yaw:0,pitch:0,vx:0,vz:0,vy:0,ground:true,sta:1,bat:1,light:true,crouch:false,bob:0,bobA:0,roll:0,ch:1.62,fear:0}};
  A.facNav(F);ctx.HZ={pl:F.pl,padHold:false};ctx.cam=new T.PerspectiveCamera();
  A.facHealthInit(F);
  return{ctx,A,F,W};
}
const shared=harness(true);
test('every inline script parses, including launch entry points',()=>{
  for(const file of ['facility-survival.js','facility-coop.js','facility-menu.js'])new vm.Script(fs.readFileSync(path.join(root,'assets',file),'utf8'),{filename:file});
  for(const [name,code] of [['spider',spiderRuntime],['ghost',ghostRuntime],['signs',signRuntime]])new vm.Script(code,{filename:'assets/horror/'+name+'.js'});
  for(const file of ['game-core.html','game.html','index.html']){
    const h=fs.readFileSync(path.join(root,file),'utf8');
    for(const s of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(s[1],{filename:file});
  }
});
test('all twelve new rooms and all fuse candidates are reachable from the start',()=>{
  const {A,F,W}=shared,start=A.facNodeNear(F,W.start.x,4,W.start.z),seen=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++){const list=F.nav.adj[queue[i]];for(let k=0;k<list.length;k+=2)if(!seen.has(list[k])){seen.add(list[k]);queue.push(list[k]);}}
  const rooms=W.rooms.filter(r=>r.x0===49.5);assert.equal(rooms.length,12);
  for(const r of rooms){const n=A.facNodeNear(F,(r.x0+r.x1)/2,A.FCY[r.k],(r.z0+r.z1)/2);assert(seen.has(n),'Unreachable '+r.nm);}
  for(const spots of W.fuse)for(const f of spots){const n=A.facNodeNear(F,f.x,A.FCY[f.k],f.z);assert(n>=0&&seen.has(n),'Unreachable fuse '+JSON.stringify(f));}
  for(const b of W.bat)assert(seen.has(A.facNodeNear(F,b.x,A.FCY[b.k],b.z)),'Unreachable battery '+JSON.stringify(b));
  console.info('Walkable navigation nodes:',seen.size,'of',F.nav.N,'; rooms:',W.rooms.length);
});
test('door physics and mesh angles match immediately and after settling',()=>{
  const {A,F}=harness();A.facDoorsInit(F,{});
  assert(F.doors.some(d=>Math.abs(d.th)>1));
  for(const d of F.doors)assert.equal(d.mesh.rotation.y,-(d.a0+d.th));
  for(const d of F.doors)d.mesh.rotation.y=0;
  A.facDoorsTick(F,1/60);
  for(const d of F.doors)assert.equal(d.mesh.rotation.y,-(d.a0+d.th));
  for(const d of F.doors)assert(Math.abs(d.w-(Math.max(d.x1-d.x0,d.z1-d.z0)-.04))<1e-8);
});
test('closed doors block a sprint, a long frame, both sides, and diagonal contact',()=>{
  const {A,F}=harness();
  // Place the test leaf in an empty part of the room. Nearby furniture can
  // legitimately deflect a body around a free-standing leaf's hinge.
  F.W.bh=new Map();
  for(const a of [0,.35,.8,1.55,Math.PI/2,Math.PI])for(const side of [-1,1]){
    const d={hx:56,hz:22,y:4,w:1.46,a0:a,th:0,tgt:0,lock:true,cx:56,cz:22};F.doors=[d];
    const tx=Math.cos(a),tz=Math.sin(a),nx=-tz,nz=tx;
    for(const speed of [5.9/60,5.9/20,2.5]){
      const e={x:d.hx+tx*.73+nx*side*.6,y:4,z:d.hz+tz*.73+nz*side*.6};
      for(let i=0;i<30;i++)A.facMove(F,e,-nx*side*speed,-nz*side*speed,.3,1.74,.46);
      const distance=(e.x-d.hx)*nx+(e.z-d.hz)*nz;
      assert(distance*side>.30,'Crossed door angle '+a+' frame '+speed);
    }
  }
  F.doors=[];
});
test('an open leaf blocks at its visible location and the doorway is passable',()=>{
  const {A,F}=shared;F.doors=[{hx:49.25,hz:21.02,y:4,w:1.46,a0:Math.PI/2,th:-Math.PI/2}];
  const e={x:48.5,y:4,z:21.85};for(let i=0;i<40;i++)A.facMove(F,e,.06,0,.3,1.74,.46);
  assert(e.x>50,'Open doorway should be passable');F.doors=[];
});
test('door navigation references the same floor, including stacked east-wing doors',()=>{
  const {A,F}=harness();A.facDoorsInit(F,{});A.facNav(F);
  let count=0;
  for(let n=0;n<F.nav.N;n++){const di=F.nav.doorOf[n];if(di<0)continue;count++;assert(Math.abs(F.nav.ny[n]-F.doors[di].y)<.6);}
  assert(count>50);
});
test('holding joystick forward walks indefinitely; explicit sprint lasts thirty seconds',()=>{
  const {ctx,A,F}=harness();ctx.touchMove.y=-1;
  vm.runInContext('facMove=()=>true;facGround=(F,x,z,y)=>y;facSurfAt=()=>"conc";',ctx);
  for(let i=0;i<600;i++)A.facPlayer(F,1/60);
  assert.equal(F.running,false);assert.equal(F.pl.sta,1);
  ctx.firing=true;
  for(let i=0;i<29*60;i++)A.facPlayer(F,1/60);
  assert(F.running);assert(F.pl.sta>0&&F.pl.sta<.04);
  for(let i=0;i<62;i++)A.facPlayer(F,1/60);
  assert(F.pl.sta<.01);assert(F.pl.tired);
  ctx.firing=false;
  for(let i=0;i<5*60;i++)A.facPlayer(F,1/60);
  assert.equal(F.pl.sta,1);assert.equal(F.pl.tired,false);
});
test('the uploaded ghost and enlarged spider spawn, reveal at doors and clean up',()=>{
  const {ctx,A,F}=harness();A.facHauntInit(F);
  assert.equal(F.haunt.actors.length,2);assert(F.haunt.actors.some(a=>a.kind==='crawler'&&a.spider));assert(F.haunt.actors.some(a=>a.kind==='wraith'&&a.ghost));
  assert.equal(A.facHauntSpawn(F,'patient',[24,4,3],'cross'),false);
  const d={cx:49.25,cz:21.75,y:4,nx:-1,nz:0,th:0,scare:'wraith'};
  F.pl.x=47.75;F.pl.z=21.75;A.facHauntDoor(F,d,F.pl.x,F.pl.z);
  assert(F.haunt.active,'Expected opening the door to prime a scare');assert.equal(F.haunt.active.kind,'wraith');assert.equal(F.haunt.active.g.visible,false);
  vm.runInContext('facSee=()=>true;facOnScreen=()=>true;',ctx);d.th=.8;A.facHauntTick(F,.1);
  assert.equal(F.haunt.active.g.visible,true);assert(F.haunt.active.stung);
  A.facHauntEnd(F);assert.equal(F.haunt.active,null);assert(F.haunt.actors.every(a=>!a.g.visible));
  F.haunt.blackout=.01;A.facHauntTick(F,.05);assert.equal(F.U.uPow.value,1);
  F.dm.st='chase';F.haunt.next=0;assert.equal(A.facHauntFree(F),false);
  A.facHauntDispose(F);assert.equal(F.haunt,null);
});
test('the uploaded spider retains its rig, geometry and animated walk/run poses',async()=>{
  const gl=await parseSpider(T,path.join(root,'assets/horror/wolf-spider.glb'),path.join(root,'assets/horror/gltf.js'));
  const {ctx}=harness();const S=ctx.FacilitySpider,asset=S.prepare(gl);
  let skinned;gl.scene.traverse(o=>{if(o.isSkinnedMesh)skinned=o;});
  assert(skinned);assert.equal(skinned.skeleton.bones.length,109);assert.equal(skinned.geometry.attributes.position.count,5346);assert.equal(skinned.geometry.index.count/3,8458);
  const spider=S.createActor(),leg=asset.root.getObjectByName('LegSegmentAL001_013');
  const initial=leg.quaternion.clone(),animatedBounds=new T.Box3();
  for(let i=0;i<30;i++){S.tick(spider,3.9,1/60);animatedBounds.union(S.poseBounds(asset.root));}
  assert(initial.angleTo(leg.quaternion)>.01,'Real leg joints should animate');
  assert(spider.runWeight>.9,'Fast movement should select native running');
  const bounds=S.poseBounds(asset.root),size=bounds.getSize(new T.Vector3());
  const animatedSize=animatedBounds.getSize(new T.Vector3());assert(Math.max(animatedSize.x,animatedSize.z)<1.95&&Math.max(animatedSize.x,animatedSize.z)>1.6,'The uploaded spider should be nearly twice the former 0.92 m size across its animated poses');
  assert(bounds.min.y>=-.015&&bounds.min.y<.08,'Feet should rest on the floor');
  assert(size.y>.4&&size.y<.75,'The enlarged spider should remain low to the ground');
  const fang=asset.root.getObjectByName('FangL_038').getWorldPosition(new T.Vector3()),back=asset.root.getObjectByName('Back_037').getWorldPosition(new T.Vector3());
  assert(fang.z>back.z,'The face should point along actor +Z');
  const time=spider.run.time;for(let i=0;i<20;i++)S.tick(spider,0,1/60);assert.equal(spider.run.time,time,'Blocked spider must not run in place');
  for(let i=0;i<120;i++)S.tick(spider,2.8,1/60,.86);
  const narrow=S.poseBounds(asset.root).getSize(new T.Vector3());assert(narrow.x<.94,'Legs should tuck into a narrow original doorway');assert(narrow.z>1.25,'Door clearance should preserve the larger body length');
  for(let i=0;i<120;i++)S.tick(spider,2.8,1/60);
  const open=S.poseBounds(asset.root);assert(open.getSize(new T.Vector3()).x>1.25,'Legs should spread back to full size in an open room');assert(open.min.y>=-.015,'Blended gait should keep feet on the floor');
  S.release(spider);assert.equal(asset.visual.parent,null);
  const retry=S.createActor();S.tick(retry,2,1/60);assert.equal(asset.visual.parent,retry.visual,'Retry should reattach the cached rig');S.release(retry);
});
test('a creature waiting at a closed door requests opening once',()=>{
  const {ctx,A,F}=harness();let opens=0;
  F.nav={doorOf:[-1,0]};F.doors=[{cx:24,cz:3,hx:24,hz:2.52,y:4,w:.96,a0:Math.PI/2,th:0,tgt:0,lock:false}];
  ctx.facNodeNear=()=>0;ctx.facPath=()=>[0,1];ctx.facNP=()=>[24,4,3];
  ctx.facDoorOpen=(F,d)=>{opens++;d.tgt=1.58;return true;};
  const a={x:22,y:4,z:3,g:new T.Group(),repath:0,path:null,pi:0};
  for(let i=0;i<60;i++){F.t+=1/60;A.facHauntWalk(F,a,26,4,3,3.9,1/60);}
  assert.equal(opens,1);assert.equal(a.x,22);
});
test('spider proximity scares respect walls and floor height',()=>{
  const {ctx,A,F}=harness();A.facHauntInit(F);
  F.pl.x=24.5;F.pl.y=4;F.pl.z=3;F.shake=0;
  assert(A.facHauntSpawn(F,'crawler',[24,4,3],'hunt'));const spider=F.haunt.active;spider.age=.3;
  ctx.facOnScreen=()=>true;ctx.facSee=()=>false;ctx.facHauntWalk=()=>{};
  A.facHauntTick(F,.05);assert.equal(spider.stung,false,'No attack through a wall');
  spider.y=0;ctx.facOnScreen=()=>false;ctx.facSee=()=>true;A.facHauntTick(F,.05);
  assert.equal(spider.stung,false,'No proximity attack through another floor');
  A.facHauntDispose(F);
});

test('all seventeen placards have solid support and leave the door openings clear',()=>{
  const {ctx,A,F,W}=harness();A.facHauntInit(F);
  assert.equal(W.wingSigns.length,17);assert.equal(F.haunt.signs.length,17,'Every configured sign should have a valid mount');
  for(const sign of W.wingSigns)assert(ctx.FacilitySigns.mounted(sign,A.FCY[sign.k],(x,y,z)=>ctx.facAir(W,x,y,z)),sign.text+' has no wall support');
  for(const sign of W.wingSigns.filter(s=>s.x===49))assert(sign.y-(sign.height||.4)/2>2.38,'Room placard crosses a door header');
  for(const sign of F.haunt.signs){assert.equal(sign.children.length,2);assert(sign.children[1].position.z>.016,'Printed face must clear its backing');}
  // Reject the former floating stair sign instead of rendering a billboard in air.
  assert.equal(ctx.FacilitySigns.mounted({k:1,x:65.5,z:45.72,nx:-1,nz:0},4,(x,y,z)=>ctx.facAir(W,x,y,z)),false);
  A.facHauntDispose(F);
});
test('the uploaded ghost keeps all four meshes, seventy joints and native animation without root drift',async()=>{
  const gl=await parseSpider(T,path.join(root,'assets/horror/unvermeidlich-ghost.glb'),path.join(root,'assets/horror/gltf.js'));
  const {ctx}=harness(),G=ctx.FacilityGhost,asset=G.prepare(gl),meshes=[];gl.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
  assert.equal(meshes.length,4);assert(meshes.every(m=>m.skeleton.bones.length===70));assert.equal(meshes.reduce((n,m)=>n+m.geometry.index.count/3,0),3048);assert.equal(gl.animations.length,4);
  assert(meshes.some(m=>m.material.transparent),'Native hair/dress transparency should survive');
  const ghost=G.createActor(),head=asset.root.getObjectByName('Head_06'),hips=asset.root.getObjectByName('Hips_01'),initial=head.quaternion.clone();
  const parent=new T.Group();parent.position.set(10,4,25);parent.rotation.y=.9;parent.add(ghost.visual);
  let maxHeight=0;
  for(let i=0;i<180;i++){
    G.tick(ghost,1,1/60,'door');
    const local=ghost.visual.worldToLocal(hips.getWorldPosition(new T.Vector3()));
    assert(Math.abs(local.x)<1e-4&&Math.abs(local.z)<1e-4,'Root motion escaped the collision-controlled actor');
    if(i%15===0){const bounds=G.poseBounds(asset.root);maxHeight=Math.max(maxHeight,bounds.max.y-4);assert(bounds.min.y>3.98,'Animated feet should not sink below the floor');}
  }
  assert(initial.angleTo(head.quaternion)>.01,'Original ghost head should animate');assert(maxHeight>1.7&&maxHeight<2.2,'Ghost must fit under Facility doorways');
  G.reset(ghost);G.tick(ghost,0,1/60,'watch');
  parent.rotation.y=0;G.tick(ghost,0,1/60,'watch');
  assert(head.getWorldPosition(new T.Vector3()).z>hips.getWorldPosition(new T.Vector3()).z,'Ghost should face actor +Z');
  G.release(ghost);assert.equal(asset.visual.parent,null);const retry=G.createActor();G.tick(retry,1,1/60,'watch');assert.equal(asset.visual.parent,retry.visual);G.release(retry);
});
function hunter(){
  const h=harness(),{ctx,F}=h;
  Object.assign(F.dm,{on:true,g:new T.Group(),st:'prowl',stT:0,t:0,sees:0,waitT:100,alert:0,senT:0,face:0,x:F.pl.x,y:F.pl.y,z:F.pl.z-5,safeUntil:0});
  ctx.facDmSee=()=>1;ctx.facDmHear=()=>null;ctx.facDmBody=()=>{};ctx.facDmGo=(F,x,y,z,speed)=>{F.lastGoal={x,y,z,speed};return'move';};
  return h;
}
test('hunter recognition gives a warning and noise alone never starts a chase',()=>{
  const {ctx,A,F}=hunter();let warnings=0;ctx.facTip=()=>warnings++;
  for(let i=0;i<16;i++){F.t+=.05;A.facDemonTick(F,.05);}assert.equal(F.dm.st,'prowl');assert(warnings>=1);
  for(let i=0;i<10;i++){F.t+=.05;A.facDemonTick(F,.05);}assert.equal(F.dm.st,'chase');assert(F.dm.safeUntil>F.t);
  A.facDmState(F,'prowl');F.dm.alert=0;ctx.facDmSee=()=>0;ctx.facDmHear=()=>({x:12,y:4,z:3,r:80});
  for(let i=0;i<10;i++){F.t+=.05;A.facDemonTick(F,.05);}assert.equal(F.dm.st,'inv','Loud noises should trigger investigation');
});
test('hunter loses visual tracking behind cover, maintains chase pressure, and rests after escape',()=>{
  const {ctx,A,F}=hunter();F.fuses=3;F.dir.final=true;A.facDmState(F,'chase');F.dm.stT=2;F.dm.mem={x:12,y:4,z:9,t:F.t};ctx.facDmSee=()=>0;
  F.pl.x=40;F.pl.z=30;F.t+=.5;A.facDemonTick(F,.05);
  assert.equal(F.lastGoal.x,12,'Should visit the last known position instead of tracking through walls');assert(F.lastGoal.speed<5.9);
  F.dm.stT=8.1;F.dm.lastVisual=F.t;A.facDemonTick(F,.05);assert(F.lastGoal.speed>A.FAC.walk&&F.lastGoal.speed<A.FAC.run,'Hunter must keep closing on walking but allow sprint escape');
  F.dm.stT=20;A.facDemonTick(F,.05);assert(F.lastGoal.speed>A.FAC.walk,'Long chases should not slow the hunter below walking');
  F.t+=4.1;A.facDemonTick(F,.05);assert.equal(F.dm.st,'search');assert(F.dir.recoverUntil>=F.t+14);
  const before=F.dm.alert;ctx.facDmSee=()=>1;F.t+=.1;A.facDemonTick(F,.05);assert(F.dm.alert<=before,'Recovery should stop an immediate repeat chase');
});
test('hunter attacks need sustained visible contact, deal health damage, and respect reaction time',()=>{
  const {ctx,A,F}=hunter();F.dm.st='chase';F.dm.z=F.pl.z-.65;ctx.facSee=()=>false;
  for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'A closed door or wall must block a grab');
  ctx.facSee=()=>true;F.dm.y=0;for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Another floor must block a grab');F.dm.y=F.pl.y;
  F.dm.st='reveal';for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Reveals cannot kill');
  F.dm.st='chase';F.dm.safeUntil=F.t+1.2;for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Reaction window must prevent a grab');F.dm.safeUntil=0;
  for(let i=0;i<8;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Brief contact should be escapable');
  F.dm.z-=1;A.facDmCatch(F,.05);assert.equal(F.dm.grabT,0);F.dm.z=F.pl.z-.65;
  for(let i=0;i<11;i++)A.facDmCatch(F,.05);assert.equal(F.pl.hp,72,'Sustained contact should damage health');assert(!ctx.HZ.dead);
  for(let i=0;i<30;i++)A.facDmCatch(F,.05);assert.equal(F.pl.hp,72,'One collision must not drain every health point');
});
test('final alarm targets the breaker rather than a hidden player',()=>{
  const {ctx,A,F}=hunter();F.dir.final=true;F.dm.st='prowl';F.dm.stT=0;ctx.facOnScreen=()=>true;F.dir.ambT=1000;
  A.facDirector(F,.05);assert.equal(F.dm.mem.x,F.W.breaker.x);assert.equal(F.dm.mem.z,F.W.breaker.z);
});
test('the real closed door leaf blocks a grab and opening it restores line of sight',()=>{
  const {ctx,A,F}=hunter();F.dm.st='chase';F.dm.x=48.93;F.dm.z=21.75;F.pl.x=49.57;F.pl.z=21.75;
  const door={hx:49.25,hz:21.02,y:4,w:1.46,a0:Math.PI/2,th:0,tgt:0};F.doors=[door];
  for(let i=0;i<15;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead);assert.equal(F.dm.grabT,0);
  door.th=-Math.PI/2;for(let i=0;i<11;i++)A.facDmCatch(F,.05);assert.equal(F.pl.hp,72,'Opening the door should restore visible physical contact');assert(!ctx.HZ.dead);
});
test('the opening grace period prevents detection and director ambushes',()=>{
  const {ctx,A,F}=hunter();F.dir.graceUntil=F.t+35;F.dir.alertAt=F.t;F.dir.ambT=0;F.dm.stT=0;
  for(let i=0;i<60;i++){F.t+=.05;A.facDemonTick(F,.05);A.facDirector(F,.05);}
  assert.equal(F.dm.st,'prowl');assert.equal(F.dm.alert,0);assert(!ctx.HZ.dead);
});

test('every emergency wall lamp has a supported housing and a single recessed luminous face',()=>{
  const {A,W,ctx}=shared,lamps=W.lights.filter(l=>l.wall);
  assert(lamps.length>=12);
  for(const l of lamps){
    assert(l.mount&&l.wallL&&Number.isFinite(l.px),'No mount for lamp '+JSON.stringify(l));
    const m=l.mount,tx=m.nz,tz=-m.nx;
    assert.equal(Math.abs(m.nx)+Math.abs(m.nz),1);
    for(const u of[-.125,0,.125])for(const v of[-.165,0,.165]){
      assert(!ctx.facAir(W,m.x+tx*u-m.nx*.035,m.y+v,m.z+tz*u-m.nz*.035),'Backplate has no wall support');
      assert(ctx.facAir(W,m.x+tx*u+m.nx*.12,m.y+v,m.z+tz*u+m.nz*.12),'Lens faces a wall or ceiling');
    }
    assert(Math.hypot(l.px-m.x,l.pz-m.z)<.101,'Lighting position should follow the actual fixture');
    const quads=[];A.facWallLightGeo({quad(...q){quads.push(q);}},m,[1,.1,.06,0]);
    assert.equal(quads.filter(q=>q[0]==='emis').length,1,'A wall light must have one lens face, not a glowing cube');
    assert(quads.filter(q=>q[0]==='paint').length>=30,'Fixture should include a housing and cage');
    assert(quads.every(q=>q[1].every(Number.isFinite)&&q[2].every(Number.isFinite)&&q[3].every(Number.isFinite)));
  }
});
test('an unsupported wall lamp produces no floating geometry or light source',()=>{
  const {A,W}=shared,l={k:1,x:56,z:22,col:'red',wall:true,y:5.95};
  // Centre of a large real room; no supporting wall within the mount search.
  assert.equal(A.facWallLightMount(W,l),null);const quads=[],testWorld={...W,lights:[l]};
  A.facGeomLights(testWorld,{quad(...q){quads.push(q);}});assert.equal(quads.length,0);assert.equal(l.px,undefined);
  A.facLightsPrep(testWorld);assert.equal(testWorld.BL.length,0,'Unsupported fixture should not leave invisible baked light');
});
test('the uploaded ghost is wired into the entry page and all three east-wing ghost doors',()=>{
  assert(core.includes('FacilityGhost.load'));assert(core.includes('FacilityGhost.createActor'));assert(html.includes('assets/horror/ghost.js'));
  const {W}=shared;assert.equal(W.doors.filter(d=>d.scare==='wraith').length,3);
  assert(W.doors.every(d=>!d.scare||d.scare==='crawler'||d.scare==='wraith'));
  assert(!core.includes("facHauntSpawn(F,'patient'"));
  const init=section('function facHauntInit(F){','function facHauntFree(F)');assert(!init.includes('ConeGeometry'));assert(!init.includes('SphereGeometry'));
  assert(fs.readFileSync(path.join(root,'assets/horror/ghost.js'),'utf8').includes('unvermeidlich-ghost.glb'));
});

test('wall panels stay clear of structural wall textures on every floor',()=>{
  const {ctx,W}=shared,{verticalRect,overlaps}=require('./helpers/surface-geometry.cjs'),walls=[],props=[],B=ctx.facBuilder();let list=walls;
  B.quad=(...args)=>{const r=verticalRect(...args);if(r)list.push(r);};
  ctx.facGeomWorld(W,B);list=props;ctx.facGeomProps(W,B);
  assert(walls.length>10000&&props.length>1000,'Check the complete generated building');
  const hits=overlaps(walls,props,.008);
  assert.equal(hits.length,0,'Wall props compete with the structure: '+JSON.stringify(hits.slice(0,2)));
});
test('door jambs and lintels meet without overlapping their textured faces',()=>{
  const {ctx,W}=shared,{verticalRect,overlaps}=require('./helpers/surface-geometry.cjs'),rects=[];
  ctx.facGeomFrames(W,{quad(...args){const r=verticalRect(...args);if(r)rects.push(r);}});
  assert(rects.length>500,'Check all door frames, including stacked east-wing doors');
  const hits=overlaps(rects);
  assert.equal(hits.length,0,'Overlapping door trim: '+JSON.stringify(hits.slice(0,2)));
});

test('the enlarged spider collision body passes through a narrow original doorway',()=>{
  const {ctx,A,F}=harness();A.facDoorsInit(F,{});F.W.bh=new Map();
  const d=F.doors.find(d=>d.k===1&&Math.abs(d.cx-11)<.1&&Math.abs(d.cz-4.25)<.1);assert(d);assert(d.w<1);
  d.th=d.tgt=Math.PI/2;const spider=ctx.FacilitySpider.createActor(),body={x:11,y:4,z:5.4};
  for(let i=0;i<80;i++)A.facMove(F,body,0,-.04,spider.radius,spider.height,.28);
  assert(body.z<3.8,'The larger collision body should get through the original starting-room door');ctx.FacilitySpider.release(spider);
});

test('all six marked spider doors can still prime the enlarged creature',()=>{
  const {A,F}=harness();A.facHauntInit(F);A.facDoorsInit(F,{});
  const doors=F.doors.filter(d=>d.scare==='crawler');assert.equal(doors.length,6);
  for(const d of doors){
    F.pl.x=d.cx-1.5;F.pl.y=d.y;F.pl.z=d.cz;F.camY=d.y+1.62;F.t+=80;F.haunt.next=0;
    A.facHauntDoor(F,d,F.pl.x,F.pl.z);assert(F.haunt.active&&F.haunt.active.kind==='crawler','Larger spider cannot spawn behind east-wing door at '+d.cx+','+d.cz+' floor '+d.k);A.facHauntEnd(F);
  }A.facHauntDispose(F);
});

test('the spider gives a reaction window and keeps closing on a walking player beyond six seconds',()=>{
  const {A,F}=harness();A.facHauntInit(F);F.pl.x=47.75;F.pl.y=4;F.pl.z=16;F.camY=5.62;
  assert(A.facHauntSpawn(F,'crawler',[47.75,4,6],'hunt'));const spider=F.haunt.active;
  for(let i=1;i<=160;i++){
    const t=i*.05;F.t+=.05;F.pl.z=16+3.15*t;A.facHauntTick(F,.05);
    if(i===12)assert(Math.abs(spider.z-6)<.001,'Initial warning should allow time to react');
  }
  assert(F.haunt.active===spider,'A real pursuit should last longer than the former six-second scare');
  assert(spider.z>30,'The spider should actually move down the corridor after the player');
  assert(F.pl.z-spider.z<4,'It should close the initial gap while the player only walks');
  A.facHauntDispose(F);
});
test('spider pursuit follows the last visible position and gives up after cover breaks sight',()=>{
  const {ctx,A,F}=harness();A.facHauntInit(F);F.pl.x=47.75;F.pl.y=4;F.pl.z=36;F.camY=5.62;
  assert(A.facHauntSpawn(F,'crawler',[47.75,4,25],'hunt'));const spider=F.haunt.active,goals=[];
  ctx.facHauntWalk=(F,a,x,y,z,speed)=>goals.push({x,y,z,speed});
  for(let i=0;i<30;i++){F.t+=.05;A.facHauntTick(F,.05);}assert(spider.aware&&goals.length>0);
  F.pl.x=55;F.pl.z=33;
  for(let i=0;i<60;i++){F.t+=.05;A.facHauntTick(F,.05);}
  assert(F.haunt.active===spider);assert(goals.every(p=>p.x===47.75&&p.z===36),'Cover must prevent perfect tracking of the hidden player');
  for(let i=0;i<12;i++){F.t+=.05;A.facHauntTick(F,.05);}assert.equal(F.haunt.active,null,'Breaking sight should end the chase');
  A.facHauntDispose(F);
});
test('an actual door reveal lets the enlarged spider pursue into the corridor',()=>{
  const {A,F}=harness();A.facHauntInit(F);A.facDoorsInit(F,{});A.facNav(F);
  const d=F.doors.find(d=>d.k===1&&Math.abs(d.cx-49.25)<.1&&Math.abs(d.cz-10.75)<.1);assert(d);
  F.pl.x=47.75;F.pl.y=4;F.pl.z=d.cz;F.camY=5.62;d.th=d.tgt=0;F.haunt.next=0;
  A.facDoorOpen(F,d,F.pl.x,F.pl.z,false);assert(F.haunt.active);const spider=F.haunt.active;let nearest=spider.x;
  for(let i=0;i<160&&F.haunt.active;i++){F.t+=.05;A.facDoorsTick(F,.05);A.facHauntTick(F,.05);nearest=Math.min(nearest,spider.x);}
  assert(nearest<49.05,'Spider stayed behind the open door at x='+nearest);A.facHauntDispose(F);
});
test('the enlarged creature can route around a solid obstacle rather than run in place',()=>{
  const {ctx,A,F}=harness();F.W.bh=new Map();
  const block={x0:56,y0:4,z0:21,x1:58,y1:5.2,z1:23,m:'prop'};ctx.facHashAdd(F.W.bh,block);A.facNav(F);
  const a={x:52.25,y:4,z:22,g:new T.Group(),spider:{},radius:.42,height:.78,repath:0,path:null,pi:0};
  assert.equal(A.facHauntClear(F,a,62.25,4,22),false,'The direct line should be blocked');let detour=0;
  for(let i=0;i<200;i++){F.t+=.05;A.facHauntWalk(F,a,62.25,4,22,3.85,.05);detour=Math.max(detour,Math.abs(a.z-22));}
  assert(detour>1.3,'The route should pass around the box');assert(Math.hypot(a.x-62.25,a.z-22)<.8,'Creature got stuck on the obstacle at '+a.x+','+a.z);
});
test('a sprinting player gains distance from the spider',()=>{
  const {A,F}=harness();A.facHauntInit(F);F.pl.x=47.75;F.pl.y=4;F.pl.z=10;F.camY=5.62;
  assert(A.facHauntSpawn(F,'crawler',[47.75,4,6],'hunt'));const spider=F.haunt.active;
  for(let i=1;i<=80;i++){F.t+=.05;F.pl.z=10+5.9*i*.05;A.facHauntTick(F,.05);}
  assert(F.pl.z-spider.z>10,'Sprinting should provide a fair escape');A.facHauntDispose(F);
});

test('health survives three hunter hits, ignores repeated contact, and only recovers out of danger',()=>{
  const {A,F,ctx}=harness();
  for(let i=0;i<3;i++){
    F.t+=2;assert(A.facDamage(F,F.pl,28));assert(!A.facDamage(F,F.pl,28),'Damage cooldown must prevent per-frame damage');
  }
  assert.equal(F.pl.hp,16);assert(!ctx.HZ.dead);
  F.t+=13;F.dm.st='chase';A.facHealthTick(F,1);assert.equal(F.pl.hp,16,'No recovery while being hunted');
  F.dm.st='prowl';A.facHealthTick(F,1);assert.equal(F.pl.hp,20);
  F.t+=2;A.facDamage(F,F.pl,28);assert.equal(F.pl.hp,0);assert(ctx.HZ.dead);
});
test('a downed teammate can be revived nearby but not through a wall, and the whole team can lose',()=>{
  const {A,F,ctx}=harness();ctx.facSee=()=>true;
  const other={...F.pl,netId:'friend',name:'Friend',x:F.pl.x+.7,hp:20};
  F.coop={host:true,players:new Map([['friend',other]])};A.facDamage(F,other,28);
  assert(other.downed);assert(!ctx.HZ.dead);A.facHealthTick(F,.1);assert(!F.coop.outcome);
  ctx.facSee=()=>false;assert.equal(A.facRevive(F,F.pl,other),false);
  ctx.facSee=()=>true;assert(A.facRevive(F,F.pl,other));assert.equal(other.hp,40);assert(!other.downed);
  assert.equal(A.facDamage(F,other,28),false,'Revival grants a short escape window');
  other.downed=true;F.pl.hp=0;F.pl.downed=true;A.facHealthTick(F,.1);assert.equal(F.coop.outcome,'lost');
});
test('the hunter can choose a guest, keeps the last target behind cover, and skips downed players',()=>{
  const {A,F,ctx}=hunter();const guest={...F.pl,netId:'guest',x:F.dm.x+.5,y:4,z:F.dm.z,hp:100};
  F.coop={host:true,players:new Map([['guest',guest]])};ctx.facDmSee=(F,p)=>p===guest?1:0;
  assert.equal(A.facHuntTarget(F),guest);ctx.facDmSee=()=>0;assert.equal(A.facHuntTarget(F),guest);
  guest.downed=true;assert.equal(A.facHuntTarget(F),F.pl);
  F.coop.host=false;assert.equal(A.facDamage(F,F.pl,28),false,'Guests cannot run a second damage simulation');
});
test('the hunter takes a direct clear capsule route and recovers an invalid detached body',()=>{
  const {A,F,ctx}=harness();Object.assign(F.dm,{x:47.75,y:4,z:10,st:'chase',g:new T.Group(),on:true,t:0,stT:2});
  const start=F.dm.z;
  for(let i=0;i<60;i++)A.facDmGo(F,47.75,4,25,A.FDM.chase,1/60);
  assert(F.dm.z-start>4.4,'Grid waypoints must not waste the configured chase speed');
  F.dm.x=NaN;F.dm.y=-100;ctx.facDmBody=()=>{};ctx.facDmSee=()=>0;ctx.facDmHear=()=>null;ctx.facDmGo=()=> 'move';
  A.facDemonTick(F,.05);assert([F.dm.x,F.dm.y,F.dm.z].every(Number.isFinite));assert.equal(F.dm.g.parent,F.scene);
});
test('room parameters survive the game loader and asset updates invalidate old gameplay caches',()=>{
  const location={href:'https://example.test/game.html?coop=join&room=ABC234&name=Kai',search:'?coop=join&room=ABC234&name=Kai',replace(v){this.redirect=v;}},link={};
  const script=[...fs.readFileSync(path.join(root,'game.html'),'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][0][1];
  vm.runInNewContext(script,{URL,location,document:{getElementById:()=>link}});const u=new URL(location.redirect);
  assert.equal(u.searchParams.get('room'),'ABC234');assert.equal(u.searchParams.get('coop'),'join');assert.equal(u.searchParams.get('name'),'Kai');assert.equal(u.searchParams.get('facility'),'1');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert(sw.includes('facility-coop-survival-r1-20261021'));assert(!sw.includes("pathname.includes('/assets/')"));
  const code=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(code.includes('PLAY CO-OP'));assert(code.includes('facility-menu.js'));assert(html.includes('assets/facility-coop.js'));
});

function coopWorld(h,mode='host'){
  const {A,F,ctx}=h;ctx.location.search='?coop='+mode+'&room=ABC234&name='+mode;
  A.facCoopConfig(F);F.pl.netId='local';F.dm.g=new T.Group();Object.assign(F.dm,{x:20,y:4,z:3,face:0,st:'away',on:false});
  F.U.uEmg={value:1};F.held=0;F.fuses=0;F.fz=[{x:11,y:5.3,z:8.3,got:false,m:new T.Mesh(),gl:new T.Sprite()}];F.bats=[{x:11,y:5.3,z:8.3,got:false,m:new T.Mesh()}];
  F.brk={x:11,y:5.3,z:8.3,n:0,sockets:[new T.Mesh(),new T.Mesh(),new T.Mesh()]};
  F.lift={open:0,want:0,arrive:-1,box:{off:false},doors:[]};
  ctx.facNetScreen=()=>{};ctx.facDmBody=()=>{};ctx.facSee=()=>true;ctx.facOnScreen=()=>false;return h;
}
test('co-op requests are idempotent, range checked, bounded, and cannot forge health',()=>{
  const {A,F,ctx}=coopWorld(harness());const p={...F.pl,netId:'guest',ack:0,loading:false,name:'Guest'};F.coop.id='host';F.coop.players.set('guest',p);
  const conn={peer:'guest'},input={type:'input',version:1,pose:{...p,yaw:0,pitch:0,hp:999},actions:[{id:1,t:'fuse',i:0}]};
  A.facNetInput(F,conn,input);A.facNetInput(F,conn,input);assert.equal(F.fuses,1);assert.equal(F.held,1);assert.equal(p.hp,100);assert(F.fz[0].got);
  A.facNetInput(F,conn,{...input,actions:[{id:2,t:'brk'}]});assert.equal(F.brk.n,1);assert.equal(F.held,0);
  A.facNetInput(F,conn,{...input,actions:[{id:2,t:'brk'}]});assert.equal(F.brk.n,1);
  A.facNetInput(F,conn,{...input,pose:{...p,x:NaN},actions:[]});assert(Number.isFinite(p.x));
  p.x=60;A.facNetAction(F,p,{t:'bat',i:0});assert(!F.bats[0].got,'A distant player cannot collect an item');
  p.x=11;A.facNetAction(F,p,{t:'bat',i:0});A.facNetAction(F,p,{t:'bat',i:0});assert.equal(p.batteryPicks,1,'One shared battery can only be picked once');
});
test('host snapshots synchronize a late join, health, doors and pickups without trusting guest world state',()=>{
  const host=coopWorld(harness()),guest=coopWorld(harness(),'join');host.F.coop.id='host';guest.F.coop.id='guest';
  const p={...host.F.pl,netId:'guest',name:'Guest',hp:72,hit:1,ack:2,batteryPicks:1};host.F.coop.players.set('guest',p);guest.F.coop.actions=[{id:1},{id:2},{id:3}];
  host.A.facDoorsInit(host.F,{});guest.A.facDoorsInit(guest.F,{});host.F.doors[0].th=.6;host.F.doors[0].tgt=1.58;
  host.F.fz[0].got=true;host.F.fuses=host.F.held=1;guest.F.pl.bat=.2;
  guest.A.facNetWorld(guest.F,host.A.facNetSnapshot(host.F));
  assert(guest.F.coop.ready);assert.equal(guest.F.pl.hp,72);assert.equal(guest.F.pl.bat,.7);assert.equal(guest.F.fuses,1);assert(guest.F.fz[0].got);assert.equal(guest.F.doors[0].th,.6);assert.equal(guest.F.coop.actions.length,1);assert(guest.F.coop.players.has('host'));
  guest.A.facNetWorld(guest.F,host.A.facNetSnapshot(host.F));assert.equal(guest.F.pl.bat,.7,'Repeated snapshots cannot duplicate a battery');
});

test('four separate clients create/join a room, exchange real protocol packets, and reject a fifth',async t=>{
  // In-memory transport exercises the actual room protocol, not browser ICE/NAT.
  const {EventEmitter}=require('node:events'),peers=new Map();let serial=0;
  class Connection extends EventEmitter{
    constructor(peer,metadata){super();this.peer=peer;this.metadata=metadata;this.open=false;this.bufferSize=0;}
    send(data){if(!this.open)throw Error('closed');const packet=JSON.parse(JSON.stringify(data));queueMicrotask(()=>this.other.emit('data',packet));}
    close(){if(!this.open)return;this.open=false;this.other.open=false;this.emit('close');this.other.emit('close');}
  }
  class Peer extends EventEmitter{
    constructor(id){super();this.id=id||'guest-'+(++serial);this.connections=[];if(peers.has(this.id)){queueMicrotask(()=>this.emit('error',{type:'unavailable-id'}));return;}peers.set(this.id,this);queueMicrotask(()=>this.emit('open',this.id));}
    connect(id,options){const remote=peers.get(id),a=new Connection(id,options.metadata),b=new Connection(this.id,options.metadata);a.other=b;b.other=a;this.connections.push(a);remote.connections.push(b);queueMicrotask(()=>{remote.emit('connection',b);a.open=b.open=true;a.emit('open');b.emit('open');});return a;}
    destroy(){this.destroyed=true;for(const c of this.connections)c.close();peers.delete(this.id);}
  }
  const host=coopWorld(harness()),guests=[coopWorld(harness(),'join'),coopWorld(harness(),'join'),coopWorld(harness(),'join')],all=[host,...guests];
  t.after(()=>all.forEach(h=>h.A.facCoopDispose(h.F)));
  for(const h of all)h.ctx.Peer=Peer;
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  await host.A.facCoopStart(host.F);await flush();assert(host.F.coop.ready);
  for(const g of guests){await g.A.facCoopStart(g.F);await flush();assert(g.F.coop.ready);}
  assert.equal(host.F.coop.players.size,3);
  guests[0].A.facNetQueue(guests[0].F,{t:'fuse',i:0});guests[0].A.facCoopTick(guests[0].F,.05);await flush();assert.equal(host.F.fuses,1);
  host.F.coop.sendAt=0;host.A.facCoopTick(host.F,.05);await flush();
  for(const g of guests){assert.equal(g.F.fuses,1);assert.equal(g.F.coop.players.size,3);}
  const fifth=coopWorld(harness(),'join');fifth.ctx.Peer=Peer;all.push(fifth);await fifth.A.facCoopStart(fifth.F);await flush();assert.match(fifth.F.coop.error,/full/);assert.equal(host.F.coop.players.size,3);
  guests[0].A.facCoopDispose(guests[0].F);assert.equal(host.F.coop.players.size,2);
  host.A.facCoopDispose(host.F);assert.match(guests[1].F.coop.error,/host disconnected/i);
});
