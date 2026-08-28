export type VoiceError = 'unsupported'|'permission-denied'|'network'|'no-speech'|'audio-capture'|'aborted'|'service-not-allowed'|'unknown';
export type SpeechResult={text:string;confidence?:number;final:boolean};
export type VoiceTurn={startedAt:number;endedAt:number;durationMs:number};

function mapVoiceError(error:any):VoiceError{
 const code=String(error?.error??error?.name??'').toLowerCase();
 const message=String(error?.message??'').toLowerCase();
 if(code==='not-allowed'||code==='permission-denied'||code==='securityerror'||message.includes('not allowed')||message.includes('permission'))return'permission-denied';
 if(code==='service-not-allowed')return'service-not-allowed';
 if(code==='audio-capture')return'audio-capture';
 if(code==='no-speech')return'no-speech';
 if(code==='network')return'network';
 if(code==='aborted')return'aborted';
 return'unknown';
}

export class BrowserVoice {
 private recognition:any=null; private utterance:SpeechSynthesisUtterance|null=null;
 supportsSTT(){return typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);}
 supportsTTS(){return typeof window!=='undefined'&&'speechSynthesis'in window;}
 async requestMicrophone(){if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());return true;}catch(e){throw new Error(mapVoiceError(e));}}
 startSTT(language='en-IN',onResult:(r:SpeechResult)=>void,onError:(e:VoiceError)=>void):boolean{
  if(typeof window==='undefined'){onError('unsupported');return false;}
  const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!C){onError('unsupported');return false;}
  if(this.recognition){try{this.recognition.abort();}catch{}this.recognition=null;}
  const r=new C();this.recognition=r;r.lang=language;r.interimResults=true;r.continuous=false;
  r.onresult=(e:any)=>{const x=e.results[e.results.length-1];onResult({text:x[0].transcript,confidence:x[0].confidence,final:x.isFinal});};
  r.onerror=(e:any)=>onError(mapVoiceError(e));
  r.onend=()=>{if(this.recognition===r)this.recognition=null;};
  try{r.start();return true;}catch(e){if(this.recognition===r)this.recognition=null;onError(mapVoiceError(e));return false;}
 }
 stopSTT(){try{this.recognition?.stop();}catch{}this.recognition=null;}
 speak(text:string,language='en-IN',rate=0.9){if(!this.supportsTTS())return Promise.reject(new Error('unsupported'));return new Promise<void>((resolve,reject)=>{const u=new SpeechSynthesisUtterance(text);u.lang=language;u.rate=rate;u.onend=()=>{this.utterance=null;resolve()};u.onerror=()=>{this.utterance=null;reject(new Error('tts-failed'))};this.utterance=u;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);});}
 stopSpeaking(){if(this.supportsTTS())window.speechSynthesis.cancel();this.utterance=null;}
}

export class VoiceTurnDetector {private started=0;start(){this.started=Date.now();return this.started;}end(){const ended=Date.now();const started=this.started||ended;this.started=0;return{startedAt:started,endedAt:ended,durationMs:ended-started} as VoiceTurn;}}
export function paceForChild(text:string){return text.replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).join(' ');}