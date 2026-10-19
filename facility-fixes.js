/* Facility runtime fixes v1: collisions, visual stability and demon recovery.
   Runs in the gameplay iframe after its original scripts have initialized. */
(()=>{
'use strict';
let lastGame=null, lastPos=null, seen=0, lastDemonPos=null, stuck=0;
function active(){try{return typeof HZ!=='undefined'&&HZ&&HZ.fac&&HZ.fac.pl&&!HZ.loading&&!HZ.dead;}catch(_){return false;}}
function blockedByDoor(d,x,z,r=.31){
 if(!d||Math.abs(d.th)>.88)return false;
 const a=d.a0+d.th, vx=Math.cos(a)*d.w,vz=Math.sin(a)*d.w;
 const t=Math.max(0,Math.min(1,((x-d.hx)*vx+(z-d.hz)*vz)/Math.max(.001,d.w*d.w)));
 return Math.hypot(x-(d.hx+vx*t),z-(d.hz+vz*t))<r+.065;
}
function crossing(d,ox,oz,nx,nz,r){
 if(Math.abs(d.th)>.88)return false;
 const steps=Math.max(2,Math.ceil(Math.hypot(nx-ox,nz-oz)/.075));
 for(let n=1;n<=steps;n++){
  const t=n/steps;
  if(blockedByDoor(d,ox+(nx-ox)*t,oz+(nz-oz)*t,r))return true;
 }
 return false;
}
if(typeof facMove==='function'){
 const original=facMove;
 facMove=function(F,e,dx,dz,r,h,su){
  if(!F||!e||!F.doors)return original.apply(this,arguments);
  const ox=e.x,oz=e.z;
  const result=original.apply(this,arguments);
  // A closed door is a swept obstacle. Never allow a single frame to tunnel.
  for(const d of F.doors){
   if(d.lock||Math.abs(d.th)<.88){
    if(Math.abs(d.y-e.y)>2.3)continue;
    if(Math.hypot(ox-d.cx,oz-d.cz)>3&&Math.hypot(e.x-d.cx,e.z-d.cz)>3)continue;
    if(!blockedByDoor(d,ox,oz,r)&&crossing(d,ox,oz,e.x,e.z,r)){
      e.x=ox;e.z=oz;return false;
    }
   }
  }
  return result;
 };
}
if(typeof facDoorsTick==='function'){
 const original=facDoorsTick;
 facDoorsTick=function(F,dt){
  original.apply(this,arguments);
  if(!F||!F.pl)return;
  // Sync door mesh even if spring motion has already settled.
  for(const d of F.doors){
   if(!Number.isFinite(d.th)){d.th=0;d.om=0;d.tgt=0;}
   if(d.mesh)d.mesh.rotation.y=-(d.a0+d.th);
  }
 };
}
function repair(){
 if(!active())return;
 const F=HZ.fac,dm=F.dm;
 if(F!==lastGame){lastGame=F;lastPos=null;seen=0;lastDemonPos=null;stuck=0;}
 // Keep opaque walls from fighting one another in the depth buffer.
 if(!F.__stableMaterials){
  F.__stableMaterials=true;
  if(F.M)for(const mat of Object.values(F.M)){
   if(!mat||!mat.isMaterial)continue;
   mat.depthTest=true;
   // No polygonOffset on world walls: offsetting coplanar triangles worsens seams.
   mat.needsUpdate=true;
  }
 }
 if(!dm||!dm.g)return;
 // Recovery only for demonstrably corrupt actor coordinates or detached models;
 // intentional vanish / vent / away states remain untouched.
 if(dm.on&&(!Number.isFinite(dm.x)||!Number.isFinite(dm.y)||!Number.isFinite(dm.z))){
  const p=F.pl;
  if(typeof facDmPlace==='function')facDmPlace(F,p.x+5,p.y,p.z+5);
 }
 if(dm.on&&dm.g.parent!==F.scene&&F.scene){
  F.scene.add(dm.g);
 }
 if(dm.on&&dm.st!=='away'&&dm.st!=='vent'&&dm.st!=='peek'&&dm.g.scale.lengthSq()===0)dm.g.scale.setScalar(1);
}
setInterval(repair,500);
window.__facilityPatchVersion='door-sweep-2026-10-19';
})();