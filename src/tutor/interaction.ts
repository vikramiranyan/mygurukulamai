export type Interaction = { role: 'teacher' | 'child'; text: string; concept?: string; correct?: boolean };
export type TutorTurn = { responseMode: 'explain' | 'question' | 'check' | 'reteach'; prompt: string; nextAction: string };

export function createSocraticTurn(last: Interaction | undefined, concept: string): TutorTurn {
  if (!last) return { responseMode:'question', prompt:`What do you already know about ${concept}?`, nextAction:'listen' };
  if (last.correct === false) return { responseMode:'reteach', prompt:`Let's try ${concept} in a simpler way. What happens if we start with an example?`, nextAction:'check_again' };
  return { responseMode:'check', prompt:`Can you explain ${concept} in your own words?`, nextAction:'evaluate' };
}

export function explainWithExamples(concept: string, example: string): string { return `Let's understand ${concept} with an example: ${example}`; }
