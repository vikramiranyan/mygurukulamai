export type LessonPhase='explain'|'ask'|'check'|'reteach'|'complete';
export type LessonTurn={phase:LessonPhase;childText?:string;teacherText:string;turn:number;at:number};
export type LessonSnapshot={phase:LessonPhase;turn:number;history:LessonTurn[];lastChildText?:string};

const nextPhase:Record<LessonPhase,LessonPhase>={explain:'ask',ask:'check',check:'ask',reteach:'ask',complete:'complete'};

export class LessonConversation{
 private snapshot:LessonSnapshot={phase:'explain',turn:0,history:[]};
 start(teacherText:string){return this.record('explain',teacherText);}
 teacher(phase:LessonPhase,teacherText:string){if(phase==='complete')return this.record('complete',teacherText);return this.record(phase,teacherText);}
 child(text:string){const value=text.trim();if(!value)throw new Error('Empty child response');this.snapshot.lastChildText=value;this.snapshot.phase=nextPhase[this.snapshot.phase];this.snapshot.turn+=1;this.snapshot.history.push({phase:this.snapshot.phase,childText:value,teacherText:'',turn:this.snapshot.turn,at:Date.now()});return this.snapshot;}
 recover(){if(this.snapshot.phase==='complete')return this.snapshot;this.snapshot.phase='reteach';this.snapshot.turn+=1;return this.snapshot;}
 complete(teacherText:string){return this.record('complete',teacherText);}
 reset(){this.snapshot={phase:'explain',turn:0,history:[]};}
 get state(){return {...this.snapshot,history:[...this.snapshot.history]};}
 private record(phase:LessonPhase,teacherText:string){this.snapshot.phase=phase;this.snapshot.turn+=1;this.snapshot.history.push({phase,teacherText,turn:this.snapshot.turn,at:Date.now()});return this.state;}
}

export function normalizeChildResponse(text:string){return text.replace(/\s+/g,' ').trim();}
