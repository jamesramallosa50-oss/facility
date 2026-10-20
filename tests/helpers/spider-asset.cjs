// Parse the actual bundled GLB geometry/rig in Node. Image bytes are validated
// separately; remove only texture bindings in memory to avoid browser image IO.
const fs=require('node:fs'),vm=require('node:vm');
function parseSpider(T,file,loaderFile){
  const b=fs.readFileSync(file),jn=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+jn));
  for(const m of json.materials||[]){
    delete m.extensions;delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;
    if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}
  }
  delete json.images;delete json.textures;delete json.extensionsUsed;delete json.extensionsRequired;
  let js=Buffer.from(JSON.stringify(json));js=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,32)]);
  const bin=b.subarray(20+jn+8),header=Buffer.alloc(20),bh=Buffer.alloc(8);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+js.length+8+bin.length,8);header.writeUInt32LE(js.length,12);header.writeUInt32LE(0x4e4f534a,16);
  bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
  const data=Buffer.concat([header,js,bh,bin]);
  const ctx={THREE:T,console,TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Float32Array,Int8Array,Int16Array,Uint16Array,Uint32Array,Blob,URL,setTimeout,clearTimeout,performance,atob,btoa};ctx.window=ctx;ctx.self=ctx;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(loaderFile,'utf8'),ctx);
  return new Promise((resolve,reject)=>new T.GLTFLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'',resolve,reject));
}
module.exports={parseSpider};
