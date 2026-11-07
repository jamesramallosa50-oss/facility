/* CPU equivalent of the r128 skinning shader, including normalized integer
   vertex weights. r128's boneTransform reads integer weights without decoding
   their normalization, so it is unsuitable for the optimized hunter bounds. */
function skinPoseBounds(T,root){
  let top=root;while(top.parent)top=top.parent;top.updateMatrixWorld(true);
  const box=new T.Box3(),base=new T.Vector3(),v=new T.Vector3(),part=new T.Vector3(),matrix=new T.Matrix4();
  const normalized=(a,i,c)=>{const raw=c===0?a.getX(i):c===1?a.getY(i):c===2?a.getZ(i):a.getW(i);if(!a.normalized)return raw;
    const type=a.array.constructor.name;return type==='Uint8Array'?raw/255:type==='Uint16Array'?raw/65535:type==='Int8Array'?Math.max(-1,raw/127):type==='Int16Array'?Math.max(-1,raw/32767):raw;};
  root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.geometry.attributes.position)return;
    const p=mesh.geometry.attributes.position,w=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
    if(mesh.isSkinnedMesh)mesh.skeleton.update();
    for(let i=0;i<p.count;i++){
      base.fromBufferAttribute(p,i);v.copy(base);
      if(mesh.isSkinnedMesh){base.applyMatrix4(mesh.bindMatrix);v.set(0,0,0);
        for(let c=0;c<4;c++){const weight=normalized(w,i,c);if(!weight)continue;const joint=normalized(indices,i,c);matrix.fromArray(mesh.skeleton.boneMatrices,joint*16);v.addScaledVector(part.copy(base).applyMatrix4(matrix),weight);}
        v.applyMatrix4(mesh.bindMatrixInverse);
      }
      box.expandByPoint(v.applyMatrix4(mesh.matrixWorld));
    }
  });return box;
}
module.exports={skinPoseBounds};
