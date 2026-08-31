import { describe, expect, it } from 'vitest';
import { uniqueSubjects } from './driveTimetableStore';

describe('child timetable subject storage helpers', () => {
  it('deduplicates subjects case-insensitively and ignores blanks', () => {
    expect(uniqueSubjects([' Maths ', 'Maths', 'ENGLISH', 'english', '', '  '])).toEqual(['ENGLISH', 'Maths']);
  });

  it('keeps subject names independent of child identity', () => {
    const childA = uniqueSubjects(['Maths', 'English']);
    const childB = uniqueSubjects(['Maths', 'Science']);
    expect(childA).toEqual(['English', 'Maths']);
    expect(childB).toEqual(['Maths', 'Science']);
    expect(childA).not.toEqual(childB);
  });
});
