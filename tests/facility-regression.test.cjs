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
const signRuntime=fs.readFileSync(path.join(root,'assets/horror/signs.js'),'utf8');
const html=fs.readFileSync(path.join(root,'game-core.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const core=scripts.find(s=>s.includes('function facPlan()'));
const three=scripts.find(s=>s.includes('Copyright 2010-2021 Three.js Authors'));
function section(start,end){const i=core.indexOf(start),j=core.indexOf(end,i);assert(i>=0&&j>i,start);return core.slice(i,j);}
const threeCtx={};vm.createContext(threeCtx);vm.runInContext(three,threeCtx);
const T=threeCtx.THREE;
function harness(buildGeometry=false){
  const ctx={T,console,performance,Float32Array,Uint8Array,Int8Array,Int16Array,Int32Array,Uint32Array,Map,Set,Math,Promise,setTimeout,
    document:{createElement:()=>({getContext:()=>({font:'',fillRect(){},strokeRect(){},fillText(){},save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText(t){return{width:t.length*(parseFloat(this.font.match(/([0-9]+)px/)?.[1])||25)*.58};}})})},
    keys:{},touchMove:{x:0,y:0},padMove:{x:0,y:0},padRun:false,firing:false,HZ:{},meta:{flash:false},
    sens:()=>1,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),vib:()=>{},
    facSndGasp(){},facSndStep(){},facSndLand(){},facSndClick(){},facSndCreak(){},facSndSlam(){},facSndBump(){},facSndBang(){},facSndLatch(){},facSndRattle(){},facDmRoar(){},facDmSniff(){},facDmBreath(){},facDie(){ctx.HZ.dead=true;},facSting(){},facPS(){},sfxT(){},sfxN(){},facTip(){},
  };
  ctx.THREE=T;ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(spiderRuntime,ctx);vm.runInContext(signRuntime,ctx);
  const model=new T.Group();model.add(new T.Mesh(new T.BoxGeometry(1,.3,1),new T.MeshStandardMaterial()));
  ctx.FacilitySpider.prepare({scene:model,animations:[new T.AnimationClip('Spider walking',1,[]),new T.AnimationClip('Spider running',.3,[])]});
  const code=section('const FCY=','/* ===== BUILD 3.15: THE FACILITY — part 2:')+
    section('function facDoorSeg(d)','/* ---------- doors: heavy leaves')+
    section('function facDoorGeo(F,M,d)','/* ===== BUILD 3.15: THE FACILITY — part 4:')+
    section('const FAC=','let FACW=')+
    section('const FDM=','/* ---------- sound:')+
    section('function facPlayer(F,dt)','/* ---------- looking at things you can use')+
    section('/* Native Facility encounters.','/* ---------- each frame ---------- */');
  vm.runInContext(code+'\nglobalThis.api={facPlan,facGrid,facNav,facNodeNear,facNP,facPath,facMove,facPush,facPlayer,facGround,facDoorSeg,facDoorDistance,facDoorSweep,facDoorsInit,facDoorsTick,facDoorOpen,facHauntInit,facHauntDoor,facHauntWalk,facHauntTick,facHauntEnd,facHauntFree,facHauntSpawn,facHauntDispose,facDmCatch,facDmState,facDmReveal,facDmPlace,facDemonTick,facDirector,facDmSee,facWallLightMount,facWallLightGeo,facGeomLights,facLightsPrep,FDM,facGeomAll,facBake,FAC,FCY,FNX,FNZ};',ctx);
  vm.runInContext('facDoorGeo=()=>({rotation:{y:0}});facLook=()=>{};facUse=()=>{};',ctx);
  const A=ctx.api,W=A.facPlan();A.facGrid(W);if(buildGeometry)A.facGeomAll(W);
  const F={W,doors:[],scene:new T.Scene(),t:20,noise:[],dm:{x:2,y:4,z:2,on:false,vis:false,st:'away'},stage:'find',fuses:0,dir:{t:0,lastChase:0,lastSeen:0,recoverUntil:0,graceUntil:0},camY:5.62,U:{uPow:{value:1},uEmg:{value:1}},pl:{x:11,y:4,z:8.2,yaw:0,pitch:0,vx:0,vz:0,vy:0,ground:true,sta:1,bat:1,light:true,crouch:false,bob:0,bobA:0,roll:0,ch:1.62,fear:0}};
  A.facNav(F);ctx.HZ={pl:F.pl,padHold:false};ctx.cam=new T.PerspectiveCamera();
  return{ctx,A,F,W};
}
const shared=harness(true);
test('every inline script parses, including launch entry points',()=>{
  for(const [name,code] of [['spider',spiderRuntime],['signs',signRuntime]])new vm.Script(code,{filename:'assets/horror/'+name+'.js'});
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
test('only the rigged spider spawns, door reveals are delayed, and encounters clean up',()=>{
  const {ctx,A,F}=harness();A.facHauntInit(F);
  assert.equal(F.haunt.actors.length,1);assert.equal(F.haunt.actors[0].kind,'crawler');
  assert.equal(A.facHauntSpawn(F,'wraith',[24,4,3],'watch'),false);assert.equal(A.facHauntSpawn(F,'patient',[24,4,3],'cross'),false);
  const d={cx:49.25,cz:21.75,y:4,nx:-1,nz:0,th:0,scare:'crawler'};
  F.pl.x=47.75;F.pl.z=21.75;A.facHauntDoor(F,d,F.pl.x,F.pl.z);
  assert(F.haunt.active,'Expected opening the door to prime a scare');assert.equal(F.haunt.active.g.visible,false);
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
  const initial=leg.quaternion.clone();
  for(let i=0;i<30;i++)S.tick(spider,3.9,1/60);
  assert(initial.angleTo(leg.quaternion)>.01,'Real leg joints should animate');
  assert(spider.runWeight>.9,'Fast movement should select native running');
  const bounds=S.poseBounds(asset.root),size=bounds.getSize(new T.Vector3());
  assert(Math.max(size.x,size.z)<1.1&&Math.max(size.x,size.z)>.7,'Scale should fit Facility doorways');
  assert(bounds.min.y>=-.015&&bounds.min.y<.08,'Feet should rest on the floor');
  assert(size.y<.45,'A spider should be low to the ground');
  const fang=asset.root.getObjectByName('FangL_038').getWorldPosition(new T.Vector3()),back=asset.root.getObjectByName('Back_037').getWorldPosition(new T.Vector3());
  assert(fang.z>back.z,'The face should point along actor +Z');
  const time=spider.run.time;for(let i=0;i<20;i++)S.tick(spider,0,1/60);assert.equal(spider.run.time,time,'Blocked spider must not run in place');
  S.release(spider);assert.equal(asset.visual.parent,null);
  const retry=S.createActor();S.tick(retry,2,1/60);assert.equal(asset.visual.parent,retry.visual,'Retry should reattach the cached rig');S.release(retry);
});
test('a creature waiting at a closed door requests opening once',()=>{
  const {ctx,A,F}=harness();let opens=0;
  F.nav={doorOf:[-1,0]};F.doors=[{cx:24,cz:3,y:4,th:0,tgt:0,lock:false}];
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
test('hunter loses visual tracking behind cover, tires on long chases, and rests after escape',()=>{
  const {ctx,A,F}=hunter();F.fuses=3;F.dir.final=true;A.facDmState(F,'chase');F.dm.stT=2;F.dm.mem={x:12,y:4,z:9,t:F.t};ctx.facDmSee=()=>0;
  F.pl.x=40;F.pl.z=30;F.t+=.5;A.facDemonTick(F,.05);
  assert.equal(F.lastGoal.x,12,'Should visit the last known position instead of tracking through walls');assert(F.lastGoal.speed<5.9);
  F.dm.stT=8.1;F.dm.lastVisual=F.t;A.facDemonTick(F,.05);assert(F.lastGoal.speed<A.FAC.walk,'Tired hunter should be escapable at walking speed');
  F.t+=4.1;A.facDemonTick(F,.05);assert.equal(F.dm.st,'search');assert(F.dir.recoverUntil>=F.t+14);
  const before=F.dm.alert;ctx.facDmSee=()=>1;F.t+=.1;A.facDemonTick(F,.05);assert(F.dm.alert<=before,'Recovery should stop an immediate repeat chase');
});
test('a hunter grab needs sustained visible contact and respects closed doors, floors and reaction time',()=>{
  const {ctx,A,F}=hunter();F.dm.st='chase';F.dm.z=F.pl.z-.65;ctx.facSee=()=>false;
  for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'A closed door or wall must block a grab');
  ctx.facSee=()=>true;F.dm.y=0;for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Another floor must block a grab');F.dm.y=F.pl.y;
  F.dm.st='reveal';for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Reveals cannot kill');
  F.dm.st='chase';F.dm.safeUntil=F.t+1.2;for(let i=0;i<20;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Reaction window must prevent a grab');F.dm.safeUntil=0;
  for(let i=0;i<8;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead,'Brief contact should be escapable');
  F.dm.z-=1;A.facDmCatch(F,.05);assert.equal(F.dm.grabT,0);F.dm.z=F.pl.z-.65;
  for(let i=0;i<11;i++)A.facDmCatch(F,.05);assert(ctx.HZ.dead,'Sustained visible contact should still be dangerous');
});
test('final alarm targets the breaker rather than a hidden player',()=>{
  const {ctx,A,F}=hunter();F.dir.final=true;F.dm.st='prowl';F.dm.stT=0;ctx.facOnScreen=()=>true;F.dir.ambT=1000;
  A.facDirector(F,.05);assert.equal(F.dm.mem.x,F.W.breaker.x);assert.equal(F.dm.mem.z,F.W.breaker.z);
});
test('the real closed door leaf blocks a grab and opening it restores line of sight',()=>{
  const {ctx,A,F}=hunter();F.dm.st='chase';F.dm.x=48.93;F.dm.z=21.75;F.pl.x=49.57;F.pl.z=21.75;
  const door={hx:49.25,hz:21.02,y:4,w:1.46,a0:Math.PI/2,th:0,tgt:0};F.doors=[door];
  for(let i=0;i<15;i++)A.facDmCatch(F,.05);assert(!ctx.HZ.dead);assert.equal(F.dm.grabT,0);
  door.th=-Math.PI/2;for(let i=0;i<11;i++)A.facDmCatch(F,.05);assert(ctx.HZ.dead,'Opening the door should restore visible physical contact');
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
test('the active entry pages cannot load retired ghosts or select humanoid scare routes',()=>{
  assert(!core.includes('FacilityGhost'));assert(!core.includes("facHauntSpawn(F,'wraith'"));assert(!core.includes("facHauntSpawn(F,'patient'"));
  const {W}=shared;assert(W.doors.every(d=>!d.scare||d.scare==='crawler'));
  for(const name of ['index.html','game.html','sw.js'])assert(!fs.readFileSync(path.join(root,name),'utf8').includes('ghost.js'));
  assert(!html.includes('assets/horror/ghost.js'));assert(!html.includes('unvermeidlich-ghost.glb'));
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
