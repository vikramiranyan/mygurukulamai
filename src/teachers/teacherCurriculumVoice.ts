import type { VoiceRequest } from '../voice/voiceGateway';
export type CurriculumContext={subject:string;chapter:string;pages?:number[];approved:boolean};
export type TeacherId='Vikram'|'Raji';
export type TeacherTurn={teacher:TeacherId;request:VoiceRequest;context:CurriculumContext;reply:string;phase:'explain'|'ask'|'check'|'reteach'};
export function teacherForSubject(subject:string):TeacherId{return ['English','Maths','Computer'].includes(subject)?'Vikram':'Raji';}
export function createTeacherTurn(request:VoiceRequest,context:CurriculumContext,phase:TeacherTurn['phase']='explain'):TeacherTurn{const teacher=teacherForSubject(context.subject); if(!context.approved) throw new Error('Curriculum source requires parent approval'); const name=teacher; const reply=phase==='ask'?`${name}: What do you think about ${context.chapter}?`:phase==='check'?`${name}: Tell me one thing you learned from ${context.chapter}.`:phase==='reteach'?`${name}: Let's try ${context.chapter} again with a simpler example.`:`${name}: Let's learn ${context.chapter} together.`; return {teacher,request,context,reply,phase};}
