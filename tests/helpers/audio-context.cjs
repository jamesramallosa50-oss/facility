// Web Audio test double: records nodes/envelopes without pretending to render
// or measure sound. Invalid buffer starts fail just as they do in a browser.
class AudioParam {
  constructor(value=0){this.value=value;this.events=[];this.target=value;}
  cancelScheduledValues(time){this.events=this.events.filter(e=>e.time<time);}
  setValueAtTime(value,time){this.value=value;this.events.push({value,time});}
  setTargetAtTime(value,time){this.target=value;this.events.push({value,time});}
  linearRampToValueAtTime(value,time){this.events.push({value,time});}
  exponentialRampToValueAtTime(value,time){this.events.push({value,time});}
}
class AudioNode {
  constructor(context,type){this.context=context;this.type=type;this.connections=[];for(const p of ['gain','frequency','Q','pan'])this[p]=new AudioParam();}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];}
  start(){if(this.type==='buffer'&&!this.buffer)throw Error('AudioBuffer missing');this.context.started.push(this);}
  stop(){this.stopped=true;}
}
class AudioContext {
  constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.nodes=[];this.started=[];this.destination=new AudioNode(this,'destination');}
  resume(){this.state='running';return Promise.resolve();}
  create(type){const node=new AudioNode(this,type);this.nodes.push(node);return node;}
  createGain(){return this.create('gain');}
  createBufferSource(){return this.create('buffer');}
  createBiquadFilter(){return this.create('filter');}
  createOscillator(){return this.create('oscillator');}
  createStereoPanner(){return this.create('panner');}
  createWaveShaper(){return this.create('shaper');}
  createBuffer(channels,length,rate){const data=new Float32Array(length);return{duration:length/rate,getChannelData:()=>data};}
  decodeAudioData(bytes,success){success({duration:1.6});}
}
module.exports={AudioContext};
