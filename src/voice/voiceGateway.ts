export type VoiceState = 'idle' | 'requesting-permission' | 'listening' | 'processing' | 'speaking' | 'error';
export type VoiceRequest = { text: string; language?: string; confidence?: number };
export interface VoiceProvider { startListening(onResult:(request:VoiceRequest)=>void,onError:(error:Error)=>void): Promise<void>; stopListening(): void; speak(text:string, language?:string): Promise<void>; stopSpeaking(): void; }
export type VoiceGateway = { state: VoiceState; requestMicrophone(): Promise<boolean>; routeRequest(request:VoiceRequest): VoiceRequest; speakResponse(text:string, language?:string): Promise<void>; stop():void };
export function createVoiceGateway(provider: VoiceProvider): VoiceGateway {
 let state:VoiceState='idle';
 return { get state(){return state;}, async requestMicrophone(){state='requesting-permission'; if(!navigator?.mediaDevices?.getUserMedia){state='error';return false;} try{const stream=await navigator.mediaDevices.getUserMedia({audio:true}); stream.getTracks().forEach(t=>t.stop()); state='idle'; return true;}catch{state='error';return false;}}, routeRequest(request){state='processing'; return {...request,text:request.text.trim()};}, async speakResponse(text,language){state='speaking'; try{await provider.speak(text,language);state='idle';}catch{state='error';throw new Error('Voice response failed');}}, stop(){provider.stopListening();provider.stopSpeaking();state='idle';} };
}
