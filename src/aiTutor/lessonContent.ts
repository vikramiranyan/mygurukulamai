type LessonCheckType = 'open' | 'mcq' | 'sequence';

export type LessonContent = {
  title: string;
  objective: string;
  explanation: string;
  examples: string[];
  checks: { id: string; prompt: string; expected: string[]; type?: LessonCheckType; options?: string[] }[];
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

function meaningfulWords(text: string): string[] {
  const stopWords = new Set(['about', 'after', 'again', 'also', 'because', 'before', 'could', 'from', 'have', 'into', 'just', 'more', 'that', 'their', 'there', 'these', 'they', 'this', 'what', 'when', 'where', 'which', 'with', 'your']);
  return [...new Set(text.toLocaleLowerCase().match(/[a-z][a-z'-]{3,}/g) || [])]
    .filter(word => !stopWords.has(word))
    .slice(0, 8);
}

function splitMeaningfulSentences(text: string): string[] {
  return (text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean) || []);
}

function sentenceRole(sentence: string): number {
  const normalized = sentence.trim();
  if (!normalized) return 99;
  if (/\b(?:hi|hello|nice to meet you)\b/i.test(normalized)) return 0;
  if (/\b(?:which|what|who|when|where|why|how)\b/i.test(normalized) && /\?/.test(normalized)) return 1;
  if (/\b(?:i am|i'm|we are|my name is|this is|that is|it is|they are|he is|she is)\b/i.test(normalized)) return 2;
  if (/\b(?:same class|then)\b/i.test(normalized)) return 3;
  if (/\b(?:that\'s nice|that's nice|nice!|oh!)\b/i.test(normalized)) return 4;
  if (/\b(?:let us|let's|go to|goes to|classroom|school|come with me)\b/i.test(normalized)) return 5;
  return 6;
}

function reorderDialogueFlow(text: string): string {
  const sentences = splitMeaningfulSentences(text);
  if (sentences.length < 3) return text;

  const questionIndex = sentences.findIndex(sentence => /\b(?:which|what|who|when|where|why|how)\b/i.test(sentence) && /\?/.test(sentence));
  if (questionIndex === -1) {
    return sentences
      .map((sentence, index) => ({ sentence, index, role: sentenceRole(sentence) }))
      .sort((a, b) => a.role - b.role || a.index - b.index)
      .map(entry => entry.sentence)
      .join(' ');
  }

  const answerIndices = sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence }) => /\b(?:i am|i'm|my name is|i study in)\b/i.test(sentence))
    .map(({ index }) => index);

  const beforeQuestion = sentences.filter((_, index) => index < questionIndex);
  const questionSentence = sentences[questionIndex];
  const answerSentences = answerIndices.map(index => sentences[index]);
  const remaining = sentences
    .filter((_, index) => index > questionIndex && !answerIndices.includes(index))
    .map((sentence, index) => ({ sentence, index, role: sentenceRole(sentence) }))
    .sort((a, b) => a.role - b.role || a.index - b.index)
    .map(({ sentence }) => sentence);

  return [...beforeQuestion, questionSentence, ...answerSentences, ...remaining].join(' ');
}

function cleanTeachingText(text: string): string {
  const reordered = reorderDialogueFlow(text);
  return reordered
    .replace(/\b\d{1,2}\s*[-/]\s*\d{1,2}(?:\s*[-/]\s*\d{2,4})?\b/g, ' ')
    .replace(/[✓✔]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePrompt(text: string): string {
  return text
    .replace(/^[a-zA-Z]\s*[\)\.]\s*/g, '')
    .replace(/\b(?:i|ii|iii|iv|v|1|2|3|4|5)\s*[\)\.]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function questionStyleFromText(text: string): 'mcq' | 'sequence' | 'open' | null {
  const normalized = text.toLocaleLowerCase();
  if (/tick the correct answer|choose the correct answer|select the correct answer|for each of the following/.test(normalized)) return 'mcq';
  if (/arrange the following|sequence|order/.test(normalized)) return 'sequence';
  if (/answer the following questions|what do you|why do you|where do|who is|when do|which sentence|how do/.test(normalized)) return 'open';
  return null;
}

function extractQuestionChecks(chapterTitle: string, text: string): LessonContent['checks'] | null {
  const normalized = cleanTeachingText(text);
  const style = questionStyleFromText(normalized);
  if (!style && !/[?]/.test(normalized)) return null;

  const letterMarkers = [...normalized.matchAll(/\b([a-z])\s*[\)\.]\s*/gi)]
    .filter((match) => !['i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'].includes(match[1].toLowerCase()));
  const explicitChecks: LessonContent['checks'] = [];

  if (letterMarkers.length) {
    for (let index = 0; index < Math.min(letterMarkers.length, 8); index += 1) {
      const current = letterMarkers[index];
      const start = current.index! + current[0].length;
      const end = index + 1 < letterMarkers.length ? letterMarkers[index + 1].index! : normalized.length;
      const raw = normalized.slice(start, end).trim();
      if (!raw) continue;
      const optionMatches = [...raw.matchAll(/\b(?:i|ii|iii|iv|v|1|2|3|4|5)\s*[\)\.]\s*([^;]+?)(?=(?:\s+\b(?:i|ii|iii|iv|v|1|2|3|4|5)\s*[\)\.]|$))/gi)];
      const promptText = optionMatches.length ? raw.replace(new RegExp(optionMatches.map(item => item[0]).join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ') : raw;
      const prompt = normalizePrompt(promptText);
      if (optionMatches.length) {
        const options = optionMatches.map(item => item[1].replace(/[;.]$/g, '').trim()).filter(Boolean);
        if (options.length) {
          explicitChecks.push({
            id: `${chapterTitle.toLowerCase().replace(/\s+/g, '-')}-${explicitChecks.length + 1}`,
            prompt,
            expected: options,
            type: style === 'sequence' ? 'sequence' : 'mcq',
            options,
          });
        }
      } else if (/\?/i.test(raw) || /what|why|where|who|when|which|how|arrange|answer/.test(raw.toLowerCase())) {
        explicitChecks.push({
          id: `${chapterTitle.toLowerCase().replace(/\s+/g, '-')}-${explicitChecks.length + 1}`,
          prompt: normalizePrompt(raw),
          expected: [],
          type: 'open',
        });
      }
    }
    if (explicitChecks.length) return explicitChecks;
  }

  const directQuestions = [...normalized.matchAll(/[^.!?]+\?/g)].map((match) => match[0].trim()).filter(Boolean).slice(0, 5);
  if (directQuestions.length) {
    return directQuestions.map((question, index) => ({
      id: `${chapterTitle.toLowerCase().replace(/\s+/g, '-')}-q${index + 1}`,
      prompt: normalizePrompt(question),
      expected: [],
      type: 'open',
    }));
  }

  return null;
}

function detectChapterType(chapterTitle: string, text: string): 'family' | 'maths' | 'vocabulary' | 'grammar' | 'plants' | 'animals' | 'reading' | 'generic' {
  const title = chapterTitle.toLocaleLowerCase();
  const content = cleanTeachingText(text).toLocaleLowerCase();

  if (title.includes('family') || /(family|cuddles|cousins|grandparents|uncle|aunt|vet|home help|album)/.test(content)) return 'family';
  if (title.includes('addition') || title.includes('subtraction') || title.includes('number') || /(count|add|subtract|sum|plus|minus|multiply|divide|number)/.test(content)) return 'maths';
  if (title.includes('grammar') || /(noun|verb|adjective|sentence|punctuation|article|pronoun)/.test(content)) return 'grammar';
  if (title.includes('vocabulary') || title.includes('words to know') || /(meaning|word meaning|vocabulary|synonym|antonym)/.test(content)) return 'vocabulary';
  if (title.includes('plant') || /(leaf|root|stem|flower|seed|garden|soil|plant)/.test(content)) return 'plants';
  if (title.includes('animal') || /(animal|bird|fish|pet|mammal|reptile|insect|tiger|lion|elephant)/.test(content)) return 'animals';
  if (title.includes('reading') || /(what do you see|why do you think|wonder about|hello! i am)/.test(content)) return 'reading';
  return 'generic';
}

function createFamilyLesson(chapterTitle: string, text: string): LessonContent {
  const cleaned = cleanTeachingText(text);
  const explanation = /family|cuddles|cousins|vet|home help|album/i.test(cleaned) || /family/i.test(chapterTitle)
    ? 'Look at the family picture and talk about the people you see. Family means the people who love, care for and help one another. Kiki is excited to show her family photos because she is proud of her family and wants to share them with her class.'
    : `Let's explore ${chapterTitle} step by step using the uploaded chapter pages.`;

  return {
    title: chapterTitle,
    objective: 'Learn about family, love, and the important people who help us every day.',
    explanation,
    examples: [
      'Look at the picture and tell me who is in the family.',
      'Cuddles means hugs.',
      'Cousins are children of uncles and aunts.',
      'A vet is a doctor for animals.',
      'A home help is a person who helps the family with household work.'
    ],
    checks: [
      { id: `${chapterTitle}-picture`, prompt: 'What do you see in the family picture?', expected: ['family', 'parents', 'grandparents', 'children', 'cousins'] },
      { id: `${chapterTitle}-vocabulary`, prompt: 'What does cuddles mean?', expected: ['hugs'] },
      { id: `${chapterTitle}-vet`, prompt: 'What is a vet?', expected: ['doctor for animals', 'animal doctor'] },
    ],
  };
}

function createMathsLesson(chapterTitle: string, text: string): LessonContent {
  return {
    title: chapterTitle,
    objective: `Understand the key idea in ${chapterTitle} with simple counting and examples.`,
    explanation: `In ${chapterTitle}, we use numbers to count, compare, and solve small problems. Look carefully at the numbers and count one by one.`,
    examples: ['Count the objects slowly.', '5 is bigger than 3.', '2 is smaller than 7.'],
    checks: [
      { id: `${chapterTitle}-count`, prompt: 'Can you count the numbers in order?', expected: ['1', '2', '3', '4', '5'] },
      { id: `${chapterTitle}-compare`, prompt: 'Which is bigger: 5 or 3?', expected: ['5'] },
    ],
  };
}

function createVocabularyLesson(chapterTitle: string, text: string): LessonContent {
  const cleaned = cleanTeachingText(text);
  const words = meaningfulWords(cleaned);
  return {
    title: chapterTitle,
    objective: `Learn the meaning of new words in ${chapterTitle}.`,
    explanation: `Words can have meanings that help us understand the lesson. We look at the picture, the sentence, and the word together before we explain it.`,
    examples: words.length ? words.map(word => `${word} is an important word in this chapter.`) : ['Look at the key words and explain them in simple language.'],
    checks: [
      { id: `${chapterTitle}-word`, prompt: 'Tell me one important word from this chapter.', expected: words.length ? words : ['word'] },
      { id: `${chapterTitle}-meaning`, prompt: 'What does this word mean in simple language?', expected: ['means', 'is'] },
    ],
  };
}

function createGrammarLesson(chapterTitle: string, text: string): LessonContent {
  return {
    title: chapterTitle,
    objective: `Understand the grammar idea in ${chapterTitle} with simple examples.`,
    explanation: `Grammar teaches us how words work together in a sentence. We look at the rules and then use the words correctly in a sentence.`,
    examples: ['A sentence begins with a capital letter.', 'A noun names a person, place, or thing.', 'A verb tells action.'],
    checks: [
      { id: `${chapterTitle}-sentence`, prompt: 'What is a sentence?', expected: ['a group of words', 'words that make sense'] },
      { id: `${chapterTitle}-noun`, prompt: 'What is a noun?', expected: ['person', 'place', 'thing'] },
    ],
  };
}

function createPlantOrAnimalLesson(chapterTitle: string, text: string, topic: 'plants' | 'animals'): LessonContent {
  const topicLabel = topic === 'plants' ? 'plants' : 'animals';
  return {
    title: chapterTitle,
    objective: `Learn about ${topicLabel} in ${chapterTitle} and notice what makes them special.`,
    explanation: `Look closely at the picture and observe the important parts or features. The lesson helps us understand what ${topicLabel} need, look like, or do.`,
    examples: topic === 'plants'
      ? ['Roots hold the plant in the soil.', 'Leaves help the plant make food.', 'Flowers help the plant grow new seeds.']
      : ['Animals need food, water, and shelter.', 'Some animals live on land and some live in water.', 'Animals can move, eat, and grow.'],
    checks: [
      { id: `${chapterTitle}-observe`, prompt: `What do you notice in the ${topicLabel} picture?`, expected: [topicLabel, 'parts', 'features'] },
      { id: `${chapterTitle}-need`, prompt: `What do ${topicLabel} need to stay alive?`, expected: topic === 'plants' ? ['water', 'sunlight', 'soil'] : ['food', 'water', 'shelter'] },
    ],
  };
}

function createReadingLesson(chapterTitle: string, text: string): LessonContent {
  const cleaned = cleanTeachingText(text);
  return {
    title: chapterTitle,
    objective: 'Read the page carefully, look at the picture, and explain the idea in simple words.',
    explanation: 'First, look at the picture. Then read the sentence slowly. Ask: What do you see? Why do you think this is happening? What do you wonder?',
    examples: ['What do you see in the picture?', 'Why do you think this is happening?', 'What do you wonder about it?'],
    checks: [
      { id: `${chapterTitle}-see`, prompt: 'What do you see in the picture?', expected: ['people', 'family', 'scene', 'picture'] },
      { id: `${chapterTitle}-wonder`, prompt: 'What do you wonder about this page?', expected: ['why', 'how', 'what'] },
    ],
  };
}

export function createLessonFromChapterText(chapterTitle: string, text: string): LessonContent {
  const questionChecks = extractQuestionChecks(chapterTitle, text);
  if (questionChecks && questionChecks.length) {
    const cleaned = cleanTeachingText(text);
    const explanation = cleaned.slice(0, 600) || `Let's explore ${chapterTitle} by looking at the question and understanding the idea before answering.`;
    return {
      title: chapterTitle,
      objective: `Understand the question type and answer the activity in ${chapterTitle} correctly.`,
      explanation,
      examples: questionChecks.slice(0, 3).map(check => check.prompt),
      checks: questionChecks,
    };
  }

  const chapterType = detectChapterType(chapterTitle, text);

  switch (chapterType) {
    case 'family':
      return createFamilyLesson(chapterTitle, text);
    case 'maths':
      return createMathsLesson(chapterTitle, text);
    case 'vocabulary':
      return createVocabularyLesson(chapterTitle, text);
    case 'grammar':
      return createGrammarLesson(chapterTitle, text);
    case 'plants':
      return createPlantOrAnimalLesson(chapterTitle, text, 'plants');
    case 'animals':
      return createPlantOrAnimalLesson(chapterTitle, text, 'animals');
    case 'reading':
      return createReadingLesson(chapterTitle, text);
    default: {
      const cleaned = cleanTeachingText(text);
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g)?.map(sentence => sentence.trim()).filter(Boolean) || [];
      const explanation = (sentences.slice(0, 2).join(' ') || cleaned).slice(0, 1200);
      const examples = (sentences.length > 2 ? sentences.slice(2, 5) : sentences.slice(0, 3)).map(sentence => sentence.slice(0, 300));
      const words = meaningfulWords(cleaned);
      return {
        title: chapterTitle,
        objective: `Understand the main ideas in ${chapterTitle} using the uploaded chapter pages.`,
        explanation: explanation || `Let's explore ${chapterTitle} step by step using the uploaded chapter pages.`,
        examples: examples.length ? examples : [`Read one part of ${chapterTitle} and explain it in your own words.`],
        checks: [
          { id: `${chapterTitle}-understanding`, prompt: `In your own words, what is one important thing you learned from ${chapterTitle}?`, expected: [] },
          { id: `${chapterTitle}-vocabulary`, prompt: `Name one important word from the ${chapterTitle} chapter.`, expected: words },
        ],
      };
    }
  }
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expectedMatch(answer: string, expected: string): boolean {
  const target = normalizeAnswer(expected);
  if (!target) return false;
  if (answer === target) return true;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'u').test(answer);
}

export function gradeAnswer(input: string, expected: string[]): boolean {
  const answer = normalizeAnswer(input);
  if (!answer) return false;
  if (!expected.length) return answer.replace(/[^\p{L}\p{N}]/gu, '').length >= 3;
  return expected.some(value => expectedMatch(answer, value));
}
