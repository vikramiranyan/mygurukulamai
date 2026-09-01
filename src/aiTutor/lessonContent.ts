export type LessonContent = {
  title: string;
  objective: string;
  explanation: string;
  examples: string[];
  checks: { id: string; prompt: string; expected: string[] }[];
};

const CONTENT: Record<string, LessonContent> = {
  'eng-01': { title: 'Sounds & Letters', objective: 'Recognise common letter sounds.', explanation: 'Letters represent sounds. We can say a letter sound and listen for it at the beginning of a word.', examples: ['B says /b/ as in ball.', 'M says /m/ as in moon.'], checks: [{ id: 'eng-01-1', prompt: 'Which word starts with the /b/ sound: ball or moon?', expected: ['ball'] }, { id: 'eng-01-2', prompt: 'Which letter starts the word moon: M or B?', expected: ['m'] }] },
  'mat-01': { title: 'Numbers', objective: 'Read and compare small whole numbers.', explanation: 'Numbers tell us how many. When comparing two numbers, the larger number represents a greater amount.', examples: ['5 is greater than 3.', '2 is less than 7.'], checks: [{ id: 'mat-01-1', prompt: 'Which is greater: 5 or 3?', expected: ['5'] }, { id: 'mat-01-2', prompt: 'Which is less: 2 or 7?', expected: ['2'] }] },
  'com-01': { title: 'Computer Basics', objective: 'Identify what a computer helps us do.', explanation: 'A computer is an electronic machine that can receive information, process it and help us create or find things.', examples: ['We can use a computer to write.', 'We can use a computer to learn.'], checks: [{ id: 'com-01-1', prompt: 'Name one thing you can do with a computer.', expected: ['write', 'learn'] }] },
  'evs-01': { title: 'My Family', objective: 'Understand that families care for and support one another.', explanation: 'A family is a group of people who care for and support one another. Families can look different, and every family deserves respect.', examples: ['Family members can help one another.', 'Families can spend time learning and playing together.'], checks: [{ id: 'evs-01-1', prompt: 'What is one way family members can help one another?', expected: ['help', 'care', 'support'] }] },
  'hin-01': { title: 'वर्णमाला', objective: 'Recognise Hindi letters.', explanation: 'हिंदी वर्णमाला में अलग-अलग अक्षर होते हैं। अक्षरों को पहचानकर हम शब्द पढ़ना और लिखना सीखते हैं।', examples: ['अ is a Hindi vowel.', 'क is a Hindi consonant.'], checks: [{ id: 'hin-01-1', prompt: 'Which is a Hindi letter: अ or B?', expected: ['अ'] }] },
  'gk-01': { title: 'My World', objective: 'Notice people and places around us.', explanation: 'Our world includes the people, places, plants, animals and objects around us. We can learn by observing and asking questions.', examples: ['A school is a place for learning.', 'A park is a place where people can play and enjoy nature.'], checks: [{ id: 'gk-01-1', prompt: 'Which is usually a place for learning: school or river?', expected: ['school'] }] }
};

export function getLessonContent(chapterId: string, chapterTitle: string): LessonContent {
  return CONTENT[chapterId] ?? {
    title: chapterTitle,
    objective: `Build understanding of ${chapterTitle}.`,
    explanation: `Let's explore ${chapterTitle} step by step, using simple examples and questions.`,
    examples: [`Think about something you already know about ${chapterTitle}.`],
    checks: [{ id: `${chapterId}-1`, prompt: `Tell your teacher one thing you learned about ${chapterTitle}.`, expected: [] }]
  };
}

export function gradeAnswer(input: string, expected: string[]): boolean {
  const answer = input.trim().toLocaleLowerCase();
  if (!answer) return false;
  if (!expected.length) return answer.length >= 3;
  return expected.some(value => answer === value.toLocaleLowerCase() || answer.includes(value.toLocaleLowerCase()));
}
