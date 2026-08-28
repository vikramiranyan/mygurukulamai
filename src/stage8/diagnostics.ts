export type DiagnosticSeverity='info'|'warning'|'error';
export type DiagnosticEvent={at:number;severity:DiagnosticSeverity;code:string;message:string;context?:Record<string,string|number|boolean>};
const SENSITIVE_KEYS=new Set(['token','authorization','password','email','phone','childName','userName']);
export function sanitizeContext(context?:Record<string,string|number|boolean>){if(!context)return undefined;const safe:Record<string,string|number|boolean>={};for(const [key,value] of Object.entries(context)){if(!SENSITIVE_KEYS.has(key))safe[key]=value;}return safe;}
export function createDiagnostic(severity:DiagnosticSeverity,code:string,message:string,context?:Record<string,string|number|boolean>):DiagnosticEvent{return{at:Date.now(),severity,code,message,context:sanitizeContext(context)}}
export class DiagnosticBuffer{private events:DiagnosticEvent[]=[];constructor(private readonly limit=100){} add(event:DiagnosticEvent){this.events.push(event);if(this.events.length>this.limit)this.events.splice(0,this.events.length-this.limit);} snapshot(){return this.events.map(event=>({...event,context:event.context?{...event.context}:undefined}));} clear(){this.events=[];}}
