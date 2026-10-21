/* Same-origin HTTPS room relay. Seat tokens are generated and checked by the
   owner's existing room service; no peer-to-peer ports or camera access needed. */
const SERVICE=process.env.FACILITY_ROOM_SERVICE||'https://iron-nexus-arena-online.clearbull1024.chatgpt.site/api/arena';
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('Content-Type','application/json');
 if(req.method==='GET'){res.statusCode=200;return res.end(JSON.stringify({service:'facility-rooms',protocol:2}));}
 if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:'POST required.'}));}
 const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
 if(origin&&new URL(origin).host!==host){res.statusCode=403;return res.end(JSON.stringify({error:'Open the game on this site.'}));}
 try{
  let b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!b||!['create','join','poll','leave'].includes(b.action)){res.statusCode=400;return res.end(JSON.stringify({error:'Invalid room action.'}));}
  if(JSON.stringify(b).length>64000){res.statusCode=413;return res.end(JSON.stringify({error:'Room packet too large.'}));}
  const payload={action:b.action,mode:'2v2',code:String(b.code||'').slice(0,6),name:String(b.name||'Survivor').slice(0,18),token:b.token,cursor:Math.max(0,Number(b.cursor)||0),signals:Array.isArray(b.signals)?b.signals.slice(0,12):[]};
  const response=await fetch(SERVICE,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','User-Agent':'The-Facility-Room-Relay/2.0 (+https://facility-g5iq.vercel.app/)'},body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch(_){res.statusCode=503;return res.end(JSON.stringify({error:'The room service did not respond. Retry in a moment.'}));}
  res.statusCode=response.status;return res.end(JSON.stringify(data));
 }catch(_){res.statusCode=503;return res.end(JSON.stringify({error:'The room service is temporarily unavailable. Your connection will retry.'}));}
};
