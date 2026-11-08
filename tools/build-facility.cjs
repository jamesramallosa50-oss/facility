/* Keep state-dependent modules inside the engine's private lexical scope. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'game-core.html');
const names=['facility-survival.js','facility-world.js','facility-coop.js'];
const start='/* FACILITY PRIVATE MODULES START */',end='/* FACILITY PRIVATE MODULES END */';
const block=start+'\n'+names.map(name=>'/* Source: assets/'+name+' */\n'+fs.readFileSync(path.join(root,'assets',name),'utf8')).join('\n')+'\n'+end+'\n';
let source=fs.readFileSync(file,'utf8'),out=source;
if(out.includes(start)){const a=out.indexOf(start),b=out.indexOf(end,a);if(b<0)throw Error('Missing module boundary');out=out.slice(0,a)+out.slice(b+end.length+1);}
const anchor='setOpticClass(meta.scopeStyle||\'classic\');\nfixBar();buildTitleLevel();resize();requestAnimationFrame(frame);';
if(!out.includes(anchor))throw Error('Engine startup boundary missing');
out=out.replace(anchor,block+anchor);
for(const name of names)out=out.replace(new RegExp('<script src="assets/'+name.replace('.','\\.')+'[^"\\n]*"><\\/script>\\n','g'),'');
if(process.argv.includes('--check')){if(out!==source)throw Error('Run node tools/build-facility.cjs to refresh private modules');}
else fs.writeFileSync(file,out);
