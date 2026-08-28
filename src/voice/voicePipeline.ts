import type { VoiceGateway, VoiceRequest } from './voiceGateway';
export type TutorReply = { text: string; language?: string };
export type TutorHandler = (request: VoiceRequest) => Promise<TutorReply>;
export type VoicePipeline = { ask(text:string, language?:string): Promise<TutorReply>; replay(): Promise<void>; stop():void; lastReply():TutorReply|null; };
export function createVoicePipeline(gateway:VoiceGateway,tutor:TutorHandler):VoicePipeline{
 let last:TutorReply|null=null;
 return { async ask(text,language){const request=gateway.routeRequest({text,language}); if(!request.text) throw new Error('Empty voice request'); const reply=await tutor(request); last=reply; await gateway.speakResponse(reply.text,reply.language??language); return reply;}, async replay(){if(last) await gateway.speakResponse(last.text,last.language);}, stop(){gateway.stop();}, lastReply(){return last;} };
}
