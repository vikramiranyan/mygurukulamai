export type ChildTeachingResponse = {
  title: string;
  body: string;
  checks: string[];
};

function clean(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

export function buildChildTeachingResponse(input: string): ChildTeachingResponse | null {
  const q = clean(input).toLocaleLowerCase();
  if (!q) return null;

  const numberRequest = /\b(numbers?|count|counting)\b/.test(q) && (/\b(?:up to|upto|to)\s*10\b/.test(q) || /\b1\s*(?:-|to)\s*10\b/.test(q));
  if (numberRequest) {
    return {
      title: 'Let’s learn numbers 1 to 10! 🔢',
      body: 'Numbers tell us how many. Let’s say them together: 1 — one, 2 — two, 3 — three, 4 — four, 5 — five, 6 — six, 7 — seven, 8 — eight, 9 — nine, 10 — ten. Now let’s count slowly: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10! 🎉',
      checks: ['What number comes after 5?', 'What number comes before 10?', 'Can you count from 1 to 10?']
    };
  }

  const alphabetRequest = /\b(?:teach|learn|show)\b.*\b(?:a\s*[- ]?z|alphabet|letters)\b/.test(q) || /\balphabet\b/.test(q);
  if (alphabetRequest) {
    return {
      title: 'Let’s learn the alphabet! 🔤',
      body: 'The English alphabet has 26 letters. Let’s say the first few together: A, B, C, D, E. A says “ay”, B says “bee”, C says “see”. We can learn the rest step by step.',
      checks: ['Which letter comes after A?', 'Which letter comes before C?']
    };
  }

  return null;
}
