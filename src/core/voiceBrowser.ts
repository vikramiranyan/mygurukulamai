import type { SpeechRequest, VoiceGateway, VoiceMode, VoiceTurn } from './voice';

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

export function voiceSupport(): { speechRecognition: boolean; speechSynthesis: boolean } {
  const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return { speechRecognition: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition), speechSynthesis: 'speechSynthesis' in window };
}

export class BrowserVoiceGateway implements VoiceGateway {
  private recognition?: Recognition;
  private resolve?: (turn: VoiceTurn) => void;
  private reject?: (reason?: unknown) => void;

  async listen(mode: VoiceMode): Promise<VoiceTurn> {
    const w = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const RecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!RecognitionCtor) throw new Error('Speech recognition is not supported in this browser.');
    return new Promise((resolve, reject) => {
      this.resolve = resolve; this.reject = reject;
      const recognition = new RecognitionCtor();
      this.recognition = recognition;
      recognition.lang = 'en-IN'; recognition.interimResults = false; recognition.continuous = mode === 'hands-free';
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() ?? '';
        if (transcript) this.resolve?.({ transcript, locale: recognition.lang });
      };
      recognition.onerror = event => this.reject?.(new Error(event.error || 'Voice recognition failed.'));
      recognition.onend = () => { if (!this.resolve) return; };
      recognition.start();
    });
  }

  async speak(request: SpeechRequest): Promise<void> {
    if (!('speechSynthesis' in window)) throw new Error('Speech synthesis is not supported in this browser.');
    const utterance = new SpeechSynthesisUtterance(request.text);
    utterance.lang = request.locale;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void { window.speechSynthesis?.cancel(); this.recognition?.stop(); this.resolve = undefined; this.reject = undefined; }
}
