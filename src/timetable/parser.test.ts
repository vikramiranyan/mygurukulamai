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

  it('parses columnar PDF text where the time header and row cells are extracted separately', () => {
    const text = [
      '8:00-8:15 am 8:15-8:25 am 8:25-9:00 am 9:00-9:35 am 9:35-10:10 am 10:10-10:45 am 10:45-11:05 am 11:05-11:45 am 11:45-12:25 pm 12:25-1:05 pm 1:05-1:45 pm',
      'DAYS', 'MON',
      'Assembly Time Fruit Break', 'ENGLISH', '(Course Book)', 'COMPUTER', 'HINDI', '(Notebook)', 'TK', 'LUNCH', 'DRAWING', 'EVS', '(Notebook)', 'MATHS', '(Course Book)', 'DEAR',
      'TUES',
      'Assembly Time Fruit Break', 'ENGLISH', '(Notebook)', 'COMPUTER', 'HINDI', '(Course Book)', 'SKATING LUNCH', 'EVS', '(Course Book)', 'EVS', 'MATHS', '(Notebook) DEAR'
    ].join('\n');

    const periods = parseTimetableText(text);
    expect(periods.length).toBeGreaterThanOrEqual(22);
    expect(periods).toContainEqual(expect.objectContaining({ day: 'Monday', start: '08:25', end: '09:00', subject: 'English' }));
    expect(periods).toContainEqual(expect.objectContaining({ day: 'Monday', start: '10:45', end: '11:05', subject: 'Lunch', type: 'break' }));
    expect(periods).toContainEqual(expect.objectContaining({ day: 'Tuesday', start: '10:10', end: '10:45', subject: 'Skating' }));
    expect(periods).toContainEqual(expect.objectContaining({ day: 'Tuesday', start: '10:45', end: '11:05', subject: 'Lunch', type: 'break' }));
  });
});
