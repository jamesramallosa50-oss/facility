/* Facility floor plans and live objectives. World coordinates stay north-up. */
(function(global){
  'use strict';
  const CELL=.5,NX=248,NZ=204,NY=52,FLOOR=[8,4,0],NAMES=['2ND FLOOR','1ST FLOOR','BASEMENT'];
  const floorOf=y=>y+.1>=8?0:y+.1>=4?1:2;
  function rasterData(W,k){
    const rgba=new Uint8ClampedArray(NX*NZ*4),kind=W.G.kind[k],height=Math.floor((FLOOR[k]+1.1)/.25);
    let x0=NX,z0=NZ,x1=0,z1=0;
    for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){
      const c=z*NX+x,at=c*4;if(!kind[c])continue;
      const v=W.V[c*NY+height],col=v===1?[24,43,45]:v===2?[47,69,66]:[86,119,108];
      rgba[at]=col[0];rgba[at+1]=col[1];rgba[at+2]=col[2];rgba[at+3]=255;
      x0=Math.min(x0,x);z0=Math.min(z0,z);x1=Math.max(x1,x+1);z1=Math.max(z1,z+1);
    }
    // The imported maze and buildings use geometry-derived collision boxes.
    // Mark those walls so the outdoor floor plan reflects the real routes.
    for(const b of W.worldColliders||[]){
      if(b.y0>FLOOR[k]+1.1||b.y1<FLOOR[k]+1.1)continue;
      const xa=Math.max(0,Math.floor(b.x0/CELL)),xb=Math.min(NX,Math.ceil(b.x1/CELL)),za=Math.max(0,Math.floor(b.z0/CELL)),zb=Math.min(NZ,Math.ceil(b.z1/CELL));
      for(let z=za;z<zb;z++)for(let x=xa;x<xb;x++){const at=(z*NX+x)*4;if(rgba[at+3]){rgba[at]=25;rgba[at+1]=43;rgba[at+2]=43;}}
    }
    return{rgba,bounds:x1>x0?{x0:x0*CELL,z0:z0*CELL,x1:x1*CELL,z1:z1*CELL}:{x0:0,z0:0,x1:124,z1:102}};
  }
  function layer(W,k){
    if(!W.mapLayers)W.mapLayers=[];if(W.mapLayers[k])return W.mapLayers[k];
    const data=rasterData(W,k),canvas=document.createElement('canvas');canvas.width=NX;canvas.height=NZ;
    const context=canvas.getContext('2d'),image=context.createImageData(NX,NZ);image.data.set(data.rgba);context.putImageData(image,0,0);
    return W.mapLayers[k]={canvas,bounds:data.bounds};
  }
  function objective(F){
    if(F.explore)return null;
    const fuses=(F.fz||[]).filter(f=>!f.got);if(fuses.length){
      const level=floorOf(F.pl.y),same=fuses.filter(f=>f.k===level),list=same.length?same:fuses;
      return list.reduce((best,f)=>!best||Math.hypot(f.x-F.pl.x,f.z-F.pl.z)<Math.hypot(best.x-F.pl.x,best.z-F.pl.z)?f:best,null);
    }
    if(F.stage==='find'&&F.brk)return{x:F.brk.x,z:F.brk.z,k:F.brk.k,label:'BREAKER'};
    if(F.lift)return{x:F.lift.x,z:25,k:2,label:'LIFT'};
    return null;
  }
  function marker(ctx,x,y,color,size,shape){
    ctx.fillStyle=color;ctx.strokeStyle='#061416';ctx.lineWidth=2;ctx.beginPath();
    if(shape==='diamond'){ctx.moveTo(x,y-size);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();}
    else ctx.arc(x,y,size,0,Math.PI*2);
    ctx.fill();ctx.stroke();
  }
  function draw(F,canvas,k,full){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,L=layer(F.W,k);ctx.clearRect(0,0,w,h);ctx.fillStyle='#07171b';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
    let scale,x0,z0;
    if(full){const b=L.bounds,pad=3,bw=b.x1-b.x0+pad*2,bh=b.z1-b.z0+pad*2;scale=Math.min(w/bw,h/bh);x0=(b.x0+b.x1)/2-w/scale/2;z0=(b.z0+b.z1)/2-h/scale/2;}
    else{scale=3.25;x0=F.pl.x-w/scale/2;z0=F.pl.z-h/scale/2;}
    const xy=(x,z)=>[(x-x0)*scale,(z-z0)*scale];
    ctx.drawImage(L.canvas,-x0*scale,-z0*scale,NX*CELL*scale,NZ*CELL*scale);
    ctx.strokeStyle='#d1b576';ctx.lineWidth=full?1:1.5;
    for(const d of F.doors||[])if(d.k===k){const [ax,az]=xy(d.x0,d.z0),[bx,bz]=xy(d.x1,d.z1);if(Math.max(ax,bx)<0||Math.min(ax,bx)>w||Math.max(az,bz)<0||Math.min(az,bz)>h)continue;ctx.beginPath();ctx.moveTo(ax,az);ctx.lineTo(bx,bz);ctx.stroke();}
    for(const st of F.W.stairs||[])if(FLOOR[k]>=st.y0-.1&&FLOOR[k]<=st.y1+.1){const [x,y]=xy((st.x0+st.x1)/2,(st.z0+st.z1)/2);if(x>=0&&y>=0&&x<=w&&y<=h)marker(ctx,x,y,'#75b7d3',full?3:3.5,'diamond');}
    if(!F.explore){
      for(const f of F.fz||[])if(!f.got&&f.k===k){const [x,y]=xy(f.x,f.z);if(x>=0&&x<=w&&y>=0&&y<=h)marker(ctx,x,y,'#ffd06b',full?5:5,'diamond');}
      const target=objective(F);if(target?.label&&target.k===k){const [x,y]=xy(target.x,target.z);if(x>=0&&x<=w&&y>=0&&y<=h)marker(ctx,x,y,'#ffd06b',5,'diamond');}
      if(!full&&target&&target.k===k){let [x,y]=xy(target.x,target.z);if(x<8||x>w-8||y<8||y>h-8){const dx=x-w/2,dy=y-h/2,s=Math.min((w/2-9)/(Math.abs(dx)||1),(h/2-9)/(Math.abs(dy)||1));marker(ctx,w/2+dx*s,h/2+dy*s,'#ffd06b',4,'diamond');}}
    }
    for(const p of F.coop?.players?.values()||[])if(!p.loading&&!p.offline&&floorOf(p.y)===k){const [x,y]=xy(p.x,p.z);if(x>=0&&x<=w&&y>=0&&y<=h)marker(ctx,x,y,'#76d8eb',4);}
    if(floorOf(F.pl.y)===k){const [x,y]=xy(F.pl.x,F.pl.z),yaw=F.pl.yaw||0,dx=-Math.sin(yaw),dz=-Math.cos(yaw);ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dz,dx)+Math.PI/2);ctx.fillStyle='#f2f7dd';ctx.strokeStyle='#071519';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,3);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  }
  function update(F){
    const M=F.map;if(!M)return;
    const k=floorOf(F.pl.y);draw(F,M.mini,k,false);M.miniFloor.textContent=NAMES[k];
    const target=objective(F);M.target.textContent=F.explore?'NO MONSTERS · TAP MAP':target?(target.label||'FUSE')+' · '+(target.k===k?Math.round(Math.hypot(target.x-F.pl.x,target.z-F.pl.z))+'m':NAMES[target.k]):'TAP FOR MAP';
    if(M.open){draw(F,M.large,M.floor,true);M.heading.textContent=NAMES[M.floor];M.buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===M.floor)));}
  }
  function toggle(F,open){
    const M=F.map;if(!M)return;M.open=open==null?!M.open:open;M.screen.hidden=!M.open;
    if(M.open){M.floor=floorOf(F.pl.y);M.wasLocked=!!document.pointerLockElement;if(M.wasLocked)try{document.exitPointerLock();}catch(_){};}
    else if(M.wasLocked){M.wasLocked=false;try{const p=document.getElementById('view')?.requestPointerLock();p?.catch?.(()=>{});}catch(_){}}
    update(F);
  }
  function init(F){
    if(F.map)return;
    const hud=document.getElementById('hzui');if(!hud)return;
    const mini=document.createElement('button');mini.id='fm-mini';mini.type='button';mini.setAttribute('aria-label','Open floor map');
    mini.innerHTML='<span class="fm-mini-top"><b>MAP</b><span class="fm-floor"></span></span><canvas width="144" height="104"></canvas><span class="fm-target"></span>';
    const screen=document.createElement('div');screen.id='fm-screen';screen.hidden=true;
    screen.innerHTML='<section class="fm-panel" role="dialog" aria-modal="true" aria-label="Facility floor map"><header><div><small>THE FACILITY / FLOOR PLAN</small><h2 class="fm-heading"></h2></div><button class="fm-close" type="button" aria-label="Close map">×</button></header><div class="fm-floors"><button type="button">2ND FLOOR</button><button type="button">1ST FLOOR</button><button type="button">BASEMENT</button></div><canvas class="fm-large" width="520" height="360" aria-label="Floor plan showing your position and objectives"></canvas><p class="fm-legend"><span>▲ YOU</span><span>● TEAM</span><span>◆ FUSE / GOAL</span><span>◆ STAIRS</span></p><p class="fm-note">Tap a floor to inspect it. The gold marker shows where to go.</p></section>';
    hud.appendChild(mini);document.body.appendChild(screen);
    for(const event of ['touchstart','touchmove','touchend','pointerdown','click'])screen.addEventListener(event,e=>e.stopPropagation());
    const buttons=[...screen.querySelectorAll('.fm-floors button')];
    const M=F.map={mini:mini.querySelector('canvas'),miniFloor:mini.querySelector('.fm-floor'),target:mini.querySelector('.fm-target'),screen,large:screen.querySelector('.fm-large'),heading:screen.querySelector('.fm-heading'),buttons,miniElement:mini,open:false,floor:floorOf(F.pl.y)};
    mini.addEventListener('click',()=>toggle(F,true));screen.querySelector('.fm-close').addEventListener('click',()=>toggle(F,false));buttons.forEach((b,i)=>b.addEventListener('click',()=>{M.floor=i;update(F);}));
    M.key=e=>{if(e.repeat)return;if(M.open&&e.code==='KeyP'){M.wasLocked=false;toggle(F,false);return;}if(e.code==='KeyM'||(M.open&&e.code==='Escape')){e.preventDefault();e.stopImmediatePropagation();toggle(F,e.code==='Escape'?false:undefined);}};
    global.addEventListener('keydown',M.key,true);update(F);
  }
  function dispose(F){const M=F.map;if(!M)return;global.removeEventListener('keydown',M.key,true);M.screen.remove();M.miniElement.remove();F.map=null;}
  function close(F){if(F.map?.open){F.map.wasLocked=false;toggle(F,false);}}
  global.FacilityMap={init,update,dispose,close,rasterData,floorOf,objective};
})(typeof window!=='undefined'?window:globalThis);
