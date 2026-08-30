export type ParsedTimetablePeriod = { day: string; start: string; end: string; subject: string; type: 'class' | 'break' };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_WORDS = /^(break|lunch|recess|assembly|prayer|interval|free|activity)$/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;

function to24(hour: number, minute: number, meridiem?: string) {
  let h = hour;
  if (meridiem?.toLowerCase() === 'pm' && h < 12) h += 12;
  if (meridiem?.toLowerCase() === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normaliseSubject(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/[|,;]+$/, '').trim();
}

function parseLine(line: string, currentDay: string) {
  const match = line.match(TIME_RE);
  if (!match) return null;
  const startHour = Number(match[1]);
  const startMinute = Number(match[2] || 0);
  const endHour = Number(match[4]);
  const endMinute = Number(match[5] || 0);
  const start = to24(startHour, startMinute, match[3]);
  const end = to24(endHour, endMinute, match[6] || match[3]);
  const subject = normaliseSubject(line.slice(match.index! + match[0].length));
  if (!subject) return null;
  const type = BREAK_WORDS.test(subject.split(/\s+/)[0]) ? 'break' : 'class';
  return { day: currentDay, start, end, subject, type } as ParsedTimetablePeriod;
}

/**
 * Extracts timetable rows from selectable PDF text or OCR text.
 * The browser cannot reliably OCR arbitrary PDFs/images without a heavy WASM dependency;
 * this parser therefore accepts extracted text and performs deterministic timetable parsing.
 */
export function parseTimetableText(text: string): ParsedTimetablePeriod[] {
  const periods: ParsedTimetablePeriod[] = [];
  let currentDay = 'Monday';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const day = DAYS.find(d => new RegExp(`\\b${d}\\b`, 'i').test(line));
    if (day) currentDay = day;
    const parsed = parseLine(line, currentDay);
    if (parsed) periods.push(parsed);
  }
  return dedupe(periods);
}

export function parseTimetableCsv(csv: string): ParsedTimetablePeriod[] {
  const rows = csv.split(/\r?\n/).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
  if (!rows.length) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const idx = (names: string[]) => names.map(n => header.indexOf(n)).find(i => i >= 0) ?? -1;
  const dayI = idx(['day']); const startI = idx(['start', 'start time']); const endI = idx(['end', 'end time']); const subjectI = idx(['subject']);
  if (dayI < 0 || startI < 0 || endI < 0 || subjectI < 0) return [];
  return dedupe(rows.slice(1).map(row => {
    const subject = normaliseSubject(row[subjectI] || '');
    return { day: DAYS.includes(row[dayI]) ? row[dayI] : 'Monday', start: row[startI], end: row[endI], subject, type: BREAK_WORDS.test(subject) ? 'break' : 'class' };
  }).filter(p => p.subject));
}

export function extractSubjects(periods: ParsedTimetablePeriod[]) {
  return [...new Set(periods.filter(p => p.type === 'class').map(p => p.subject).filter(Boolean))];
}

function dedupe(periods: ParsedTimetablePeriod[]) {
  return periods.filter((p, i, all) => i === all.findIndex(x => x.day === p.day && x.start === p.start && x.end === p.end && x.subject === p.subject));
}
