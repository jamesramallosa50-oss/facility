/* Run with: node --test tests/facility-regression.test.cjs
   Executes the real level, navigation, capsule physics, movement, and creature
   code with the bundled Three.js. No WebGL/browser emulation is involved. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'game-core.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const core=scripts.find(s=>s.includes('function facPlan()'));
const three=scripts.find(s=>s.includes('Copyright 2010-2021 Three.js Authors'));
function section(start,end){const i=core.indexOf(start),j=core.indexOf(end,i);assert(i>=0&&j>i,start);return core.slice(i,j);}
const threeCtx={};vm.createContext(threeCtx);vm.runInContext(three,threeCtx);
const T=threeCtx.THREE;
function harness(buildGeometry=false){
  const ctx={T,console,performance,Float32Array,Uint8Array,Int8Array,Int16Array,Int32Array,Uint32Array,Map,Set,Math,Promise,setTimeout,
    document:{createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})},
    keys:{},touchMove:{x:0,y:0},padMove:{x:0,y:0},padRun:false,firing:false,HZ:{},meta:{flash:false},
    sens:()=>1,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),vib:()=>{},
    facSndGasp(){},facSndStep(){},facSndLand(){},facSndClick(){},facSndCreak(){},facSndSlam(){},facSndBump(){},facSndBang(){},facSndLatch(){},facSndRattle(){},facSting(){},facPS(){},sfxT(){},sfxN(){},facTip(){},
  };
  vm.createContext(ctx);
  const code=section('const FCY=','/* ===== BUILD 3.15: THE FACILITY — part 2:')+
    section('function facDoorSeg(d)','/* ---------- doors: heavy leaves')+
    section('function facDoorGeo(F,M,d)','/* ===== BUILD 3.15: THE FACILITY — part 4:')+
    section('const FAC=','let FACW=')+
    section('function facPlayer(F,dt)','/* ---------- looking at things you can use')+
    section('/* Native Facility encounters.','/* ---------- each frame ---------- */');
  vm.runInContext(code+'\nglobalThis.api={facPlan,facGrid,facNav,facNodeNear,facNP,facPath,facMove,facPush,facPlayer,facGround,facDoorSeg,facDoorDistance,facDoorSweep,facDoorsInit,facDoorsTick,facDoorOpen,facHauntInit,facHauntDoor,facHauntTick,facHauntEnd,facHauntFree,facHauntSpawn,facHauntDispose,facGeomAll,facBake,FAC,FCY,FNX,FNZ};',ctx);
  vm.runInContext('facDoorGeo=()=>({rotation:{y:0}});facLook=()=>{};facUse=()=>{};',ctx);
  const A=ctx.api,W=A.facPlan();A.facGrid(W);if(buildGeometry)A.facGeomAll(W);
  const F={W,doors:[],scene:new T.Scene(),t:20,noise:[],dm:{x:2,y:4,z:2,on:false,vis:false,st:'away'},stage:'find',camY:5.62,U:{uPow:{value:1}},pl:{x:11,y:4,z:8.2,yaw:0,pitch:0,vx:0,vz:0,vy:0,ground:true,sta:1,bat:1,light:true,crouch:false,bob:0,bobA:0,roll:0,ch:1.62,fear:0}};
  A.facNav(F);ctx.HZ={pl:F.pl,padHold:false};ctx.cam=new T.PerspectiveCamera();
  return{ctx,A,F,W};
}
const shared=harness(true);
test('every inline script parses, including launch entry points',()=>{
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
test('three distinct creatures spawn, door reveals are delayed, and encounters clean up',()=>{
  const {ctx,A,F}=harness();A.facHauntInit(F);
  assert.equal(F.haunt.actors.length,3);assert.equal(new Set(F.haunt.actors.map(a=>a.kind)).size,3);
  const d={cx:49.25,cz:21.75,y:4,nx:-1,nz:0,th:0,scare:'patient'};
  F.pl.x=47.75;F.pl.z=21.75;A.facHauntDoor(F,d,F.pl.x,F.pl.z);
  assert(F.haunt.active,'Expected opening the door to prime a scare');assert.equal(F.haunt.active.g.visible,false);
  vm.runInContext('facSee=()=>true;facOnScreen=()=>true;',ctx);d.th=.8;A.facHauntTick(F,.1);
  assert.equal(F.haunt.active.g.visible,true);assert(F.haunt.active.stung);
  A.facHauntEnd(F);assert.equal(F.haunt.active,null);assert(F.haunt.actors.every(a=>!a.g.visible));
  F.haunt.blackout=.01;A.facHauntTick(F,.05);assert.equal(F.U.uPow.value,1);
  F.dm.st='chase';F.haunt.next=0;assert.equal(A.facHauntFree(F),false);
  A.facHauntDispose(F);assert.equal(F.haunt,null);
});
