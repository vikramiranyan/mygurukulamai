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

  it('parses a PDF extractor that flattens the whole timetable onto one line', () => {
    const text = [
      'IA1 8:00-8:15 am 8:15-8:25 am 8:25-9:00 am 9:00-9:35 am 9:35-10:10 am 10:10-10:45 am 10:45-11:05 11:05-11:45 am 11:45-12:25 pm 12:25-1:05 pm 1:05-1:45 pm DAYS MS SIMRAN MS SIMRAN I II III IV V VI VII DEAR/D L/ DISPERSAL',
      'MON Assembly Time Fruit Break ENGLISH (Course Book) COMPUTER HINDI (Notebook) TK LUNCH DRAWING EVS (Notebook) MATHS (Course Book) DEAR',
      'TUES Assembly Time Fruit Break ENGLISH (Notebook) COMPUTER HINDI (Course Book) SKATING LUNCH EVS (Course Book) EVS MATHS (Notebook) DEAR',
      'WED Assembly Time Fruit Break ENGLISH (Course Book) ROBOTICS HINDI (Notebook) CACA LUNCH MATHS (Course Book) EVS (Notebook) MATHS DEAR',
      'THURS Assembly Time Fruit Break ENGLISH (Notebook) LANGUAGE LAB HINDI (Course Book) P.E. LUNCH DANCE EVS (Course Book) MATHS (Notebook) DEAR',
      'FRI Assembly Time Fruit Break ENGLISH (Course Book) YOGA HINDI (Notebook) GK LUNCH ENGLISH (Course Book) EVS (Notebook) MATHS (Course Book) DEAR',
      'SAT Assembly Time Fruit Break ENGLISH (Workbook) DRAWING HINDI (Workbook) HINDI (Workbook) LUNCH MUSIC EVS (Workbook) MATHS (Wise time) DEAR',
    ].join(' ');
    const periods = parseTimetableText(text);
    const subjects = extractSubjects(periods).sort();
    expect(periods).toHaveLength(66);
    expect(subjects).toEqual(['CACA', 'Computer', 'DEAR', 'Dance', 'Drawing', 'EVS', 'English', 'GK', 'Hindi', 'Language Lab', 'Maths', 'Music', 'P.E.', 'Robotics', 'Skating', 'TK', 'Yoga']);
    expect(subjects).not.toContain('Assembly Time');
    expect(subjects).not.toContain('Fruit Break');
    expect(subjects).not.toContain('Lunch');
    expect(periods).toContainEqual(expect.objectContaining({ day: 'Thursday', start: '09:00', end: '09:35', subject: 'Language Lab' }));
  });
});
