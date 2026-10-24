/* Budgeted A* for Facility actors. Search buffers and the indexed heap are
   reused; long routes share a small amount of work across rendered frames. */
(function(global){
 'use strict';
 const MAX_NODES=256,MAX_MS=2,CHUNK=16;
 function prepare(F){
  const N=F.nav;if(N.components)return;
  const full=new Int32Array(N.N),walk=new Int32Array(N.N);for(let i=0;i<N.N;i++)full[i]=walk[i]=i;
  const find=(p,n)=>{let r=n;while(p[r]!==r)r=p[r];while(p[n]!==n){const next=p[n];p[n]=r;n=next;}return r;};
  const join=(p,a,b)=>{a=find(p,a);b=find(p,b);if(a!==b)p[b]=a;};
  for(let a=0;a<N.N;a++){const edges=N.adj[a];for(let k=0;k<edges.length;k+=2){const b=edges[k];if(a>b)continue;join(full,a,b);if(!F.linkSet?.has(a*65536+b))join(walk,a,b);}}
  for(let i=0;i<N.N;i++){full[i]=find(full,i);walk[i]=find(walk,i);}N.components=full;N.walkComponents=walk;
 }
 function buffers(N){return{nav:N,g:new Float64Array(N.N),score:new Float64Array(N.N),from:new Int32Array(N.N),mark:new Uint32Array(N.N),closed:new Uint32Array(N.N),heap:new Int32Array(N.N),position:new Int32Array(N.N),generation:0};}
 function start(F,owner,a,b,noLinks,maxN=30000){
  const N=F.nav,C=noLinks?N.walkComponents:N.components,J={owner,nav:N,links:F.linkSet,start:a,goal:b,noLinks,done:false,delivered:false,path:null,expanded:0,count:0,limit:maxN};
  if(a<0||b<0||a>=N.N||b>=N.N||C&&C[a]!==C[b]){J.done=true;return J;}
  if(a===b){J.done=true;J.path=[a];return J;}
  let P=owner.routeBuffers;if(!P||P.nav!==N)P=owner.routeBuffers=buffers(N);
  if(++P.generation>=0xffffffff){P.mark.fill(0);P.closed.fill(0);P.generation=1;}
  J.P=P;J.gen=P.generation;J.bx=N.nx[b];J.by=N.ny[b];J.bz=N.nz[b];P.mark[a]=J.gen;P.from[a]=-1;P.g[a]=0;P.score[a]=heuristic(J,a);P.heap[0]=a;P.position[a]=0;J.count=1;return J;
 }
 function heuristic(J,n){const N=J.nav,dx=(N.nx[n]-J.bx)*.5,dz=(N.nz[n]-J.bz)*.5,dy=N.ny[n]-J.by;return Math.sqrt(dx*dx+dy*dy+dz*dz);}
 function before(P,a,b){return P.score[a]<P.score[b]||P.score[a]===P.score[b]&&P.g[a]>P.g[b];}
 function push(J,n){const P=J.P;let i=P.position[n];if(i<0)i=J.count++;
  while(i>0){const parent=(i-1)>>1,other=P.heap[parent];if(!before(P,n,other))break;P.heap[i]=other;P.position[other]=i;i=parent;}P.heap[i]=n;P.position[n]=i;
 }
 function pop(J){const P=J.P,top=P.heap[0],last=P.heap[--J.count];P.position[top]=-1;
  if(J.count){let i=0;while(i*2+1<J.count){const left=i*2+1,right=left+1,child=right<J.count&&before(P,P.heap[right],P.heap[left])?right:left;if(!before(P,P.heap[child],last))break;P.heap[i]=P.heap[child];P.position[P.heap[i]]=i;i=child;}P.heap[i]=last;P.position[last]=i;}return top;
 }
 function step(J,amount){
  if(J.done)return 0;const P=J.P,N=J.nav,gen=J.gen;let work=0;
  while(J.count&&work<amount){const n=pop(J);if(n===J.goal){const path=[];for(let i=n;i>=0;i=P.from[i]){path.push(i);if(i===J.start)break;}path.reverse();J.path=path;J.done=true;break;}
   if(J.expanded>=J.limit){J.done=true;break;}J.expanded++;work++;P.closed[n]=gen;const edges=N.adj[n],g=P.g[n];
   for(let k=0;k<edges.length;k+=2){const m=edges[k];if(P.closed[m]===gen||J.noLinks&&J.links?.has(n*65536+m))continue;const cost=g+edges[k+1];
    if(P.mark[m]!==gen){P.mark[m]=gen;P.position[m]=-1;P.g[m]=cost;P.from[m]=n;P.score[m]=cost+heuristic(J,m);push(J,m);}
    else if(cost<P.g[m]){P.g[m]=cost;P.from[m]=n;P.score[m]=cost+heuristic(J,m);push(J,m);}
   }
  }
  if(!J.count)J.done=true;return work;
 }
 function work(F){
  let B=F.pathBudget;if(!B||B.time!==F.t)B=F.pathBudget={time:F.t,nodes:0,ms:0};
  const jobs=F.pathJobs||(F.pathJobs=[]);let cursor=F.pathCursor||0;
  while(jobs.length&&B.nodes<MAX_NODES&&B.ms<MAX_MS){cursor%=jobs.length;const J=jobs[cursor];if(J.owner.route!==J||J.done){jobs.splice(cursor,1);continue;}
   const now=performance.now();B.nodes+=step(J,Math.min(CHUNK,MAX_NODES-B.nodes));B.ms+=performance.now()-now;
   if(J.done)jobs.splice(cursor,1);else cursor++;
  }F.pathCursor=cursor;
 }
 function route(F,owner,a,b,refresh,noLinks=false){
  let J=owner.route;
  if(refresh&&(!J||J.done&&J.delivered)){J=owner.route=start(F,owner,a,b,noLinks);if(!J.done)(F.pathJobs||(F.pathJobs=[])).push(J);}
  work(F);return J;
 }
 function path(F,a,b,maxN,noLinks){prepare(F);const owner=F.syncRouteOwner||(F.syncRouteOwner={}),J=start(F,owner,a,b,!!noLinks,maxN||30000);while(!J.done)step(J,1024);return J.path;}
 global.FacilityNavigation={prepare,route,path,step,limits:{nodes:MAX_NODES,milliseconds:MAX_MS}};
})(typeof window!=='undefined'?window:globalThis);
