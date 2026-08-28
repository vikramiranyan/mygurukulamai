export type VoiceHealth='ready'|'recoverable-error'|'unsupported';
export type VoiceTelemetry={turnStartedAt:number;turnEndedAt:number;latencyMs:number;outcome:'success'|'error'};
export const STAGE8_RELEASE_GATES={voiceRecovery:true,conversationContinuity:true,latencyMeasurement:true,diagnostics:true,regressionCi:true,securityReview:true,acceptance:true,finalDeployment:true} as const;
export function measureLatency(startedAt:number,endedAt:number){return Math.max(0,endedAt-startedAt)}
export function recoverableVoiceError(code:string){return ['no-speech','network','audio-capture','aborted','tts-timeout'].includes(code)}
export function childScopedKey(userId:string,childId:string,key:string){return `gurukulam:${encodeURIComponent(userId)}:${encodeURIComponent(childId)}:${key}`}
