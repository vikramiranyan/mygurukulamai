export type TurnEvent='start'|'interim'|'final'|'error';
export type TurnDetector={start():void;stop():void;handle(result:{text:string;isFinal:boolean}):TurnEvent};
export function createTurnDetector(onFinal:(text:string)=>void):TurnDetector{let active=false;return{start(){active=true;},stop(){active=false;},handle(result){if(!active)return'error';if(!result.text.trim())return'interim';if(result.isFinal){onFinal(result.text.trim());return'final';}return'interim';}};}
