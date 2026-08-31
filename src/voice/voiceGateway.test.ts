import { describe, it, expect, vi, afterEach } from 'vitest';
import { createVoiceGateway, VoiceProvider } from './voiceGateway';

describe('Stage 5 voice gateway', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests microphone permission safely', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [] })),
      },
    });

    const provider = {} as VoiceProvider;
    expect(await createVoiceGateway(provider).requestMicrophone()).toBe(true);
  });

  it('routes trimmed speech text', () => {
    const gateway = createVoiceGateway({} as VoiceProvider);
    expect(gateway.routeRequest({ text: '  hello  ' }).text).toBe('hello');
  });
});
