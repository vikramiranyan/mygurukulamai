export type TutorLanguage = 'English' | 'Hindi' | 'Tamil' | 'Telugu';

export type HostedTutorRequest = {
  question: string;
  language: TutorLanguage;
  subject: string;
  chapter: string;
  grade?: string;
  teacherName?: string;
  textbookContext?: string;
  sourceUrls?: string[];
};

export type HostedTutorResponse = {
  text: string;
  language: TutorLanguage;
};

const languageCodes: Record<TutorLanguage, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
};

export function speechLanguage(language: TutorLanguage): string {
  return languageCodes[language];
}

function hostedTutorUrl(): string {
  return (import.meta.env.VITE_AI_API_URL?.trim() || '').replace(/\/$/, '');
}

export async function askHostedTutor(request: HostedTutorRequest, signal?: AbortSignal): Promise<HostedTutorResponse | null> {
  const baseUrl = hostedTutorUrl();
  if (!baseUrl) throw new Error('Hosted AI is not configured. Set VITE_AI_API_URL to the deployed tutor Worker URL.');

  const response = await fetch(`${baseUrl}/api/tutor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Hosted tutor request failed (${response.status}).`);
  }

  const value = await response.json() as Partial<HostedTutorResponse>;
  if (typeof value.text !== 'string' || !value.text.trim()) throw new Error('Hosted tutor returned an empty response.');
  return {
    text: value.text.trim(),
    language: value.language && value.language in languageCodes ? value.language : request.language,
  };
}
