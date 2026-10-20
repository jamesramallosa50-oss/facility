// Find opaque, parallel faces that compete for the same depth. Uses the real
// level builders; no renderer or browser is needed to measure separation.
function verticalRect(material,c,eu,ev,n){
  const axis=n.findIndex(v=>Math.abs(v)>.999999);
  if(axis<0||axis===1||Math.abs(n[(axis+1)%3])+Math.abs(n[(axis+2)%3])>1e-6)return null;
  if(material==='decal'||material==='emis'||Math.abs(eu[axis])+Math.abs(ev[axis])>1e-6)return null;
  const u=(axis+1)%3,v=(axis+2)%3,du=Math.abs(eu[u])+Math.abs(ev[u]),dv=Math.abs(eu[v])+Math.abs(ev[v]);
  if(du<1e-6||dv<1e-6)return null;
  return{material,axis,sign:n[axis],plane:c[axis],lo:[c[u]-du,c[v]-dv],hi:[c[u]+du,c[v]+dv]};
}
function cells(r,plane,visit){
  for(let u=Math.floor(r.lo[0]);u<=Math.floor(r.hi[0]-1e-6);u++)for(let v=Math.floor(r.lo[1]);v<=Math.floor(r.hi[1]-1e-6);v++)visit([r.axis,r.sign,plane,u,v].join(','));
}
function overlaps(a,b=a,tolerance=1e-6){
  const bins=new Map(),hits=[],steps=Math.ceil(tolerance*1000);
  for(const [i,r]of a.entries())cells(r,Math.round(r.plane*1000),key=>{if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);});
  for(const [i,r]of b.entries()){
    const candidates=new Set(),plane=Math.round(r.plane*1000);
    for(let p=plane-steps;p<=plane+steps;p++)cells(r,p,key=>{for(const j of bins.get(key)||[])if(a!==b||j<i)candidates.add(j);});
    for(const j of candidates){const o=a[j],w=Math.min(r.hi[0],o.hi[0])-Math.max(r.lo[0],o.lo[0]),h=Math.min(r.hi[1],o.hi[1])-Math.max(r.lo[1],o.lo[1]);
      if(w>1e-5&&h>1e-5&&Math.abs(r.plane-o.plane)<=tolerance)hits.push({a:o,b:r,area:w*h});
    }
  }return hits;
}
module.exports={verticalRect,overlaps};
