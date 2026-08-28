export type VoiceError = 'unsupported'|'permission-denied'|'network'|'no-speech'|'unknown';
export type SpeechResult={text:string;confidence?:number;final:boolean};
export type VoiceTurn={startedAt:number;endedAt:number;durationMs:number};
export class BrowserVoice {
 private recognition:any=null; private utterance:SpeechSynthesisUtterance|null=null;
 supportsSTT(){return typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);}
 supportsTTS(){return typeof window!=='undefined'&&'speechSynthesis'in window;}
 async requestMicrophone(){if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia)throw new Error('unsupported');try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop());return true;}catch{throw new Error('permission-denied');}}
 startSTT(language='en-IN',onResult:(r:SpeechResult)=>void,onError:(e:VoiceError)=>void){const C=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!C){onError('unsupported');return;}const r=new C();this.recognition=r;r.lang=language;r.interimResults=true;r.continuous=false;r.onresult=(e:any)=>{const x=e.results[e.results.length-1];onResult({text:x[0].transcript,confidence:x[0].confidence,final:x.isFinal});};r.onerror=(e:any)=>onError(e.error==='not-allowed'?'permission-denied':e.error==='no-speech'?'no-speech':e.error==='network'?'network':'unknown');r.start();}
 stopSTT(){this.recognition?.stop();this.recognition=null;}
 speak(text:string,language='en-IN',rate=0.9){if(!this.supportsTTS())return Promise.reject(new Error('unsupported'));return new Promise<void>((resolve,reject)=>{const u=new SpeechSynthesisUtterance(text);u.lang=language;u.rate=rate;u.onend=()=>{this.utterance=null;resolve()};u.onerror=()=>{this.utterance=null;reject(new Error('tts-failed'))};this.utterance=u;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);});}
 stopSpeaking(){if(this.supportsTTS())window.speechSynthesis.cancel();this.utterance=null;}
}
export class VoiceTurnDetector {private started=0;start(){this.started=Date.now();return this.started;}end(){const ended=Date.now();const started=this.started||ended;this.started=0;return{startedAt:started,endedAt:ended,durationMs:ended-started} as VoiceTurn;}}
export function paceForChild(text:string){return text.replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).join(' ');}
