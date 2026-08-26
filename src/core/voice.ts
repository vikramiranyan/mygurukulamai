export type VoiceMode = 'push-to-talk' | 'hands-free';

export type VoiceTurn = {
  transcript: string;
  confidence?: number;
  locale: string;
};

export type SpeechRequest = {
  text: string;
  locale: string;
  voice: string;
};

/** Provider-neutral voice boundary. Browser/Web Speech or another free provider can implement it. */
export interface VoiceGateway {
  listen(mode: VoiceMode): Promise<VoiceTurn>;
  speak(request: SpeechRequest): Promise<void>;
  stopSpeaking(): void;
}
