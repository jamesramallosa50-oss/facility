/* Wolf Spider runtime. Model: Dreaming In Alternation 27, CC BY 4.0.
 * Source and changes are recorded in CREDITS.md. Geometry and skin weights
 * are preserved; the walking and running clips drive the original rig. */
(function(global){
  'use strict';
  const T=global.THREE;
  let asset=null,pending=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function poseBounds(root){
    let top=root;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
    const box=new T.Box3(),v=new T.Vector3();
    root.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;
      if(o.isSkinnedMesh)o.skeleton.update();
      const pos=o.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        v.fromBufferAttribute(pos,i);if(o.isSkinnedMesh)o.boneTransform(i,v);
        v.applyMatrix4(o.matrixWorld);box.expandByPoint(v);
      }
    });
    return box;
  }
  function prepare(gl,anisotropy){
    if(!gl||!gl.scene)throw new Error('Spider model has no scene');
    const root=gl.scene,walk=gl.animations.find(a=>/Spider walking$/i.test(a.name)),run=gl.animations.find(a=>/Spider running$/i.test(a.name));
    if(!walk||!run)throw new Error('Spider walking/running animation is missing');
    const mixer=new T.AnimationMixer(root),bounds=new T.Box3();
    // Skinned rest bounds in this export are upright and are unsuitable for
    // scaling a walking spider. Measure the actual deformed walking poses.
    for(const clip of [walk,run]){
      mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().play();
      for(let i=0;i<8;i++){mixer.setTime(clip.duration*i/8);bounds.union(poseBounds(root));}
    }
    mixer.stopAllAction();mixer.clipAction(walk).reset().play();mixer.setTime(0);root.updateMatrixWorld(true);
    const anchor=root.getObjectByName('Root_010'),center=anchor?anchor.getWorldPosition(new T.Vector3()):bounds.getCenter(new T.Vector3());
    const size=bounds.getSize(new T.Vector3()),span=Math.max(size.x,size.z);
    if(!(span>0&&Number.isFinite(span)))throw new Error('Spider has invalid geometry');
    const scale=.92/span;
    root.traverse(o=>{
      if(!o.isMesh)return;
      o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        m.skinning=!!o.isSkinnedMesh;m.side=T.DoubleSide;
        if(m.emissive){m.emissive.setHex(0x17130d);m.emissiveMap=m.map||null;m.emissiveIntensity=.32;}
        if(m.roughness!=null)m.roughness=Math.max(.55,m.roughness);
        for(const key of ['map','normalMap','roughnessMap','metalnessMap']){
          const tx=m[key];if(!tx)continue;
          tx.anisotropy=clamp(anisotropy||2,1,4);tx.minFilter=T.LinearMipmapLinearFilter;tx.magFilter=T.LinearFilter;tx.needsUpdate=true;
        }
        m.needsUpdate=true;
      }
    });
    // This model faces -Z; Facility actors face +Z. Keep import transforms and
    // bones intact, and normalize the feet/body in parent groups instead.
    const offset=new T.Group();offset.position.set(-center.x,-bounds.min.y,-center.z);offset.add(root);
    const facing=new T.Group();facing.rotation.y=Math.PI;facing.add(offset);
    const visual=new T.Group();visual.name='Uploaded Wolf Spider';visual.scale.setScalar(scale);visual.position.y=.012;visual.add(facing);
    mixer.stopAllAction();mixer.uncacheRoot(root);
    asset={root,visual,walk,run,scale,sourceBounds:bounds,span:.92,owner:null};
    return asset;
  }
  async function load(progress,fetchBuffer,anisotropy){
    progress=progress||(()=>{});
    if(asset){progress(1);return asset;}
    if(pending)return pending;
    pending=(async()=>{
      if(!T.GLTFLoader)throw new Error('Spider GLTF loader is unavailable');
      const url='assets/horror/wolf-spider.glb?v=wolf-spider-r1-20261020';
      const data=await fetchBuffer(url,p=>progress(p*.9));
      const gl=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(data,'assets/horror/',resolve,reject));
      const result=prepare(gl,anisotropy);progress(1);return result;
    })();
    try{return await pending;}catch(error){pending=null;throw error;}
  }
  function createActor(){
    if(!asset)throw new Error('Spider model must load before an encounter is created');
    if(asset.owner)release(asset.owner);
    const visual=new T.Group();visual.add(asset.visual);
    const mixer=new T.AnimationMixer(asset.root),walk=mixer.clipAction(asset.walk),run=mixer.clipAction(asset.run);
    const actor={visual,mixer,walk,run,runWeight:0,radius:.34,height:.58,eye:.32};asset.owner=actor;
    reset(actor);return actor;
  }
  function reset(actor){
    actor.mixer.stopAllAction();actor.walk.reset().setEffectiveWeight(1).play();actor.run.reset().setEffectiveWeight(0).play();
    actor.walk.paused=actor.run.paused=false;actor.runWeight=0;actor.mixer.update(0);
  }
  function tick(actor,speed,dt){
    if(!actor||!Number.isFinite(dt)||dt<=0)return;
    speed=Number.isFinite(speed)?Math.max(0,speed):0;dt=Math.min(dt,.05);
    const moving=speed>.08,target=clamp((speed-1.3)/1.7,0,1);
    actor.runWeight+=(target-actor.runWeight)*(1-Math.exp(-12*dt));
    actor.walk.setEffectiveWeight(1-actor.runWeight);actor.run.setEffectiveWeight(actor.runWeight);
    actor.walk.setEffectiveTimeScale(clamp(.7+speed*.5,.5,2.4));actor.run.setEffectiveTimeScale(clamp(speed/2,.5,2.3));
    actor.walk.paused=actor.run.paused=!moving;actor.mixer.update(dt);
  }
  function release(actor){
    if(!actor)return;actor.mixer.stopAllAction();
    if(asset&&asset.owner===actor){actor.mixer.uncacheRoot(asset.root);if(asset.visual.parent)asset.visual.parent.remove(asset.visual);asset.owner=null;}
    if(actor.visual.parent)actor.visual.parent.remove(actor.visual);
  }
  global.FacilitySpider={load,prepare,createActor,reset,tick,release,poseBounds};
})(typeof window!=='undefined'?window:globalThis);
