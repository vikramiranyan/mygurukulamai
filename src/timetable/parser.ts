export type ParsedTimetablePeriod = { day: string; start: string; end: string; subject: string; type: 'class' | 'break' };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_WORDS = /^(break|lunch|recess|assembly|prayer|interval|free|activity)$/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const COLUMN_SUBJECTS = ['Assembly Time', 'Fruit Break', 'Language Lab', 'English', 'Computer', 'Hindi', 'TK', 'Lunch', 'Drawing', 'EVS', 'Maths', 'Dear', 'Skating', 'Robotics', 'CACA', 'P.E.', 'Dance', 'Yoga', 'GK', 'Music'];
const DAY_ALIASES: Record<string, string> = { MON: 'Monday', TUES: 'Tuesday', WED: 'Wednesday', THURS: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

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
  if (!subject || TIME_RE.test(subject)) return null;
  const type: 'class' | 'break' = BREAK_WORDS.test(subject.split(/\s+/)[0]) ? 'break' : 'class';
  return { day: currentDay, start, end, subject, type };
}

function normaliseBrokenPdfTimes(text: string) {
  return text.replace(/(\d{1,2}:\d{1,2})\s+(\d)\s+(am|pm)\b/gi, '$1$2 $3');
}

function splitColumnCell(raw: string): string[] {
  let value = raw.trim();
  if (!value) return [];
  value = value.replace(/\([^)]*\)/g, ' ');
  value = value.replace(/\([^\n]*$/g, ' ');
  value = value.replace(/^(?:Course|Notebook|Workbook|Wise time)\b.*$/i, '');
  value = normaliseSubject(value);
  if (!value) return [];
  if (/^assembly time fruit break$/i.test(value)) return ['Assembly Time', 'Fruit Break'];
  if (/^skating lunch$/i.test(value)) return ['Skating', 'Lunch'];
  if (/^language\s+lab$/i.test(value)) return ['Language Lab'];
  const exact = COLUMN_SUBJECTS.find(subject => subject.toLowerCase() === value.toLowerCase());
  if (exact) return [exact];
  const sorted = [...COLUMN_SUBJECTS].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  let rest = value;
  while (rest) {
    const subject = sorted.find(candidate => rest.toLowerCase().startsWith(candidate.toLowerCase()) && (rest.length === candidate.length || /\s/.test(rest[candidate.length])));
    if (!subject) return [value];
    result.push(subject);
    rest = rest.slice(subject.length).trim();
  }
  return result;
}

function parseColumnarPdfText(text: string): ParsedTimetablePeriod[] {
  const normalised = normaliseBrokenPdfTimes(text);
  const timeMatches = [...normalised.matchAll(/\b(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(am|pm)?\b/gi)];
  const timeRanges = timeMatches.slice(0, 11).map(match => ({ start: match[1], end: match[2], meridiem: match[3] }));
  if (timeRanges.length < 6) return [];
  const lines = normalised.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const dayIndices = lines.map((line, index) => ({ line: line.toUpperCase(), index })).filter(item => Boolean(DAY_ALIASES[item.line]));
  if (!dayIndices.length) return [];
  return parseDayBlocks(lines, dayIndices, timeRanges);
}

function parseFlatColumnarPdfText(text: string): ParsedTimetablePeriod[] {
  const normalised = normaliseBrokenPdfTimes(text).replace(/\s+/g, ' ').trim();
  const timeMatches = [...normalised.matchAll(/\b(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(am|pm)?\b/gi)];
  const timeRanges = timeMatches.slice(0, 11).map(match => ({ start: match[1], end: match[2], meridiem: match[3] }));
  if (timeRanges.length < 6) return [];

  const dayPattern = /\b(MON|TUES|WED|THURS|FRI|SAT)\b/gi;
  const matches = [...normalised.matchAll(dayPattern)];
  if (!matches.length) return [];

  const periods: ParsedTimetablePeriod[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const day = DAY_ALIASES[matches[i][1].toUpperCase()];
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : normalised.length;
    const block = normalised.slice(start, end).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    const cells = extractFlatCells(block);
    if (cells.length !== timeRanges.length) continue;
    cells.forEach((subject, index) => {
      const range = timeRanges[index];
      const startTime = to24(Number(range.start.split(':')[0]), Number(range.start.split(':')[1]), range.meridiem);
      const endTime = to24(Number(range.end.split(':')[0]), Number(range.end.split(':')[1]), range.meridiem);
      const type: 'class' | 'break' = BREAK_WORDS.test(subject.split(/\s+/)[0]) ? 'break' : 'class';
      periods.push({ day, start: startTime, end: endTime, subject, type });
    });
  }
  return periods;
}

function extractFlatCells(block: string): string[] {
  const sorted = [...COLUMN_SUBJECTS].sort((a, b) => b.length - a.length);
  const cells: string[] = [];
  let cursor = 0;
  while (cursor < block.length) {
    const remaining = block.slice(cursor);
    const match = sorted.find(subject => new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'i').test(remaining));
    if (!match) {
      cursor += 1;
      continue;
    }
    cells.push(match);
    cursor += match.length;
    while (/\s/.test(block[cursor] || '')) cursor += 1;
  }
  return cells;
}

function parseDayBlocks(lines: string[], dayIndices: Array<{ line: string; index: number }>, timeRanges: Array<{ start: string; end: string; meridiem?: string }>): ParsedTimetablePeriod[] {
  const periods: ParsedTimetablePeriod[] = [];
  for (let d = 0; d < dayIndices.length; d += 1) {
    const startIndex = dayIndices[d].index + 1;
    const endIndex = d + 1 < dayIndices.length ? dayIndices[d + 1].index : lines.length;
    const cells: string[] = [];
    let pendingLanguage = false;
    for (const raw of lines.slice(startIndex, endIndex)) {
      if (/^(Course|Book\)|Notebook\)?|Workbook\)?|Wise time\)?)$/i.test(raw)) continue;
      if (/^Language$/i.test(raw)) { pendingLanguage = true; continue; }
      if (pendingLanguage && /^Lab$/i.test(raw)) { cells.push('Language Lab'); pendingLanguage = false; continue; }
      pendingLanguage = false;
      cells.push(...splitColumnCell(raw));
    }
    if (cells.length !== timeRanges.length) continue;
    const day = DAY_ALIASES[dayIndices[d].line];
    cells.forEach((subject, index) => {
      const range = timeRanges[index];
      const start = to24(Number(range.start.split(':')[0]), Number(range.start.split(':')[1]), range.meridiem);
      const end = to24(Number(range.end.split(':')[0]), Number(range.end.split(':')[1]), range.meridiem);
      const type: 'class' | 'break' = BREAK_WORDS.test(subject.split(/\s+/)[0]) ? 'break' : 'class';
      periods.push({ day, start, end, subject, type });
    });
  }
  return periods;
}

export function parseTimetableText(text: string): ParsedTimetablePeriod[] {
  const normalised = normaliseBrokenPdfTimes(text);
  const columnarHint = (normalised.match(/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/g) || []).length >= 6 && /\b(?:MON|TUES|WED|THURS|FRI|SAT)\b/i.test(normalised);
  if (columnarHint) {
    const columnar = dedupe(parseColumnarPdfText(normalised));
    if (columnar.length) return columnar;
    const flatColumnar = dedupe(parseFlatColumnarPdfText(normalised));
    if (flatColumnar.length) return flatColumnar;
  }
  const periods: ParsedTimetablePeriod[] = [];
  let currentDay = 'Monday';
  for (const raw of normalised.split(/\r?\n/)) {
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
  const parsed: ParsedTimetablePeriod[] = rows.slice(1).map(row => { const subject = normaliseSubject(row[subjectI] || ''); const type: 'class' | 'break' = BREAK_WORDS.test(subject) ? 'break' : 'class'; return { day: DAYS.includes(row[dayI]) ? row[dayI] : 'Monday', start: row[startI], end: row[endI], subject, type }; }).filter(p => p.subject);
  return dedupe(parsed);
}

export function extractSubjects(periods: ParsedTimetablePeriod[]) {
  return [...new Set(periods.filter(p => p.type === 'class').map(p => p.subject).filter(Boolean))];
}

function dedupe(periods: ParsedTimetablePeriod[]) {
  return periods.filter((p, i, all) => i === all.findIndex(x => x.day === p.day && x.start === p.start && x.end === p.end && x.subject === p.subject));
}
