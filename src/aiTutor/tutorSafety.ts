export type SafetyDecision = { allowed: boolean; reason?: string; normalized?: string };

const MAX_INPUT_LENGTH = 500;
const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const blockedPatterns = [
  /self[- ]harm/i,
  /suicide/i,
  /(?:sexual|pornograph|nude|explicit sexual)/i,
  /how to (?:make|build|create) (?:a )?(?:weapon|bomb|explosive)/i,
  /weapon making/i,
  /(?:illegal|recreational) drug/i,
  /how to (?:make|synthesize|produce) (?:an )?(?:illegal drug|controlled substance)/i,
];
const promptInjectionPatterns = [
  /ignore (?:all|any|previous|prior) instructions/i,
  /reveal (?:the )?(?:system|developer|hidden) prompt/i,
  /show (?:me )?(?:your|the) secret/i,
  /bypass (?:safety|parent|security)/i,
  /disable (?:safety|guardrails|filters)/i,
];

export function normalizeTutorInput(input: string): string {
  return String(input ?? '').replace(controlCharacters, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_LENGTH);
}

export function checkTutorInput(input: string): SafetyDecision {
  const raw = String(input ?? '').replace(controlCharacters, ' ').trim();
  if (!raw) return { allowed: false, reason: 'Please ask a learning question.', normalized: '' };
  if (raw.length > MAX_INPUT_LENGTH) return { allowed: false, reason: 'That question is a little too long. Please ask it in a shorter way.', normalized: raw.slice(0, MAX_INPUT_LENGTH) };
  const normalized = normalizeTutorInput(raw);
  if (blockedPatterns.some(pattern => pattern.test(normalized))) {
    return { allowed: false, reason: 'Request is outside the age-appropriate tutor scope.', normalized };
  }
  if (promptInjectionPatterns.some(pattern => pattern.test(normalized))) {
    return { allowed: false, reason: 'I can help with learning, but I cannot change my safety or parent controls.', normalized };
  }
  return { allowed: true, normalized };
}

export function ageAppropriateInstruction(text: string, age?: number): string {
  const normalized = normalizeTutorInput(text);
  if (!age || age >= 12) return normalized;
  if (age < 8) return normalized.replace(/technical jargon/gi, 'simple words').replace(/algorithm/gi, 'step-by-step instructions');
  return normalized.replace(/technical jargon/gi, 'specialist words');
}
