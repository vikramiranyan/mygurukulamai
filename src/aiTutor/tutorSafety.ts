export type SafetyDecision={allowed:boolean;reason?:string};
const blockedPatterns=[/self[- ]harm/i,/suicide/i,/sexual(?: content| activity| instructions?)/i,/explicit sexual/i,/how to (?:make|build|create) (?:a )?(?:weapon|bomb|explosive)/i,/weapon making/i,/illegal drug/i,/how to (?:make|synthesize|produce) (?:an )?(?:illegal drug|controlled substance)/i];
export function checkTutorInput(input:string):SafetyDecision{if(blockedPatterns.some(pattern=>pattern.test(input)))return{allowed:false,reason:'Request is outside the age-appropriate tutor scope.'};return{allowed:true};}
export function ageAppropriateInstruction(text:string,age?:number):string{if(!age)return text;return age<8?text.replace(/technical jargon/gi,'simple words'):text;}
