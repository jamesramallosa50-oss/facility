/* Facility wayfinding: fitted typography, physical backing, verified mounts. */
(function(global){
  'use strict';
  const T=global.THREE;
  function fit(ctx,text,maxWidth,start,min){
    let size=start;do{ctx.font='600 '+size+'px Arial, sans-serif';if(ctx.measureText(text).width<=maxWidth)break;}while(--size>min);
    return size;
  }
  function draw(canvas,s){
    canvas.width=1024;canvas.height=256;const x=canvas.getContext('2d'),accent=s.k===2?'#d6ab80':'#9cc7be';
    x.fillStyle='#12282d';x.fillRect(0,0,1024,256);
    x.strokeStyle='#55716f';x.lineWidth=3;x.strokeRect(8,8,1008,240);
    x.fillStyle=accent;x.fillRect(26,26,8,204);x.fillStyle='#1e3c40';x.fillRect(50,26,144,204);
    x.textAlign='center';x.textBaseline='middle';x.fillStyle=accent;x.font='600 48px Arial, sans-serif';x.fillText(s.code||['L2','L1','B1'][s.k],122,112);
    x.font='16px Arial, sans-serif';x.fillStyle='#a3b7b2';x.fillText('FACILITY',122,161);
    const left=224,right=s.arrow?910:972,width=right-left;
    x.textAlign='left';x.fillStyle='#e3ebe1';const titleSize=fit(x,s.text,width,52,28);x.fillText(s.text,left,104);
    x.fillStyle='#a7c0ba';const subSize=fit(x,s.sub||'',width,25,16);x.fillText(s.sub||'',left,162);
    if(s.arrow){
      // Draw the arrow instead of depending on a font's Unicode glyph.
      x.save();x.translate(958,126);if(s.arrow==='left')x.rotate(Math.PI);if(s.arrow==='up')x.rotate(-Math.PI/2);
      x.strokeStyle=accent;x.lineWidth=9;x.lineCap='square';x.beginPath();x.moveTo(-24,0);x.lineTo(24,0);x.moveTo(5,-19);x.lineTo(24,0);x.lineTo(5,19);x.stroke();x.restore();
    }
    return {titleSize,subSize,titleWidth:(x.font='600 '+titleSize+'px Arial, sans-serif',x.measureText(s.text).width),availableWidth:width};
  }
  function mounted(s,baseY,isAir){
    const w=s.width||1.6,h=s.height||.4,y=baseY+(s.y||1.95),tx=s.nz,tz=-s.nx;
    for(const u of[-.48,0,.48])for(const v of[-.45,0,.45]){
      const x=s.x+tx*w*u,z=s.z+tz*w*u,Y=y+h*v;
      if(!isAir(x+s.nx*.09,Y,z+s.nz*.09)||isAir(x-s.nx*.09,Y,z-s.nz*.09))return false;
    }return true;
  }
  function create(s,baseY,isAir){
    if(!mounted(s,baseY,isAir))return null;
    const canvas=global.document.createElement('canvas');const layout=draw(canvas,s),tx=new T.CanvasTexture(canvas);
    tx.encoding=T.sRGBEncoding;tx.anisotropy=2;tx.minFilter=T.LinearMipmapLinearFilter;tx.magFilter=T.LinearFilter;
    const face=new T.MeshBasicMaterial({map:tx,color:0xd1d9d1}),back=new T.MeshStandardMaterial({color:0x162327,roughness:.75,metalness:.25});
    const w=s.width||1.6,h=s.height||.4,g=new T.Group();
    const backing=new T.Mesh(new T.BoxGeometry(w+.024,h+.024,.032),back);g.add(backing);
    const panel=new T.Mesh(new T.PlaneGeometry(w,h),face);panel.position.z=.017;g.add(panel);
    g.position.set(s.x+s.nx*.022,baseY+(s.y||1.95),s.z+s.nz*.022);g.rotation.y=Math.atan2(s.nx,s.nz);
    g.userData={band:s.k,layout,materials:[face,back],textures:[tx]};return g;
  }
  global.FacilitySigns={create,draw,mounted};
})(typeof window!=='undefined'?window:globalThis);
