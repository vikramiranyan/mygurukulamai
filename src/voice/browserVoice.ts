import'../chapters/chapterViewer';

export type VoiceError='unsupported'|'permission-denied'|'network'|'no-speech'|'audio-capture'|'aborted'|'service-not-allowed'|'unknown';
export type SpeechResult={text:string;confidence?:number;final:boolean};
export type VoiceTurn={startedAt:number;endedAt:number;durationMs:number};

function mapVoiceError(error:any):VoiceError{const code=String(error?.error??error?.name??'').toLowerCase();const message=String(error?.message??'').toLowerCase();if(code==='service-not-allowed')return'service-not-allowed';if(code==='not-allowed'||code==='permission-denied'||code==='securityerror'||message.includes('not allowed')||message.includes('permission'))return'permission-denied';if(code==='audio-capture')return'audio-capture';if(code==='no-speech')return'no-speech';if(code==='network')return'network';if(code==='aborted'||code==='interrupted')return'aborted';return'unknown';}

export class BrowserVoice{
 private recognition:any=null;private utterance:SpeechSynthesisUtterance|null=null;private speakTimer:number|null=null;private listenTimer:number|null=null;private recognitionGeneration=0;
 supportsSTT(){return typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);}
 supportsTTS(){return typeof window!=='undefined'&&'speechSynthesis'in window;}
 async requestMicrophone(){
  // Safari/iOS Web Speech has its own speech-recognition permission/service lifecycle.
  // Calling getUserMedia first can produce a misleading microphone-denied result even
  // when Safari has granted the site's microphone permission. Let SpeechRecognition
  // request/check its own permission from the user gesture instead.
  if(this.supportsSTT())return true;
  if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');
  try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());return true;}catch(e){throw new Error(mapVoiceError(e));}
 }
 startSTT(language='en-IN',onResult:(r:SpeechResult)=>void,onError:(e:VoiceError)=>void):boolean{
  if(typeof window==='undefined'){onError('unsupported');return false;}const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!C){onError('unsupported');return false;}
  this.stopSTT();const generation=++this.recognitionGeneration;const r=new C();this.recognition=r;r.lang=language;r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  let deliveredFinal=false;this.listenTimer=window.setTimeout(()=>{if(this.recognition===r&&!deliveredFinal){try{r.abort();}catch{}this.recognition=null;this.listenTimer=null;onError('no-speech');}},12000);
  r.onresult=(e:any)=>{if(generation!==this.recognitionGeneration||this.recognition!==r)return;const x=e.results[e.results.length-1];const text=String(x?.[0]?.transcript??'').trim();if(!text)return;const final=Boolean(x.isFinal);if(final)deliveredFinal=true;onResult({text,confidence:x?.[0]?.confidence,final});};
  r.onerror=(e:any)=>{if(generation!==this.recognitionGeneration)return;if(this.listenTimer!==null){window.clearTimeout(this.listenTimer);this.listenTimer=null;}if(this.recognition===r)this.recognition=null;onError(mapVoiceError(e));};
  r.onend=()=>{if(generation!==this.recognitionGeneration)return;if(this.listenTimer!==null){window.clearTimeout(this.listenTimer);this.listenTimer=null;}if(this.recognition===r)this.recognition=null;if(!deliveredFinal)onError('no-speech');};
  try{r.start();return true;}catch(e){if(this.listenTimer!==null){window.clearTimeout(this.listenTimer);this.listenTimer=null;}if(this.recognition===r)this.recognition=null;onError(mapVoiceError(e));return false;}
 }
 stopSTT(){this.recognitionGeneration++;if(this.listenTimer!==null&&typeof window!=='undefined'){window.clearTimeout(this.listenTimer);this.listenTimer=null;}try{this.recognition?.abort();}catch{}this.recognition=null;}
 speak(text:string,language='en-IN',rate=0.9){
  if(!this.supportsTTS())return Promise.reject(new Error('unsupported'));this.stopSpeaking();
  return new Promise<void>((resolve,reject)=>{let settled=false;let started=false;const finish=(ok:boolean,error?:Error)=>{if(settled)return;settled=true;if(this.speakTimer!==null){window.clearTimeout(this.speakTimer);this.speakTimer=null;}this.utterance=null;ok?resolve():reject(error||new Error('tts-failed'));};const u=new SpeechSynthesisUtterance(text);u.lang=language;u.rate=rate;
   u.onstart=()=>{started=true;if(this.speakTimer!==null)window.clearTimeout(this.speakTimer);this.speakTimer=window.setTimeout(()=>finish(false,new Error('tts-timeout')),15000);};u.onend=()=>finish(true);u.onerror=(e:any)=>{const code=String(e?.error||'tts-failed').toLowerCase();if(code==='interrupted'&&!started){window.setTimeout(()=>{if(!settled){window.speechSynthesis.resume();window.speechSynthesis.speak(u);}},120);return;}finish(false,new Error(code));};
   this.utterance=u;window.speechSynthesis.cancel();window.setTimeout(()=>{if(!settled){window.speechSynthesis.resume();window.speechSynthesis.speak(u);if(this.speakTimer===null)this.speakTimer=window.setTimeout(()=>finish(false,new Error('tts-timeout')),15000);}},80);
  });
 }
 stopSpeaking(){if(this.speakTimer!==null&&typeof window!=='undefined'){window.clearTimeout(this.speakTimer);this.speakTimer=null;}if(this.supportsTTS())window.speechSynthesis.cancel();this.utterance=null;}
}

export class VoiceTurnDetector{private started=0;start(){this.started=Date.now();return this.started;}end(){const ended=Date.now();const started=this.started||ended;this.started=0;return{startedAt:started,endedAt:ended,durationMs:ended-started} as VoiceTurn;}}
export function paceForChild(text:string){return text.replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).join(' ');}
