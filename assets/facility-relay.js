/* HTTPS polling transport for the existing four-seat room service. Messages
   stay in a hosted room, so mobile NAT/firewalls need no WebRTC negotiation. */
(function(global){
 'use strict';
 class Link{
  constructor(relay,slot){this.relay=relay;this.slot=slot;this.peer='p'+slot;this.open=true;this.bufferSize=0;this.handlers={};this.metadata={version:2,build:'chase-r5',name:relay.members.find(m=>m.slot===slot)?.name||'Survivor'};}
  on(event,fn){(this.handlers[event]||(this.handlers[event]=[])).push(fn);return this;}
  emit(event,data){for(const f of this.handlers[event]||[])f(data);}
  send(data){this.relay.enqueue(this.slot,data);}
  close(){if(!this.open)return;this.open=false;this.emit('close');}
 }
 class Relay{
  constructor(options){this.options=options;this.queue=new Map();this.links=new Map();this.parts=new Map();this.members=[];this.cursor=0;this.serial=0;this.closed=false;this.busy=false;this.lastSuccess=Date.now();this.failures=0;}
  async request(body){
   const started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{const r=await fetch('api/facility-room',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});const result=await r.json();
    if(!r.ok){const e=new Error(result.error||'Room request failed');e.status=r.status;throw e;}this.ping=Date.now()-started;return result;
   }finally{clearTimeout(timer);}
  }
  async start(){
   const data=await this.request({action:this.options.host?'create':'join',code:this.options.code,name:this.options.name});
   this.code=data.code;this.slot=data.slot;this.token=data.token;this.id='p'+this.slot;this.members=data.members||[];
   this.options.onOpen(this);this.consume(data);this.timer=setTimeout(()=>this.poll(),50);return this;
  }
  link(slot){let c=this.links.get(slot);if(!c){c=new Link(this,slot);this.links.set(slot,c);this.options.onConnection(c);queueMicrotask(()=>c.emit('open'));}return c;}
  enqueue(to,data){
   if(this.closed)return;const key=to+':'+(data.type||'packet');this.queue.set(key,{to,data});
  }
  packets(){
   const list=[],encoded=new Map();let bytes=0;
   for(const [key,p]of this.queue){
    let text=encoded.get(p.data);if(text===undefined){text=JSON.stringify(p.data);encoded.set(p.data,text);}const id=++this.serial,n=Math.ceil(text.length/8500),chunks=[];
    for(let i=0;i<n;i++)chunks.push({to:p.to,data:{facility:2,id,part:i,n,body:text.slice(i*8500,(i+1)*8500)}});
    const size=JSON.stringify(chunks).length;if(list.length+chunks.length>12||bytes+size>59000)break;
    list.push(...chunks);bytes+=size;this.queue.delete(key);
   }return list;
  }
  consume(data){
   this.members=data.members||[];this.lastSuccess=Date.now();this.failures=0;
   if(data.phase==='closed'){this.options.onError('The host left or stopped responding. Ask them to reopen their room.',true);return;}
   for(const m of this.members)if(m.slot!==this.slot&&(this.slot===0||m.slot===0))this.link(m.slot);
   for(const [slot,c]of this.links)if(!this.members.some(m=>m.slot===slot)){c.close();this.links.delete(slot);}
   for(const s of data.signals||[]){
    this.cursor=Math.max(this.cursor,s.id);const p=s.data;if(p?.facility!==2||!Number.isInteger(p.n)||p.n<1||p.n>8||!Number.isInteger(p.part)||p.part<0||p.part>=p.n||typeof p.body!=='string')continue;
    const key=s.from+':'+p.id;let parts=this.parts.get(key);if(!parts){parts={n:p.n,data:new Map(),at:Date.now()};this.parts.set(key,parts);}parts.data.set(p.part,p.body);
    if(parts.data.size===parts.n){this.parts.delete(key);try{const packet=JSON.parse(Array.from({length:parts.n},(_,i)=>parts.data.get(i)).join(''));this.link(s.from).emit('data',packet);}catch(_){}}
   }
   for(const[k,v]of this.parts)if(Date.now()-v.at>20000)this.parts.delete(k);
   this.options.onStatus?.(this);
  }
  async poll(){
   if(this.closed||this.busy)return;this.busy=true;const signals=this.packets();
   try{const data=await this.request({action:'poll',code:this.code,token:this.token,cursor:this.cursor,signals});if(!this.closed)this.consume(data);}
   catch(error){
    // Future snapshots replace old ones; every input repeats its unacknowledged
    // action IDs, so a failed HTTP response cannot lose a pickup or door press.
    this.failures++;this.options.onError(error.message,error.status===401||error.status===404||error.status===409);
   }finally{this.busy=false;if(!this.closed)this.timer=setTimeout(()=>this.poll(),Math.min(1800,100+this.failures*250));}
  }
  retry(){clearTimeout(this.timer);this.failures=0;this.options.onStatus?.(this);this.poll();}
  destroy(){
   if(this.closed)return;this.closed=true;clearTimeout(this.timer);
   const body=JSON.stringify({action:'leave',code:this.code,token:this.token});
   if(this.token){try{if(navigator.sendBeacon)navigator.sendBeacon('api/facility-room',new Blob([body],{type:'application/json'}));else fetch('api/facility-room',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});}catch(_){}}
   for(const c of this.links.values())c.close();this.links.clear();
  }
 }
 global.FacilityRelay=Relay;
})(typeof window!=='undefined'?window:globalThis);
