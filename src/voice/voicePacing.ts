export type PacingOptions={rate?:number;pauseMs?:number};
export function applyChildFriendlyPacing(text:string,{rate=.9,pauseMs=250}:PacingOptions={}):{text:string;rate:number;pauseMs:number}{return{text:text.replace(/\s+/g,' ').trim(),rate:Math.max(.75,Math.min(1,rate)),pauseMs:Math.max(0,Math.min(1000,pauseMs))};}
