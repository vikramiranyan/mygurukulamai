export type ParsedTimetablePeriod = { day: string; start: string; end: string; subject: string; type: 'class' | 'break' };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_WORDS = /^(break|lunch|recess|assembly|prayer|interval|free|activity)$/i;
const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
const COLUMN_SUBJECTS = ['Assembly Time','Fruit Break','English','Computer','Hindi','TK','Lunch','Drawing','EVS','Maths','Dear','Skating','Robotics','CACA','Language Lab','P.E.','Dance','Yoga','GK','Music'];

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
  if (/^language$/i.test(value)) return ['Language'];
  const matches = COLUMN_SUBJECTS.filter(subject => new RegExp(`^${subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(value));
  if (matches.length) return [matches[0]];
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
  const dayAliases: Record<string, string> = { MON: 'Monday', TUES: 'Tuesday', WED: 'Wednesday', THURS: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
  const dayIndices = lines.map((line, index) => ({ line: line.toUpperCase(), index })).filter(item => Boolean(dayAliases[item.line]));
  if (!dayIndices.length) return [];

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
    const day = dayAliases[dayIndices[d].line];
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
  const direct = dedupe(periods);
  if (direct.length) return direct;
  return dedupe(parseColumnarPdfText(text));
}

export function parseTimetableCsv(csv: string): ParsedTimetablePeriod[] {
  const rows = csv.split(/\r?\n/).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
  if (!rows.length) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const idx = (names: string[]) => names.map(n => header.indexOf(n)).find(i => i >= 0) ?? -1;
  const dayI = idx(['day']); const startI = idx(['start', 'start time']); const endI = idx(['end', 'end time']); const subjectI = idx(['subject']);
  if (dayI < 0 || startI < 0 || endI < 0 || subjectI < 0) return [];
  const parsed: ParsedTimetablePeriod[] = rows.slice(1).map(row => {
    const subject = normaliseSubject(row[subjectI] || '');
    const type: 'class' | 'break' = BREAK_WORDS.test(subject) ? 'break' : 'class';
    return { day: DAYS.includes(row[dayI]) ? row[dayI] : 'Monday', start: row[startI], end: row[endI], subject, type };
  }).filter(p => p.subject);
  return dedupe(parsed);
}

export function extractSubjects(periods: ParsedTimetablePeriod[]) {
  return [...new Set(periods.filter(p => p.type === 'class').map(p => p.subject).filter(Boolean))];
}

function dedupe(periods: ParsedTimetablePeriod[]) {
  return periods.filter((p, i, all) => i === all.findIndex(x => x.day === p.day && x.start === p.start && x.end === p.end && x.subject === p.subject));
}
