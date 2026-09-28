import { describe, expect, it } from 'vitest';
import { createLessonFromChapterText, gradeAnswer } from './lessonContent';

describe('gradeAnswer', () => {
  it('rejects blank answers', () => {
    expect(gradeAnswer('', ['ball'])).toBe(false);
    expect(gradeAnswer('   ', ['ball'])).toBe(false);
  });

  describe('createLessonFromChapterText', () => {
    it('builds a lesson from uploaded chapter text instead of generic content', () => {
      const lesson = createLessonFromChapterText('My Family', 'A family cares for one another. Family members help each other. We learn together.');
      expect(lesson.objective).toContain('family');
      expect(lesson.explanation).toContain('family');
      expect(lesson.examples).toContain('Look at the picture and tell me who is in the family.');
      expect(lesson.checks[0].prompt).toContain('family picture');
      expect(lesson.checks[1].expected).toContain('hugs');
    });

    it('removes date-like notes and teaches the picture meanings for family vocabulary', () => {
      const lesson = createLessonFromChapterText('My Family', '1 U Tuning In My Family 8-04-2026 Hello! I am Kiki. cuddles cousins vet home help.');
      expect(lesson.explanation).not.toContain('8-04');
      expect(lesson.explanation).toContain('family picture');
      expect(lesson.examples).toContain('Cuddles means hugs.');
      expect(lesson.examples).toContain('A vet is a doctor for animals.');
    });

    it('reorders dialogue into a natural conversation flow before teaching', () => {
      const lesson = createLessonFromChapterText('English Conversation', 'Nice to meet you too! Which class are you in? Oh! We are in the same class then. That\'s nice! Let us go to the classroom. I am in class 1.');
      const explanation = lesson.explanation;
      const questionIndex = explanation.indexOf('Which class are you in?');
      const answerIndex = explanation.indexOf('I am in class 1');
      const sameClassIndex = explanation.indexOf('We are in the same class then');
      expect(questionIndex).toBeGreaterThan(-1);
      expect(answerIndex).toBeGreaterThan(questionIndex);
      expect(sameClassIndex).toBeGreaterThan(answerIndex);
    });

    it('switches to a maths teaching flow for number-based chapters', () => {
      const lesson = createLessonFromChapterText('Addition', 'Count 1, 2, 3. Add 2 and 3. The sum is 5.');
      expect(lesson.objective).toContain('Addition');
      expect(lesson.explanation).toContain('count');
      expect(lesson.examples).toContain('5 is bigger than 3.');
    });

    it('recognises question-and-answer pages and keeps the question type separate from the answer choices', () => {
      const lesson = createLessonFromChapterText('Comprehension', 'For each of the following, tick the correct answer. a) Kiki\'s mother is a policewoman. i. lawyer ii. policewoman b) Kiki introduces Zeenat. i. at the end ii. at the beginning');
      expect(lesson.checks[0].type).toBe('mcq');
      expect(lesson.checks[0].prompt).toContain("Kiki's mother is a policewoman");
      expect(lesson.checks[0].options).toEqual(expect.arrayContaining(['lawyer', 'policewoman']));
      expect(lesson.checks[1].type).toBe('mcq');
    });
  });

  it('matches an expected word without substring false positives', () => {
    expect(gradeAnswer('ball', ['ball'])).toBe(true);
    expect(gradeAnswer('I choose ball', ['ball'])).toBe(true);
    expect(gradeAnswer('balloon', ['ball'])).toBe(false);
    expect(gradeAnswer('not ball', ['ball'])).toBe(true);
  });

  it('treats numeric answers as tokens instead of substrings', () => {
    expect(gradeAnswer('5', ['5'])).toBe(true);
    expect(gradeAnswer('The answer is 5.', ['5'])).toBe(true);
    expect(gradeAnswer('15', ['5'])).toBe(false);
  });

  it('supports multi-word expected answers', () => {
    expect(gradeAnswer('The answer is New Delhi', ['new delhi'])).toBe(true);
    expect(gradeAnswer('New Delhi is correct', ['new delhi'])).toBe(true);
    expect(gradeAnswer('New Delhian', ['new delhi'])).toBe(false);
  });

  it('keeps free-response checks permissive but requires meaningful content', () => {
    expect(gradeAnswer('I learned', [])).toBe(true);
    expect(gradeAnswer('ab', [])).toBe(false);
    expect(gradeAnswer('...', [])).toBe(false);
  });
});
