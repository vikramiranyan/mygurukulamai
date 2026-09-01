import React, { useEffect, useMemo, useState } from 'react';
import { getDocument as getPdfDocument } from './timetable/pdfjsClient';
import { extractSubjects, parseTimetableText, type ParsedTimetablePeriod } from './timetable/parser';
import type { Child } from './types/parent';
import type { DriveSyncController } from './storage/driveSync';
import type { ChildTimetableRecord } from './storage/driveTimetableStore';
import { uniqueSubjects } from './storage/driveTimetableStore';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type TimetableDraft = { fileName: string; fileMimeType: string; fileSize: number; periods: ParsedTimetablePeriod[]; subjects: string[] };

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getPdfDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => String(item.str ?? '')).join('').replace(/[ \t]+/g, ' ').trim();
    if (pageText) pages.push(pageText);
  }
  const text = pages.join('\n');
  if (!text.trim()) throw new Error('The PDF contains no readable text.');
  return text;
}

async function extractImageText(file: File): Promise<string> {
  const mod = await import('tesseract.js');
  const result = await mod.recognize(file, 'eng');
  return result.data.text;
}

function normalize(value: string): string { return value.trim().replace(/\s+/g, ' '); }
function diffSubjects(previous: string[], next: string[]) {
  const oldMap = new Map(previous.map(s => [normalize(s).toLocaleLowerCase(), normalize(s)]));
  const newMap = new Map(next.map(s => [normalize(s).toLocaleLowerCase(), normalize(s)]));
  return { added: [...newMap.values()].filter(s => !oldMap.has(s.toLocaleLowerCase())), removed: [...oldMap.values()].filter(s => !newMap.has(s.toLocaleLowerCase())) };
}

export function ParentTimetableSubjects({ children, active, setActive, driveSync }: { children: Child[]; active: string; setActive: (id: string) => void; driveSync: DriveSyncController }) {
  const child = children.find(c => c.id === active) || children[0];
  const [record, setRecord] = useState<ChildTimetableRecord | null>(null);
  const [draft, setDraft] = useState<TimetableDraft | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [subjectEdit, setSubjectEdit] = useState<string | null>(null);
  const [subjectValue, setSubjectValue] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    let cancelled = false;
    setDraft(null); setRecord(null); setNotice('');
    if (!child) return;
    void driveSync.loadTimetable(child.id).then(value => { if (!cancelled) setRecord(value); }).catch(error => { if (!cancelled) setNotice(error instanceof Error ? error.message : 'Could not load this child\'s timetable.'); });
    return () => { cancelled = true; };
  }, [child?.id, driveSync]);

  const currentPeriods = draft?.periods ?? record?.periods ?? [];
  const currentSubjects = useMemo(() => uniqueSubjects(draft?.subjects ?? record?.subjects ?? extractSubjects(currentPeriods)), [draft, record, currentPeriods]);
  if (!child) return <section className="parent-section"><div className="coming-section panel"><div className="coming-icon">📅</div><h2>Add a child first</h2><p>TimeTable / Subjects is available after a child has been added.</p></div></section>;

  const updatePeriod = (index: number, key: keyof ParsedTimetablePeriod, value: string) => {
    const periods = currentPeriods.map((period, i) => i === index ? { ...period, [key]: value } : period);
    const subjects = uniqueSubjects(extractSubjects(periods));
    setDraft({ fileName: draft?.fileName || record?.fileName || 'edited timetable', fileMimeType: draft?.fileMimeType || record?.fileMimeType || 'application/json', fileSize: draft?.fileSize || record?.fileSize || 0, periods, subjects });
  };

  const saveDraft = async () => {
    if (!draft || !draft.periods.length) { setNotice('Add or correct at least one timetable period before confirming.'); return; }
    if (draft.periods.some(p => !normalize(p.subject))) { setNotice('Every timetable period must have a subject before confirmation.'); return; }
    const subjects = uniqueSubjects([...draft.subjects, ...extractSubjects(draft.periods)]);
    if (!subjects.length) { setNotice('No subjects could be identified. Please correct the timetable or add subjects manually.'); return; }
    setBusy(true); setNotice('Saving timetable and subjects…');
    try {
      const previous = record?.subjects || [];
      const changes = diffSubjects(previous, subjects);
      const now = new Date().toISOString();
      const next: ChildTimetableRecord = { version: 1, childId: child.id, fileName: draft.fileName, fileMimeType: draft.fileMimeType, fileSize: draft.fileSize, originalDriveFileId: record?.originalDriveFileId, uploadedAt: record?.uploadedAt || now, status: 'confirmed', periods: draft.periods, subjects, audit: [...(record?.audit || []), { action: 'upload', at: now }, { action: 'confirm', at: now }] };
      await driveSync.saveTimetable(next); setRecord(next); setDraft(null);
      const summary = [changes.added.length ? `New: ${changes.added.join(', ')}` : '', changes.removed.length ? `Removed: ${changes.removed.join(', ')}` : ''].filter(Boolean).join(' · ');
      setNotice(summary ? `Timetable confirmed for ${child.name}. ${summary}` : `Timetable confirmed for ${child.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Timetable could not be saved.'); } finally { setBusy(false); }
  };

  const processFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { setNotice('Please upload a PDF, JPG, JPEG or PNG timetable.'); return; }
    if (file.size > MAX_FILE_SIZE) { setNotice('Timetable file is too large. Maximum allowed size is 10 MB.'); return; }
    setBusy(true); setNotice('Reading timetable…');
    try {
      const text = file.name.toLowerCase().endsWith('.pdf') ? await extractPdfText(file) : await extractImageText(file);
      const periods = parseTimetableText(text);
      if (!periods.length) { setNotice('The timetable could not be confidently read. Please upload a clearer file.'); return; }
      const subjects = uniqueSubjects(extractSubjects(periods));
      setDraft({ fileName: file.name, fileMimeType: file.type || 'application/octet-stream', fileSize: file.size, periods, subjects });
      const changes = diffSubjects(record?.subjects || [], subjects);
      const summary = [changes.added.length ? `new: ${changes.added.join(', ')}` : '', changes.removed.length ? `removed: ${changes.removed.join(', ')}` : ''].filter(Boolean).join(' · ');
      setNotice(`Timetable read successfully. ${periods.length} period${periods.length === 1 ? '' : 's'} detected.${summary ? ` Review changes (${summary}).` : ' Review before confirming.'}`);
    } catch (error) { console.error('Timetable processing error:', error); setNotice(`Timetable reading failed: ${error instanceof Error ? error.message : 'unknown PDF/image processing error'}`); }
    finally { setBusy(false); }
  };

  const persistManualSubjects = async (subjects: string[], audit: Record<string, unknown>) => {
    const now = new Date().toISOString();
    const next: ChildTimetableRecord = {
      version: 1, childId: child.id, fileName: record?.fileName || 'manual-subjects', fileMimeType: record?.fileMimeType || 'application/json', fileSize: record?.fileSize || 0,
      originalDriveFileId: record?.originalDriveFileId, uploadedAt: record?.uploadedAt || now, status: 'confirmed', periods: currentPeriods, subjects,
      audit: [...(record?.audit || []), { ...audit, at: now }]
    };
    const saved = await driveSync.saveTimetable(next); setRecord(saved); return saved;
  };

  const addSubject = async () => {
    const value = normalize(newSubject);
    if (!value) { setNotice('Subject name cannot be blank.'); return; }
    if (currentSubjects.some(s => s.toLocaleLowerCase() === value.toLocaleLowerCase())) { setNotice('That subject already exists for this child.'); return; }
    const nextSubjects = uniqueSubjects([...currentSubjects, value]); setBusy(true);
    try {
      if (draft) setDraft({ ...draft, subjects: nextSubjects });
      else await persistManualSubjects(nextSubjects, { action: 'add_subject', subject: value });
      setNewSubject(''); setNotice(`Subject “${value}” added for ${child.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be added.'); } finally { setBusy(false); }
  };

  const modifySubject = async () => {
    if (!subjectEdit) return;
    const nextName = normalize(subjectValue);
    if (!nextName) { setNotice('Subject name cannot be blank.'); return; }
    if (currentSubjects.some(s => s !== subjectEdit && s.toLocaleLowerCase() === nextName.toLocaleLowerCase())) { setNotice('Another subject with that name already exists for this child.'); return; }
    const periods = currentPeriods.map(period => period.subject.toLocaleLowerCase() === subjectEdit.toLocaleLowerCase() ? { ...period, subject: nextName } : period);
    const subjects = uniqueSubjects(currentSubjects.map(s => s === subjectEdit ? nextName : s)); setBusy(true);
    try {
      if (draft) setDraft({ ...draft, periods, subjects });
      else await persistManualSubjects(subjects, { action: 'modify_subject', previousSubject: subjectEdit, newSubject: nextName });
      setSubjectEdit(null); setSubjectValue(''); setNotice(`Subject renamed to “${nextName}” for ${child.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be modified.'); } finally { setBusy(false); }
  };

  const deleteSubject = async (subject: string) => {
    if (currentPeriods.some(period => period.subject.toLocaleLowerCase() === subject.toLocaleLowerCase())) { setNotice(`“${subject}” is still used by a timetable period. Change/remove those periods before deleting the subject.`); return; }
    if (!confirm(`Delete ${subject} for ${child.name}?`)) return;
    const subjects = currentSubjects.filter(s => s.toLocaleLowerCase() !== subject.toLocaleLowerCase()); setBusy(true);
    try {
      if (draft) setDraft({ ...draft, subjects });
      else await persistManualSubjects(subjects, { action: 'delete_subject', subject });
      setNotice(`Subject “${subject}” deleted for ${child.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be deleted.'); } finally { setBusy(false); }
  };

  return <section className="parent-section">
    <div className="section-heading"><div><small>MENU 2</small><h1>📅 TimeTable / Subjects</h1><p>Select a child first. Their timetable and subjects are isolated to that child.</p></div><select className="timetable-child" value={child.id} onChange={e => setActive(e.target.value)} disabled={busy} aria-label="Select child">{children.map(c => <option key={c.id} value={c.id}>{c.name || 'Unnamed child'}</option>)}</select></div>
    {notice && <div className="tt-notice" role="status">{notice}</div>}
    <div className="tt-upload panel"><div><h2>📤 Upload TimeTable</h2><p>For <strong>{child.name || 'selected child'}</strong>. PDF, JPG, JPEG or PNG · maximum 10 MB.</p></div><label className="upload-button">{busy ? 'Processing…' : 'Choose file'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={processFile}/></label></div>
    {(draft || record) && <>
      <div className="tt-status"><span>Child: <b>{child.name}</b></span><span>File: <b>{draft?.fileName || record?.fileName}</b></span><span>Status: <b>{draft ? 'Review required' : record?.status}</b></span><span>Subjects: <b>{currentSubjects.length}</b></span></div>
      {currentPeriods.length > 0 && <div className="tt-review panel"><div className="section-heading"><div><small>AI REVIEW</small><h2>Review / Correct TimeTable</h2></div><span>{currentPeriods.length} detected periods</span></div><div className="tt-table-wrap"><table><thead><tr><th>Day</th><th>Start</th><th>End</th><th>Subject</th><th></th></tr></thead><tbody>{currentPeriods.map((period, index) => <tr key={`${period.day}-${period.start}-${index}`}><td><select value={period.day} onChange={e => updatePeriod(index, 'day', e.target.value)} disabled={busy}>{DAYS.map(day => <option key={day}>{day}</option>)}</select></td><td><input type="time" value={period.start} onChange={e => updatePeriod(index, 'start', e.target.value)} disabled={busy}/></td><td><input type="time" value={period.end} onChange={e => updatePeriod(index, 'end', e.target.value)} disabled={busy}/></td><td><input value={period.subject} onChange={e => updatePeriod(index, 'subject', e.target.value)} disabled={busy}/></td><td><button className="danger-link" disabled={busy} onClick={() => { const periods = currentPeriods.filter((_, i) => i !== index); const subjects = uniqueSubjects(extractSubjects(periods)); setDraft({ fileName: draft?.fileName || record?.fileName || 'edited timetable', fileMimeType: draft?.fileMimeType || record?.fileMimeType || 'application/json', fileSize: draft?.fileSize || record?.fileSize || 0, periods, subjects }); }}>Remove</button></td></tr>)}</tbody></table></div><div className="actions"><button className="secondary" disabled={busy} onClick={() => setDraft({ fileName: draft?.fileName || record?.fileName || 'edited timetable', fileMimeType: draft?.fileMimeType || record?.fileMimeType || 'application/json', fileSize: draft?.fileSize || record?.fileSize || 0, periods: [...currentPeriods, { day: 'Monday', start: '10:00', end: '10:40', subject: '', type: 'class' }], subjects: uniqueSubjects(extractSubjects(currentPeriods)) })}>＋ Add Period</button>{draft && <button className="primary" disabled={busy} onClick={() => void saveDraft()}>✓ Confirm & Save</button>}</div></div>}
    </>}
    <div className="panel subject-management"><div className="section-heading"><div><small>SUBJECT MANAGEMENT</small><h2>📚 Subjects for {child.name}</h2><p>{record ? 'Timetable subjects can be modified here. You can also add subjects that are not present in the timetable.' : 'No timetable is uploaded. You can create the child’s subjects manually now and add a timetable later.'}</p></div></div><div className="subject-add-row"><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Add subject manually" disabled={busy}/><button className="primary" disabled={busy} onClick={() => void addSubject()}>＋ Add Subject</button></div><div className="subject-list">{currentSubjects.map(subject => <div className="subject-row" key={subject}>{subjectEdit === subject ? <><input value={subjectValue} onChange={e => setSubjectValue(e.target.value)} disabled={busy}/><button className="primary" disabled={busy} onClick={() => void modifySubject()}>Save</button><button className="secondary" disabled={busy} onClick={() => setSubjectEdit(null)}>Cancel</button></> : <><strong>{subject}</strong><span className="subject-actions"><button disabled={busy} onClick={() => { setSubjectEdit(subject); setSubjectValue(subject); }}>✎ Modify</button><button className="danger" disabled={busy} onClick={() => void deleteSubject(subject)}>Delete</button></span></>}</div>)}</div>{!currentSubjects.length && <p>No subjects yet. Add the first subject manually or upload a timetable to extract subjects.</p>}</div>
    {!record && !draft && <div className="coming-section panel"><div className="coming-icon">📚</div><h2>No timetable uploaded for {child.name} yet.</h2><p>You can still add, modify and delete subjects manually above. Uploading a timetable later will merge its extracted subjects into this child’s existing subject list.</p></div>}
  </section>;
}
