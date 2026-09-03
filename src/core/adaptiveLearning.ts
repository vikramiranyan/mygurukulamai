export type MasteryBand = 'reteach' | 'practice' | 'advance';

export type LearningSignal = {
  correct: boolean;
  questionId?: string;
  responseMs?: number;
  hintUsed?: boolean;
  attempts?: number;
};

export type AdaptiveRecommendation = {
  band: MasteryBand;
  mastery: number;
  confidence: number;
  nextStep: 'reteach' | 'guided-practice' | 'independent-practice' | 'challenge';
  reason: string;
};

function clamp(value: number, min = 0, max = 1): number { return Math.max(min, Math.min(max, value)); }

function effectiveAttempts(signals: LearningSignal[], index: number): number {
  const explicit = signals[index]?.attempts;
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 1) return explicit;
  const questionKey = signals[index]?.questionId;
  if (!questionKey) return 1;
  return signals.slice(0, index + 1).filter(signal => signal.questionId === questionKey).length;
}

export function scoreLearningSignals(signals: LearningSignal[]): number {
  if (!signals.length) return 0;
  const weighted = signals.map((signal, index) => {
    let value = signal.correct ? 1 : 0;
    if (signal.hintUsed) value -= 0.15;
    const attempts = effectiveAttempts(signals, index);
    if (attempts > 1) value -= Math.min(0.2, (attempts - 1) * 0.05);
    if (typeof signal.responseMs === 'number' && signal.responseMs > 30000) value -= 0.05;
    return clamp(value);
  });
  return Math.round((weighted.reduce((sum, value) => sum + value, 0) / weighted.length) * 100);
}

export function recommendNextStep(signals: LearningSignal[], previousMastery = 0): AdaptiveRecommendation {
  const observed = signals.length ? scoreLearningSignals(signals) / 100 : clamp(previousMastery);
  const mastery = Math.round((observed * 0.75 + clamp(previousMastery) * 0.25) * 100);
  let consecutiveIncorrect = 0;
  for (let index = signals.length - 1; index >= 0 && !signals[index].correct; index -= 1) consecutiveIncorrect += 1;
  const hints = signals.filter(signal => signal.hintUsed).length;
  const confidence = Math.round(clamp(1 - consecutiveIncorrect / Math.max(3, signals.length) - hints * 0.08) * 100);

  if (mastery < 50 || consecutiveIncorrect >= 2) return { band: 'reteach', mastery, confidence, nextStep: 'reteach', reason: 'The learner needs a simpler explanation and a guided example before another check.' };
  if (mastery < 80 || hints > 0) return { band: 'practice', mastery, confidence, nextStep: mastery < 65 ? 'guided-practice' : 'independent-practice', reason: 'The learner is developing the concept; vary examples and reduce support gradually.' };
  return { band: 'advance', mastery, confidence, nextStep: 'challenge', reason: 'The learner is demonstrating stable understanding; introduce a slightly harder application.' };
}

export function diagnoseMistake(answer: string, expected: string[]): 'blank' | 'near-miss' | 'concept-gap' | 'acceptable' {
  const normalized = answer.trim().toLocaleLowerCase();
  if (!normalized) return 'blank';
  if (!expected.length) return normalized.length >= 3 ? 'acceptable' : 'near-miss';
  if (expected.some(value => normalized === value.toLocaleLowerCase())) return 'acceptable';
  const compact = normalized.replace(/\s+/g, '');
  const near = expected.some(value => {
    const target = value.toLocaleLowerCase().replace(/\s+/g, '');
    return target.length > 2 && (target.includes(compact) || compact.includes(target) || levenshtein(compact, target) <= Math.max(1, Math.floor(target.length / 4)));
  });
  return near ? 'near-miss' : 'concept-gap';
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

export function remediationMessage(concept: string, diagnosis: ReturnType<typeof diagnoseMistake>): string {
  if (diagnosis === 'blank') return `Let's take our time. I'll show one small example of ${concept}, then you can try.`;
  if (diagnosis === 'near-miss') return `You're close! Let's look at one clue for ${concept} and try the same idea again.`;
  if (diagnosis === 'concept-gap') return `No problem. Let's rebuild ${concept} from the simplest idea, with a fresh example.`;
  return `Nice work! Let's explain why that answer works and then try a new example.`;
}
