/* Real WebRTC co-op for static hosting. Only the host simulates the world.
   Guests send movement and interaction requests; snapshots own all shared state. */
const FNET={version:1,build:'coop-survival-r1',prefix:'facility-v1-',hz:15,max:4,timeout:25000};
function facNetName(v){return String(v||'Survivor').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,18)||'Survivor';}
function facNetCode(v){return String(v||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);}
function facNetSend(conn,data,essential=false){
  if(!conn?.open||(!essential&&(conn.bufferSize>2||conn.dataChannel?.bufferedAmount>65536)))return false;
  try{conn.send(data);return true;}catch(_){return false;}
}
function facNetRandom(F){
  if(!F.coop)return Math.random;
  let s=2166136261;for(const c of F.coop.room)s=Math.imul(s^c.charCodeAt(0),16777619);
  return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
}
function facCoopConfig(F){
  const q=new URLSearchParams(location.search),mode=q.get('coop');if(mode!=='host'&&mode!=='join')return;
  const room=facNetCode(q.get('room'));
  F.coop={host:mode==='host',room,name:facNetName(q.get('name')),id:'local',players:new Map(),connections:new Map(),avatars:new Map(),ready:false,
    status:'Connecting to room…',seq:0,ack:0,actions:[],sendAt:0,worldAt:0,lastWorld:performance.now(),received:false,closed:false,outcome:'',epoch:0};
  F.pl&&(F.pl.netId='local');
}
function facNetScreen(F,message,error=false){
  let e=document.getElementById('fc-network');
  if(!e){
    e=document.createElement('div');e.id='fc-network';e.innerHTML='<div class="fc-card"><p>THE FACILITY / CO-OP</p><h2 id="fc-heading">Connecting</h2><p id="fc-message"></p><p id="fc-room"></p><button id="fc-reconnect" hidden>RECONNECT</button><button id="fc-exit">BACK TO MENU</button></div>';document.body.appendChild(e);
    e.querySelector('#fc-exit').onclick=()=>{facCoopDispose(F);try{parent.location.href=new URL('index.html',location.href).href;}catch(_){location.href='index.html';}};
    e.querySelector('#fc-reconnect').onclick=()=>{location.reload();};
  }
  e.hidden=!message;if(!message)return;
  document.getElementById('fc-heading').textContent=error?'Connection interrupted':'Connecting to your team';
  document.getElementById('fc-message').textContent=message;
  document.getElementById('fc-room').textContent='ROOM '+F.coop.room;
  document.getElementById('fc-reconnect').hidden=!error;
  try{if(document.pointerLockElement)document.exitPointerLock();}catch(_){}
}
function facNetFail(F,message){
  const C=F.coop;if(!C||C.closed)return;C.ready=false;C.error=message;C.status=message;facNetScreen(F,message,true);
}
async function facCoopStart(F){
  const C=F.coop;if(!C)return;
  if(C.room.length!==6){facNetFail(F,'Enter the six-character code from your host.');return;}
  facNetScreen(F,'Opening a secure connection. Keep the host’s game open while playing.');
  C.timer=setTimeout(()=>{if(!C.ready)facNetFail(F,'The room could not connect. Check the code and ask the host to keep their game open. A different network may be needed if this one blocks peer connections.');},FNET.timeout);
  try{
    if(!window.Peer)await hzScript('assets/vendor/peerjs-1.5.5.min.js');
    if(C.closed)return;
    const options={secure:true,debug:0};
    if(window.FACILITY_RTC_CONFIG)options.config=window.FACILITY_RTC_CONFIG;
    const peer=C.peer=new window.Peer(C.host?FNET.prefix+C.room:undefined,options);
    peer.on('open',id=>{
      if(C.closed)return;C.id=id;F.pl.netId=id;
      if(C.host){C.ready=true;C.status='Room open · invite your friends';clearTimeout(C.timer);facNetScreen(F,'');}
      else facNetAttach(F,peer.connect(FNET.prefix+C.room,{reliable:true,serialization:'json',metadata:{version:FNET.version,build:FNET.build,name:C.name}}));
    });
    peer.on('connection',conn=>{
      if(!C.host){conn.on('open',()=>conn.close());return;}
      facNetAttach(F,conn);
    });
    peer.on('disconnected',()=>{
      if(C.closed)return;C.status='Reconnecting room discovery…';
      C.reconnectTimer=setTimeout(()=>{if(!C.closed&&!peer.destroyed&&peer.disconnected)try{peer.reconnect();}catch(_){}},1200);
    });
    peer.on('error',err=>{
      if(C.closed)return;
      if(err.type==='unavailable-id')facNetFail(F,'That room code is already being used. Return to the menu and create a new room.');
      else if(!C.ready)facNetFail(F,err.type==='peer-unavailable'?'Room not found. Check the code and wait for the host to finish loading.':'Could not establish the room connection. Reconnect or try another network.');
      else C.status='Room discovery unavailable · existing connections stay active';
    });
    peer.on('close',()=>{if(!C.closed)facNetFail(F,'The multiplayer connection closed. Return to the menu to open a new room.');});
  }catch(_){facNetFail(F,'Multiplayer could not load. Reconnect, or return to the menu to play solo.');}
}
function facNetAttach(F,conn){
  const C=F.coop;let accepted=false,pending;
  if(C.host){
    const m=conn.metadata||{},full=C.connections.size>=FNET.max-1,reason=C.outcome?'This run has finished. Ask the host to start a new room.':
      m.version!==FNET.version||m.build!==FNET.build?'Game versions differ. Both players should reload the page.':full?'Room full. A room holds four players.':'';
    if(reason){conn.on('open',()=>{facNetSend(conn,{type:'reject',reason},true);setTimeout(()=>conn.close(),250);});return;}
    C.connections.set(conn.peer,conn);
    pending=setTimeout(()=>{if(!accepted&&C.connections.get(conn.peer)===conn){C.connections.delete(conn.peer);try{conn.close();}catch(_){}}},FNET.timeout);
  }else C.connection=conn;
  conn.on('open',()=>{
    clearTimeout(pending);
    if(C.closed){conn.close();return;}accepted=true;
    if(C.host){
      const p={...facNetPose(F.pl),hp:100,downed:false,netId:conn.peer,name:facNetName(conn.metadata?.name),loading:true,seen:performance.now(),lastHit:-99,invulnUntil:F.t+3,ack:0};
      const s=F.W.start;Object.assign(p,{x:s.x,y:FCY[s.k],z:s.z,yaw:s.yaw});C.players.set(conn.peer,p);
      facNetSend(conn,{type:'world',...facNetSnapshot(F),welcome:conn.peer},true);C.status='Team connected';
    }else C.status='Connected · synchronizing the Facility…';
  });
  conn.on('data',data=>{
    if(!accepted||C.closed||!data||typeof data!=='object')return;
    if(C.host){if(data.type==='input')facNetInput(F,conn,data);}
    else if(data.type==='world')facNetWorld(F,data);
    else if(data.type==='reject')facNetFail(F,String(data.reason||'The room rejected this connection.').slice(0,160));
  });
  const close=()=>{
    clearTimeout(pending);
    if(C.closed)return;
    if(C.host){if(C.connections.get(conn.peer)===conn){C.connections.delete(conn.peer);C.players.delete(conn.peer);facNetRemoveAvatar(F,conn.peer);C.status='A teammate left · room still open';}}
    else facNetFail(F,'The host disconnected. Ask them to reopen a room, then join with the new code.');
  };
  conn.on('close',close);conn.on('error',close);
}
function facNetPose(p){return{x:p.x,y:p.y,z:p.z,yaw:p.yaw||0,pitch:p.pitch||0,crouch:!!p.crouch,light:!!p.light,sta:p.sta??1};}
function facNetValidPose(p){return p&&['x','y','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))&&p.x>0&&p.x<70&&p.z>0&&p.z<50&&p.y> -2&&p.y<13&&Math.abs(p.yaw)<1e6&&Math.abs(p.pitch)<2;}
function facNetInput(F,conn,m){
  const C=F.coop,p=C.players.get(conn.peer);if(!p||m.version!==FNET.version)return;
  const now=performance.now();
  if(facNetValidPose(m.pose)&&(!p.recvAt||now-p.recvAt>20)){
    const dt=p.recvAt?Math.min(1,(now-p.recvAt)/1000):.1,pose=m.pose,max=7*dt+.8;
    if(!p.downed&&Math.hypot(p.x-pose.x,p.z-pose.z)<=max&&Math.abs(p.y-pose.y)<Math.max(1.5,dt*12)){
      const moved=Math.hypot(p.x-pose.x,p.z-pose.z);Object.assign(p,facNetPose(pose));
      if(moved>.06&&F.t>(p.noiseAt||0)){facNoise(F,p.x,p.y,p.z,p.crouch?1.5:moved/dt>4?11:4.5);p.noiseAt=F.t+.35;}
    }
    p.recvAt=now;p.seen=now;p.loading=false;p.offline=false;
  }
  if(!Array.isArray(m.actions)||m.actions.length>12)return;
  for(const a of m.actions){
    if(!a||!Number.isInteger(a.id)||a.id<=p.ack||a.id>p.ack+32)continue;
    p.ack=a.id;if(facAlive(p)&&!C.outcome)facNetAction(F,p,a);
  }
}
function facNetAction(F,p,a){
  let aim,obj;const index=Number.isInteger(a.i)?a.i:-1;
  if(a.t==='revive'){facRevive(F,p,a.target===F.coop.id?F.pl:F.coop.players.get(a.target));return;}
  if(a.t==='door'&&index>=0&&(obj=F.doors[index])){
    const seg=facDoorSeg(obj),points=[[(seg[0]+seg[2])/2,(seg[1]+seg[3])/2],[obj.cx,obj.cz]];
    if(Math.abs(p.y-obj.y)>.85||!points.some(([x,z])=>{const d=Math.hypot(p.x-x,p.z-z),k=.08/Math.max(.1,d);return d<2.8&&facSee(F,p.x,p.y+1.3,p.z,x+(p.x-x)*k,obj.y+1.1,z+(p.z-z)*k,true);} ))return;aim={t:'door',d:obj};
  }else if(a.t==='fuse'&&index>=0&&(obj=F.fz[index])&&!obj.got)aim={t:'fuse',f:obj};
  else if(a.t==='bat'&&index>=0&&(obj=F.bats[index])&&!obj.got)aim={t:'bat',b:obj};
  else if(a.t==='brk'){obj=F.brk;aim={t:'brk'};}
  else return;
  if(a.t!=='door'&&(Math.hypot(p.x-obj.x,p.y+1.3-obj.y,p.z-obj.z)>2.8||!facSee(F,p.x,p.y+1.3,p.z,obj.x,obj.y+.08,obj.z,true)))return;
  if(a.t==='bat'){obj.got=true;obj.m.visible=false;p.batteryPicks=(p.batteryPicks||0)+1;return;}
  if(a.t==='door'&&a.want==='open'){
    if(Math.abs(obj.th)<1&&Math.abs(obj.tgt)<1)facDoorOpen(F,obj,p.x,p.z,false);return;
  }
  const local=F.pl,old=F.aim;F.coop.processing=true;F.pl=p;F.aim=aim;
  try{facUse(F);}finally{F.pl=local;F.aim=old;F.coop.processing=false;}
}
function facCoopUse(F,a){
  const C=F.coop;if(!C)return false;
  if(a.t==='revive'){
    if(C.host)facRevive(F,F.pl,a.p);
    else facNetQueue(F,{t:'revive',target:a.p.netId});return true;
  }
  if(C.host||C.processing)return false;
  const action={t:a.t};if(a.t==='door')action.i=F.doors.indexOf(a.d);else if(a.t==='fuse')action.i=F.fz.indexOf(a.f);else if(a.t==='bat')action.i=F.bats.indexOf(a.b);
  facNetQueue(F,action);return true;
}
function facNetQueue(F,a){const C=F.coop;if(C.ready&&C.actions.length<12&&!C.actions.some(b=>b.t===a.t&&b.i===a.i&&b.target===a.target)){C.actions.push({...a,id:++C.seq});}}
function facCoopDoor(F,d){
  if(!F.coop||F.coop.host)return false;
  facNetQueue(F,{t:'door',i:F.doors.indexOf(d),want:'open'});return true;
}
function facNetSnapshot(F){
  const C=F.coop,dm=F.dm,a=F.haunt?.active;
  return{version:FNET.version,build:FNET.build,room:C.room,epoch:C.epoch,t:F.t,stage:F.stage,held:F.held,fuses:F.fuses,breaker:F.brk.n,powerT:F.powerT||0,
    lift:{open:F.lift.open,want:F.lift.want,arrive:F.lift.arrive},power:F.U.uPow.value,emergency:F.U.uEmg.value,outcome:C.outcome,
    players:[{...facNetPose(F.pl),id:C.id,name:C.name,hp:F.pl.hp,downed:F.pl.downed,hit:F.pl.hit||0,ack:0,loading:false},
      ...[...C.players.values()].map(p=>({...facNetPose(p),id:p.netId,name:p.name,hp:p.hp,downed:p.downed,hit:p.hit||0,ack:p.ack,batteryPicks:p.batteryPicks||0,loading:p.loading,offline:!!p.offline}))],
    doors:F.doors.map(d=>[d.th,d.tgt,!!d.lock]),fuseItems:F.fz.map(f=>[f.x,f.y,f.z,!!f.got]),batteries:F.bats.map(b=>[b.x,b.y,b.z,!!b.got]),
    dm:{x:dm.x,y:dm.y,z:dm.z,face:dm.face,on:dm.on,st:dm.st,spd:dm.actualSpeed||0},
    haunt:a?{kind:a.kind,serial:a.serial,x:a.x,y:a.y,z:a.z,face:a.g.rotation.y,mode:a.mode,revealed:a.revealed,age:a.age,speed:a.netSpeed||0}:null};
}
function facNetWorld(F,m){
  const C=F.coop;
  if(m.version!==FNET.version||m.build!==FNET.build||m.room!==C.room||!Number.isFinite(m.t)||!Array.isArray(m.players)||m.players.length>4||!Array.isArray(m.doors)||m.doors.length!==F.doors.length)return;
  const own=m.players.find(p=>p.id===C.id);if(!own||!facNetValidPose(own))return;
  const first=!C.received;C.received=true;C.ready=true;C.error='';C.lastWorld=performance.now();C.status='Team connected';clearTimeout(C.timer);facNetScreen(F,'');
  C.world=m;C.outcome=m.outcome||'';F.t=m.t;HZ.t=F.t;
  F.stage=m.stage;F.fuses=m.fuses;F.held=m.held;F.brk.n=m.breaker;F.powerT=m.powerT;
  F.brk.sockets.forEach((s,i)=>s.visible=i<m.breaker);Object.assign(F.lift,m.lift);F.lift.box.off=F.lift.open>.6;
  F.lift.doors.forEach(d=>d.g.position.z=25+d.s*(.75+F.lift.open*1.45));F.U.uPow.value=m.power;F.U.uEmg.value=m.emergency;
  m.doors.forEach((d,i)=>{const door=F.doors[i];door.th=d[0];door.tgt=d[1];door.lock=d[2];door.mesh.rotation.y=-(door.a0+door.th);});
  const items=(data,list,fuse)=>{if(!Array.isArray(data))return;data.forEach((v,i)=>{const item=list[i];if(!item||!v.slice(0,3).every(Number.isFinite))return;[item.x,item.y,item.z,item.got]=v;item.m.position.set(item.x,item.y+(fuse?.04:.045),item.z);item.m.visible=!item.got;if(item.gl){item.gl.position.copy(item.m.position);item.gl.visible=!item.got;}});};
  items(m.fuseItems,F.fz,true);items(m.batteries,F.bats,false);
  const wasDown=F.pl.downed,hit=F.pl.hit||0;
  if(first||wasDown&&!own.downed||Math.hypot(F.pl.x-own.x,F.pl.z-own.z)>3){Object.assign(F.pl,facNetPose(own));F.pl.vx=F.pl.vz=0;F.camY=own.y+FAC.eye;}
  F.pl.hp=own.hp;F.pl.downed=own.downed;F.pl.hit=own.hit;
  if((own.batteryPicks||0)>(C.batteryPicks||0)){F.pl.bat=Math.min(1,F.pl.bat+((own.batteryPicks||0)-(C.batteryPicks||0))*.5);facSndPick(F,.6);facTip(F,'Battery +50%',1.6);}C.batteryPicks=own.batteryPicks||0;
  if(own.hit>hit)facHitFeedback(F,Math.max(0,(C.lastHp??100)-own.hp));C.lastHp=own.hp;
  C.actions=C.actions.filter(a=>a.id>own.ack);
  const alive=new Set();
  for(const p of m.players){
    if(p.id===C.id||!facNetValidPose(p))continue;alive.add(p.id);
    let remote=C.players.get(p.id);if(!remote){remote={};C.players.set(p.id,remote);}Object.assign(remote,p,{netId:p.id});
  }
  for(const id of C.players.keys())if(!alive.has(id)){C.players.delete(id);facNetRemoveAvatar(F,id);}
}
function facNetAvatar(F,p){
  const C=F.coop;let a=C.avatars.get(p.netId);if(a)return a;
  const g=new T.Group(),suit=new T.MeshLambertMaterial({color:0x527c7a}),dark=new T.MeshLambertMaterial({color:0x152a30}),helmet=new T.MeshLambertMaterial({color:0xd4bd8d}),badge=new T.MeshBasicMaterial({color:0x91dcc0});
  const box=(x,y,z,w,h,d,mat)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);g.add(o);return o;};
  box(0,1.05,0,.43,.6,.25,suit);box(0,1.53,0,.3,.29,.3,helmet);box(0,1.54,-.157,.23,.1,.015,dark);box(.12,1.14,-.137,.1,.045,.015,badge);
  const arms=[box(-.29,.96,0,.13,.53,.15,suit),box(.29,.96,0,.13,.53,.15,suit)],legs=[box(-.12,.4,0,.17,.73,.19,dark),box(.12,.4,0,.17,.73,.19,dark)];
  F.scene.add(g);a={g,arms,legs,materials:[suit,dark,helmet,badge],x:p.x,z:p.z,phase:0};g.position.set(p.x,p.y,p.z);C.avatars.set(p.netId,a);return a;
}
function facNetRemoveAvatar(F,id){const C=F.coop,a=C?.avatars.get(id);if(!a)return;if(a.g.parent)a.g.parent.remove(a.g);a.g.traverse(o=>o.geometry?.dispose());a.materials.forEach(m=>m.dispose());C.avatars.delete(id);}
function facNetVisuals(F,dt){
  const C=F.coop;
  for(const p of C.players.values()){
    if(p.loading||p.offline){const a=C.avatars.get(p.netId);if(a)a.g.visible=false;continue;}
    const a=facNetAvatar(F,p),g=a.g,k=1-Math.exp(-dt*18),distance=Math.hypot(p.x-g.position.x,p.z-g.position.z),moving=distance>.025;
    if(distance>4)g.position.set(p.x,p.y,p.z);else g.position.lerp(new T.Vector3(p.x,p.y,p.z),k);
    let turn=p.yaw-g.rotation.y;turn=Math.atan2(Math.sin(turn),Math.cos(turn));g.rotation.y+=turn*k;
    g.rotation.z=p.downed?Math.PI/2:0;g.scale.y=p.crouch&&!p.downed?.7:1;
    if(moving)a.phase+=dt*10;const swing=moving&&!p.downed?Math.sin(a.phase)*.5:0;
    a.legs[0].rotation.x=swing;a.legs[1].rotation.x=-swing;a.arms[0].rotation.x=-swing;a.arms[1].rotation.x=swing;
    g.visible=Math.abs(p.y-F.pl.y)<4.5&&Math.hypot(p.x-F.pl.x,p.z-F.pl.z)<32;
  }
  if(!C.host&&C.world){
    const m=C.world.dm,dm=F.dm,k=1-Math.exp(-dt*20);dm.x+=(m.x-dm.x)*k;dm.y+=(m.y-dm.y)*k;dm.z+=(m.z-dm.z)*k;
    dm.face+=Math.atan2(Math.sin(m.face-dm.face),Math.cos(m.face-dm.face))*k;dm.fwant=dm.face;dm.on=m.on;dm.st=m.st;F.dmDist=m.on?Math.hypot(dm.x-F.pl.x,dm.y-F.pl.y,dm.z-F.pl.z):99;
    facDmBody(F,dt,m.spd);const S=F.haunt,h=C.world.haunt;
    if(S){
      if(!h){if(S.active){S.active.g.visible=false;S.active.on=false;}S.active=null;}
      else{const a=S.actors.find(a=>a.kind===h.kind);if(a){if(S.active&&S.active!==a)S.active.g.visible=false;if(a.serial!==h.serial){a.stung=false;a.serial=h.serial;}S.active=a;Object.assign(a,h,{on:true});a.g.position.set(h.x,h.y,h.z);a.g.rotation.y=h.face;a.g.visible=!!h.revealed;
        if(h.revealed&&!a.stung&&Math.abs(h.y-F.pl.y)<1&&Math.hypot(h.x-F.pl.x,h.z-F.pl.z)<12&&facOnScreen(F,h.x,h.y+(a.eye||1),h.z)&&facSee(F,F.pl.x,F.camY,F.pl.z,h.x,h.y+(a.eye||1),h.z,false))facHauntSting(F,a);
        if(a.spider)window.FacilitySpider.tick(a.spider,h.speed,dt);if(a.ghost)window.FacilityGhost.tick(a.ghost,h.speed,dt,h.mode);}}
      for(const sign of S.signs)sign.visible=sign.userData.band===facBand(F.pl.y+.1)&&sign.position.distanceToSquared(cam.position)<900;
    }
  }
}
function facCoopTick(F,dt){
  const C=F.coop;if(!C)return true;if(C.closed)return false;
  const now=performance.now();
  if(C.ready&&!C.host&&now-C.lastWorld>10000)facNetFail(F,'The host stopped responding. Reconnect once their game is active again.');
  if(!C.ready){facNetScreen(F,C.error||(C.host?'Creating your room…':'Waiting for the host to synchronize the Facility…'),!!C.error);return false;}
  if(C.host){
    for(const p of C.players.values()){p.offline=now-p.seen>10000;if(now-p.seen>30000){C.connections.get(p.netId)?.close();}}
    if(now>=C.sendAt){C.sendAt=now+1000/FNET.hz;const data={type:'world',...facNetSnapshot(F)};for(const conn of C.connections.values())facNetSend(conn,data);}
  }else if(now>=C.sendAt){C.sendAt=now+1000/FNET.hz;facNetSend(C.connection,{type:'input',version:FNET.version,pose:facNetPose(F.pl),actions:C.actions});}
  facNetVisuals(F,dt);
  if(C.outcome&&!HZ.dead&&!HZ.won){if(C.outcome==='won')facWin(F);else facDie(F);}
  return true;
}
function facCoopHud(F){
  const C=F.coop;if(!C)return;
  let e=document.getElementById('fcoop');
  if(!e){e=document.createElement('section');e.id='fcoop';e.innerHTML='<div class="fc-title"><b id="fc-code"></b><button id="fc-copy">INVITE</button></div><p id="fc-status" role="status"></p><ul id="fc-roster"></ul>';document.getElementById('hzui')?.appendChild(e);
    document.getElementById('fc-copy').onclick=async()=>{
      const u=new URL('index.html',location.href);u.searchParams.set('room',C.room);
      try{await navigator.clipboard.writeText(u.href);C.status='Invite link copied';}catch(_){C.status='Share room code '+C.room;}
    };}
  document.getElementById('fc-code').textContent='ROOM '+C.room;
  document.getElementById('fc-status').textContent=C.status+' · '+(C.players.size+1)+'/4';
  const roster=document.getElementById('fc-roster');roster.replaceChildren();
  for(const p of [{...F.pl,name:C.name+' (you)'},...C.players.values()]){
    const li=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');name.textContent=p.name||'Survivor';
    const distance=p.netId===F.pl.netId?'':Math.round(Math.hypot(p.x-F.pl.x,p.z-F.pl.z))+'m · ';
    value.textContent=p.loading?'LOADING':p.offline?'RECONNECTING':p.downed?'DOWN':distance+Math.ceil(p.hp??100)+' HP';li.append(name,value);roster.appendChild(li);
  }
}
function facCoopDispose(F){
  const C=F.coop;if(!C||C.closed)return;C.closed=true;clearTimeout(C.timer);clearTimeout(C.reconnectTimer);
  for(const id of [...C.avatars.keys()])facNetRemoveAvatar(F,id);
  try{C.peer?.destroy();}catch(_){}C.connections.clear();C.players.clear();
  for(const id of ['fc-network','fcoop'])document.getElementById(id)?.remove();
}
addEventListener('pagehide',()=>{if(typeof HZ!=='undefined'&&HZ?.fac)facCoopDispose(HZ.fac);});
