export type SafetyDecision={allowed:boolean;reason?:string};
const blocked=/(self[- ]harm|suicide|sexual content|explicit sexual|weapon making|illegal drug)/i;
export function checkTutorInput(input:string):SafetyDecision{if(blocked.test(input))return{allowed:false,reason:'Request is outside the age-appropriate tutor scope.'};return{allowed:true};}
export function ageAppropriateInstruction(text:string,age?:number):string{if(!age)return text;return age<8?text.replace(/technical jargon/gi,'simple words'):text;}
