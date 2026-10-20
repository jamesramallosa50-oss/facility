/* Shared survival rules. The room host owns health, damage and revives. */
const FHEALTH={max:100,hunter:28,spider:22,invulnerable:1.4,regenDelay:12,regen:4,revive:40};
function facHealthInit(F){
  Object.assign(F.pl,{hp:100,downed:false,invulnUntil:0,lastHit:-99});
}
function facPlayers(F){return F.coop?[F.pl,...F.coop.players.values()]:[F.pl];}
function facAuthority(F){return !F.coop||F.coop.host;}
function facAlive(p){return !p.downed&&(p.hp==null||p.hp>0)&&!p.loading&&!p.offline;}
function facHuntTarget(F,actor=F.dm,spider=false){
  const list=facPlayers(F).filter(facAlive);if(!list.length)return F.pl;
  let best=null,score=Infinity;
  for(const p of list){
    const d=Math.hypot(p.x-actor.x,(p.y-actor.y)*2,p.z-actor.z);
    const visible=spider?Math.abs(p.y-actor.y)<.65&&d<18&&facSee(F,actor.x,actor.y+(actor.eye||.5),actor.z,p.x,p.y+1.3,p.z,true):facDmSee(F,p)>0;
    if(visible){const s=d-(actor.targetId===(p.netId||'local')?2:0);if(s<score){score=s;best=p;}}
  }
  // Retain the last target while it hides; never reveal a new hidden player.
  best=best||list.find(p=>(p.netId||'local')===actor.targetId)||F.pl;
  if(!facAlive(best))best=list[0];actor.targetId=best.netId||'local';return best;
}
function facHitFeedback(F,amount){
  F.shake=Math.max(F.shake||0,.5);F.pl.fear=Math.max(F.pl.fear||0,.55);
  if(F.post&&meta.flash!==false)F.post.mat.uniforms.uHurt.value=.4;
  facSting(F,.35);facTip(F,'-'+amount+' health · sprint away!',2);
}
function facDamage(F,p,amount){
  if(!facAuthority(F)||!facAlive(p)||F.t<(p.invulnUntil||0)||HZ.dead||HZ.won)return false;
  p.hp=Math.max(0,(p.hp==null?100:p.hp)-amount);p.lastHit=F.t;p.invulnUntil=F.t+FHEALTH.invulnerable;
  p.hit=(p.hit||0)+1;
  if(p===F.pl)facHitFeedback(F,amount);
  if(p.hp===0){
    if(F.coop){p.downed=true;p.vx=p.vz=0;p.crouch=true;}
    else facDie(F);
  }
  return true;
}
function facHealthTick(F,dt){
  if(!facAuthority(F))return;
  const danger=F.dm.st==='chase'||F.dm.st==='reveal'||!!F.haunt?.active?.aware;
  for(const p of facPlayers(F))if(facAlive(p)&&!danger&&F.t-(p.lastHit??-99)>FHEALTH.regenDelay)p.hp=Math.min(100,(p.hp??100)+dt*FHEALTH.regen);
  if(F.coop&&!F.coop.outcome&&facPlayers(F).filter(p=>!p.loading&&!p.offline).every(p=>p.downed))F.coop.outcome='lost';
}
function facRevive(F,p,target){
  if(!facAuthority(F)||!facAlive(p)||!target?.downed||Math.abs(p.y-target.y)>.7||Math.hypot(p.x-target.x,p.z-target.z)>2.2||
    !facSee(F,p.x,p.y+1.1,p.z,target.x,target.y+.65,target.z,true))return false;
  Object.assign(target,{hp:FHEALTH.revive,downed:false,crouch:false,invulnUntil:F.t+3,lastHit:F.t});return true;
}
function facReviveAim(F){
  if(!F.coop||F.pl.downed)return null;
  return facPlayers(F).find(p=>p!==F.pl&&p.downed&&!p.offline&&Math.abs(p.y-F.pl.y)<.7&&Math.hypot(p.x-F.pl.x,p.z-F.pl.z)<2.2&&
    facSee(F,F.pl.x,F.camY,F.pl.z,p.x,p.y+.65,p.z,true));
}
function facHealthHud(F){
  let e=document.getElementById('fhealth');
  if(!e){
    e=document.createElement('div');e.id='fhealth';e.innerHTML='<div class="fh-label"><span id="fh-state">VITALS</span><b id="fh-value">100 / 100</b></div><div id="fh-track" role="progressbar" aria-label="Health" aria-valuemin="0" aria-valuemax="100"><i></i></div>';
    document.getElementById('hzui')?.appendChild(e);
  }
  const hp=Math.ceil(F.pl.hp??100),label=F.pl.downed?'DOWN · WAIT FOR A REVIVE':hp<=30?'CRITICAL':hp<100?'INJURED':'VITALS';
  e.classList.toggle('critical',hp<=30);e.classList.toggle('downed',!!F.pl.downed);
  document.getElementById('fh-value').textContent=hp+' / 100';document.getElementById('fh-state').textContent=label;
  const track=document.getElementById('fh-track');track.setAttribute('aria-valuenow',hp);track.firstChild.style.width=hp+'%';
}
