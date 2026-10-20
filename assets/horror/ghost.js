/* The Unvermeidlich (Ghost) [Darkness Of Eclipse] — Memorie, CC BY 4.0.
 * See CREDITS.md. Original meshes, skin, hair alpha and four clips retained. */
(function(global){
  'use strict';
  const T=global.THREE,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  let asset=null,pending=null;
  function poseBounds(root){
    let top=root;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
    const box=new T.Box3(),v=new T.Vector3();
    root.traverse(o=>{
      if(!o.isMesh||!o.geometry.attributes.position)return;
      if(o.isSkinnedMesh)o.skeleton.update();
      const p=o.geometry.attributes.position;
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);if(o.isSkinnedMesh)o.boneTransform(i,v);box.expandByPoint(v.applyMatrix4(o.matrixWorld));}
    });return box;
  }
  function centerRig(a){
    let top=a.visual;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
    if(a.anchor){const p=a.anchor.getWorldPosition(a.tmp);a.offset.worldToLocal(p);a.offset.position.x=-p.x;a.offset.position.z=-p.z;}
    top.updateMatrixWorld(true);
  }
  function prepare(gl,anisotropy){
    if(!gl||!gl.scene)throw new Error('Ghost model has no scene');
    const root=gl.scene,clips={};
    for(const [key,name] of Object.entries({watch:'Stalking 1',walk:'Stalking 2',idle:'Stalking 3',reach:'Chasing'})){
      clips[key]=gl.animations.find(a=>a.name.endsWith(name));if(!clips[key])throw new Error('Ghost animation missing: '+name);
    }
    const mixer=new T.AnimationMixer(root),bounds=new T.Box3();
    for(const clip of Object.values(clips)){
      mixer.stopAllAction();mixer.clipAction(clip).reset().play();
      for(let i=0;i<8;i++){mixer.setTime(clip.duration*i/8);bounds.union(poseBounds(root));}
    }
    mixer.stopAllAction();mixer.clipAction(clips.watch).reset().play();mixer.setTime(0);
    const height=bounds.max.y-bounds.min.y;if(!(height>0&&Number.isFinite(height)))throw new Error('Ghost geometry is invalid');
    root.traverse(o=>{
      if(!o.isMesh)return;o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        m.skinning=!!o.isSkinnedMesh;m.side=T.DoubleSide;
        if(m.emissive){m.emissive.setHex(0x19252d);m.emissiveMap=m.map||null;m.emissiveIntensity=.3;}
        if(m.transparent){m.depthWrite=false;m.alphaTest=.035;}
        for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap']){
          const tx=m[key];if(!tx)continue;tx.anisotropy=clamp(anisotropy||2,1,4);tx.minFilter=T.LinearMipmapLinearFilter;tx.magFilter=T.LinearFilter;tx.needsUpdate=true;
        }m.needsUpdate=true;
      }
    });
    const offset=new T.Group();offset.position.y=-bounds.min.y;offset.add(root);
    const visual=new T.Group();visual.name='The Unvermeidlich — uploaded ghost';visual.scale.setScalar(2.05/height);visual.add(offset);
    // Preserve the native rig. Cancel horizontal root motion in a parent so
    // animation cannot move the apparition through a wall or closed door.
    asset={root,clips,offset,visual,anchor:root.getObjectByName('Hips_01'),tmp:new T.Vector3(),sourceBounds:bounds,owner:null};
    centerRig(asset);mixer.stopAllAction();mixer.uncacheRoot(root);return asset;
  }
  async function load(progress,fetchBuffer,anisotropy){
    progress=progress||(()=>{});if(asset){progress(1);return asset;}if(pending)return pending;
    pending=(async()=>{
      if(!T.GLTFLoader)throw new Error('Ghost GLTF loader is unavailable');
      const data=await fetchBuffer('assets/horror/unvermeidlich-ghost.glb?v=ghost-signs-r1-20261020',p=>progress(p*.9));
      const gl=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(data,'assets/horror/',resolve,reject));
      const result=prepare(gl,anisotropy);progress(1);return result;
    })();try{return await pending;}catch(error){pending=null;throw error;}
  }
  function createActor(){
    if(!asset)throw new Error('Ghost must load before its encounter is created');if(asset.owner)release(asset.owner);
    const visual=new T.Group();visual.add(asset.visual);const mixer=new T.AnimationMixer(asset.root),actions={};
    for(const [key,clip] of Object.entries(asset.clips))actions[key]=mixer.clipAction(clip);
    const actor={visual,mixer,actions,current:null,radius:.28,height:2.1,eye:1.65};asset.owner=actor;reset(actor);return actor;
  }
  function reset(actor){
    actor.mixer.stopAllAction();actor.current='watch';actor.actions.watch.reset().setEffectiveWeight(1).play();actor.mixer.update(0);centerRig(asset);
  }
  function tick(actor,speed,dt,mode){
    if(!actor||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
    const target=mode==='door'?'reach':mode==='watch'?'watch':speed>.08?'walk':'idle';
    if(target!==actor.current){const prev=actor.actions[actor.current],next=actor.actions[target];next.reset().setEffectiveWeight(1).play();prev.crossFadeTo(next,.25,false);actor.current=target;}
    actor.actions[target].setEffectiveTimeScale(target==='walk'?clamp(.7+speed*.25,.7,1.3):.85);
    actor.mixer.update(dt);centerRig(asset);
  }
  function release(actor){
    if(!actor)return;actor.mixer.stopAllAction();
    if(asset&&asset.owner===actor){actor.mixer.uncacheRoot(asset.root);if(asset.visual.parent)asset.visual.parent.remove(asset.visual);asset.owner=null;}
    if(actor.visual.parent)actor.visual.parent.remove(actor.visual);
  }
  global.FacilityGhost={load,prepare,createActor,reset,tick,release,poseBounds};
})(typeof window!=='undefined'?window:globalThis);
