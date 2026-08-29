import { describe, expect, it } from 'vitest';
import { extractSubjects, parseTimetableText } from './parser';

describe('timetable parser', () => {
  it('parses day, times and subjects from extracted document text', () => {
    const periods = parseTimetableText('Monday\n08:00-08:40 Maths\n08:40-09:20 English\nTuesday\n09:20 to 10:00 Science');
    expect(periods).toHaveLength(3);
    expect(periods[0]).toMatchObject({ day: 'Monday', start: '08:00', end: '08:40', subject: 'Maths' });
    expect(periods[2]).toMatchObject({ day: 'Tuesday', start: '09:20', end: '10:00', subject: 'Science' });
  });
  it('extracts unique class subjects and ignores breaks', () => {
    const periods = parseTimetableText('Monday\n08:00-08:40 Maths\n08:40-09:00 Break\n09:00-09:40 Maths');
    expect(extractSubjects(periods)).toEqual(['Maths']);
  });
});
