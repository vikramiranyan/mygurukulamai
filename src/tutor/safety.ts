const BLOCKED = [/sexual/i,/self-harm/i,/how to make a weapon/i,/buy illegal drugs/i];
export function isAgeAppropriate(input:string):boolean { return !BLOCKED.some(p=>p.test(input)); }
export function sanitizeTutorInput(input:string):string { return input.replace(/[<>]/g,'').trim().slice(0,4000); }
export function enforceTutorSafety(input:string):{allowed:boolean; safeText:string} { const safeText=sanitizeTutorInput(input); return {allowed:isAgeAppropriate(safeText),safeText}; }
