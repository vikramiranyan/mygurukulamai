import React, { useEffect, useMemo, useState } from 'react';
import { getDocument as getPdfDocument } from './timetable/pdfjsClient';
import { extractSubjects, parseTimetableText, type ParsedTimetablePeriod } from './timetable/parser';
import type { Child } from './types/parent';
import type { DriveSyncController } from './storage/driveSync';
import type { ChildTimetableAudit, ChildTimetableRecord } from './storage/driveTimetableStore';
import { uniqueSubjects } from './storage/driveTimetableStore';
import { distinctLearningScopeGroups, sharedLearningScopeId, type LearningScopeGroup } from './storage/sharedLearningScope';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'helloworld';
const OCR_SPACE_TIMEOUT_MS = 120_000;
type TimetableDraft = { fileName: string; fileMimeType: string; fileSize: number; periods: ParsedTimetablePeriod[]; subjects: string[] };

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getPdfDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const fragments: Array<{ y: number; x: number; text: string }> = [];
    for (const item of content.items as any[]) {
      const text = String(item.str ?? '').trim();
      if (!text) continue;
      const transform = Array.isArray(item.transform) ? item.transform : [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      const fragment = fragments.find(candidate => Math.abs(candidate.x - x) <= 4 && Math.abs(candidate.y - y) <= 18);
      if (fragment) {
        const earlier = fragment.y >= y ? fragment : { ...fragment, y };
        fragment.text = fragment.y >= y ? `${fragment.text} ${text}` : `${text} ${fragment.text}`;
        fragment.y = earlier.y;
      } else {
        fragments.push({ y, x, text });
      }
    }
    const lines: Array<{ y: number; x: number; text: string }> = [];
    for (const fragment of fragments) {
      const line = lines.find(candidate => Math.abs(candidate.y - fragment.y) <= 3);
      if (line) line.text += ` ${fragment.text}`;
      else lines.push({ ...fragment });
    }
    const pageText = lines
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map(line => line.text.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
    if (pageText) pages.push(pageText);
  }
  const text = pages.join('\n');
  if (!text.trim()) throw new Error('The PDF contains no readable text.');
  return text;
}

async function extractImageText(file: File): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OCR_SPACE_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('apikey', OCR_SPACE_API_KEY);
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('OCREngine', '2');
    form.append('file', file, file.name);
    const response = await fetch(OCR_SPACE_ENDPOINT, { method: 'POST', body: form, signal: controller.signal });
    if (!response.ok) throw new Error(`OCR service returned HTTP ${response.status}.`);
    const result = await response.json() as { IsErroredOnProcessing?: boolean; ErrorMessage?: string | string[]; ParsedResults?: Array<{ ParsedText?: string }> };
    if (result.IsErroredOnProcessing) {
      const message = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(' ') : result.ErrorMessage;
      throw new Error(message || 'OCR service could not process this image.');
    }
    return result.ParsedResults?.map(parsed => parsed.ParsedText || '').join('\n') || '';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('OCR.space timed out while processing this image.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalize(value: string): string { return value.trim().replace(/\s+/g, ' '); }

function diffSubjects(previous: string[], next: string[]) {
  const oldMap = new Map(previous.map(s => [normalize(s).toLocaleLowerCase(), normalize(s)]));
  const newMap = new Map(next.map(s => [normalize(s).toLocaleLowerCase(), normalize(s)]));
  return {
    added: [...newMap.values()].filter(s => !oldMap.has(s.toLocaleLowerCase())),
    removed: [...oldMap.values()].filter(s => !newMap.has(s.toLocaleLowerCase())),
  };
}

function timetableGroupLabel(child: Child): string {
  return `${child.school || 'School not added'} · Class ${child.grade || '—'} · Section ${child.section || '—'}`;
}

export function ParentTimetableSubjects({ children, active, setActive, driveSync }: { children: Child[]; active: string; setActive: (id: string) => void; driveSync: DriveSyncController }) {
  const timetableGroups = useMemo(() => distinctLearningScopeGroups(children), [children]);
  const activeChild = children.find(c => c.id === active) || children[0];
  const selectedGroup = activeChild ? timetableGroups.find(group => group.id === sharedLearningScopeId(activeChild)) || timetableGroups[0] : undefined;
  const child = selectedGroup?.representative;
  const scopeId = selectedGroup?.id || '';
  const scopedChildren = selectedGroup?.children || [];
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
    void (async () => {
      const sharedRecord = await driveSync.loadTimetable(child.id, scopeId);
      if (sharedRecord || cancelled) {
        if (!cancelled) setRecord(sharedRecord);
        return;
      }
      const legacySibling = scopedChildren.find(item => item.id !== child.id);
      const fallbackRecord = legacySibling ? await driveSync.loadTimetable(legacySibling.id) : null;
      if (!cancelled) setRecord(fallbackRecord);
    })().catch(error => {
      if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load this child's timetable.");
    });
    return () => { cancelled = true; };
  }, [scopeId, driveSync]);

  const currentPeriods = draft?.periods ?? record?.periods ?? [];
  const currentSubjects = useMemo(
    () => uniqueSubjects(draft?.subjects ?? record?.subjects ?? extractSubjects(currentPeriods)),
    [draft, record, currentPeriods],
  );

  if (!child) {
    return <section className="parent-section"><div className="coming-section panel"><div className="coming-icon">📅</div><h2>Add a child first</h2><p>TimeTable / Subjects is available after a child has been added.</p></div></section>;
  }

  const subjectsForPeriods = (periods: ParsedTimetablePeriod[]) => uniqueSubjects([...(draft?.subjects ?? record?.subjects ?? []), ...extractSubjects(periods)]);
  const makeDraft = (periods: ParsedTimetablePeriod[], subjects = subjectsForPeriods(periods)): TimetableDraft => ({
    fileName: draft?.fileName || record?.fileName || 'edited timetable',
    fileMimeType: draft?.fileMimeType || record?.fileMimeType || 'application/json',
    fileSize: draft?.fileSize || record?.fileSize || 0,
    periods,
    subjects,
  });

  const updatePeriod = (index: number, key: keyof ParsedTimetablePeriod, value: string) => {
    const periods = currentPeriods.map((period, i) => i === index ? { ...period, [key]: value } : period);
    setDraft(makeDraft(periods));
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
      const next: ChildTimetableRecord = {
        version: 1, childId: child.id, fileName: draft.fileName, fileMimeType: draft.fileMimeType,
        fileSize: draft.fileSize, originalDriveFileId: record?.originalDriveFileId,
        uploadedAt: record?.uploadedAt || now, status: 'confirmed', periods: draft.periods, subjects,
        audit: [...(record?.audit || []), { action: 'upload', at: now }, { action: 'confirm', at: now }],
      };
      await driveSync.saveTimetable({ ...next, childId: scopeId });
      setRecord(next); setDraft(null);
      const summary = [changes.added.length ? `New: ${changes.added.join(', ')}` : '', changes.removed.length ? `Removed: ${changes.removed.join(', ')}` : ''].filter(Boolean).join(' · ');
      setNotice(summary ? `Timetable confirmed for ${child.name}. ${summary}` : `Timetable confirmed for ${child.name}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Timetable could not be saved.'); }
    finally { setBusy(false); }
  };

  const processFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { setNotice('Please upload a PDF, JPG, JPEG or PNG timetable.'); return; }
    if (file.size > MAX_FILE_SIZE) { setNotice('Timetable file is too large. Maximum allowed size is 10 MB.'); return; }
    setBusy(true); setNotice('Reading timetable…');
    try {
      const text = file.name.toLowerCase().endsWith('.pdf') ? await extractPdfText(file) : await extractImageText(file);
      const periods = parseTimetableText(text);
      if (!periods.length) { setNotice('The timetable could not be confidently read. Please upload a clearer file.'); return; }
      const subjects = uniqueSubjects([...(record?.subjects || []), ...extractSubjects(periods)]);
      setDraft({ fileName: file.name, fileMimeType: file.type || 'application/octet-stream', fileSize: file.size, periods, subjects });
      const changes = diffSubjects(record?.subjects || [], subjects);
      const summary = [changes.added.length ? `new: ${changes.added.join(', ')}` : '', changes.removed.length ? `removed: ${changes.removed.join(', ')}` : ''].filter(Boolean).join(' · ');
      setNotice(`Timetable read successfully. ${periods.length} period${periods.length === 1 ? '' : 's'} detected.${summary ? ` Review changes (${summary}).` : ' Review before confirming.'}`);
    } catch (error) { console.error('Timetable processing error:', error); setNotice(`Timetable reading failed: ${error instanceof Error ? error.message : 'unknown PDF/image processing error'}`); }
    finally { setBusy(false); }
  };

  const persistManualSubjects = async (subjects: string[], audit: Omit<ChildTimetableAudit, 'at'>) => {
    const now = new Date().toISOString();
    const next: ChildTimetableRecord = {
      version: 1, childId: child.id, fileName: record?.fileName || 'manual-subjects', fileMimeType: record?.fileMimeType || 'application/json',
      fileSize: record?.fileSize || 0, originalDriveFileId: record?.originalDriveFileId, uploadedAt: record?.uploadedAt || now,
      status: 'confirmed', periods: currentPeriods, subjects, audit: [...(record?.audit || []), { ...audit, at: now }],
    };
    const saved = await driveSync.saveTimetable({ ...next, childId: scopeId }); setRecord(saved); return saved;
  };

  const addSubject = async () => {
    const value = normalize(newSubject);
    if (!value) { setNotice('Subject name cannot be blank.'); return; }
    if (currentSubjects.some(s => s.toLocaleLowerCase() === value.toLocaleLowerCase())) { setNotice('That subject already exists for this child.'); return; }
    const nextSubjects = uniqueSubjects([...currentSubjects, value]); setBusy(true);
    try { if (draft) setDraft({ ...draft, subjects: nextSubjects }); else await persistManualSubjects(nextSubjects, { action: 'add_subject', subject: value }); setNewSubject(''); setNotice(`Subject “${value}” added for ${child.name}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be added.'); }
    finally { setBusy(false); }
  };

  const modifySubject = async () => {
    if (!subjectEdit) return;
    const nextName = normalize(subjectValue);
    if (!nextName) { setNotice('Subject name cannot be blank.'); return; }
    if (currentSubjects.some(s => s !== subjectEdit && s.toLocaleLowerCase() === nextName.toLocaleLowerCase())) { setNotice('Another subject with that name already exists for this child.'); return; }
    const periods = currentPeriods.map(period => period.subject.toLocaleLowerCase() === subjectEdit.toLocaleLowerCase() ? { ...period, subject: nextName } : period);
    const subjects = uniqueSubjects(currentSubjects.map(s => s === subjectEdit ? nextName : s)); setBusy(true);
    try { if (draft) setDraft({ ...draft, periods, subjects }); else { await driveSync.renameSubject(scopeId, subjectEdit, nextName); await persistManualSubjects(subjects, { action: 'modify_subject', previousSubject: subjectEdit, newSubject: nextName }); } setSubjectEdit(null); setSubjectValue(''); setNotice(`Subject renamed to “${nextName}” for ${child.name}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be modified.'); }
    finally { setBusy(false); }
  };

  const deleteSubject = async (subject: string) => {
    if (currentPeriods.some(period => period.subject.toLocaleLowerCase() === subject.toLocaleLowerCase())) { setNotice(`“${subject}” is still used by a timetable period. Change/remove those periods before deleting the subject.`); return; }
    if (!confirm(`Delete ${subject} for ${child.name}?`)) return;
    const subjects = currentSubjects.filter(s => s.toLocaleLowerCase() !== subject.toLocaleLowerCase()); setBusy(true);
    try { if (draft) setDraft({ ...draft, subjects }); else { await driveSync.deleteSubject(scopeId, subject); await persistManualSubjects(subjects, { action: 'delete_subject', subject }); } setNotice(`Subject “${subject}” deleted for ${child.name}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Subject could not be deleted.'); }
    finally { setBusy(false); }
  };

  return <section className="parent-section timetable-page">
    {notice && <div className="tt-notice" role="status">{notice}</div>}
    <div className="timetable-summary"><div className="timetable-child-summary"><span className="timetable-child-avatar">{child.gender === 'Male' ? '👦' : '👧'}</span><div><strong>{timetableGroupLabel(child)}</strong><small>Selected learning group</small></div><select className="timetable-child" value={scopeId} onChange={e => { const group = timetableGroups.find(item => item.id === e.target.value); if (group) setActive(group.representative.id); }} disabled={busy} aria-label="Select school, class and section">{timetableGroups.map(group => <option key={group.id} value={group.id}>{timetableGroupLabel(group.representative)}</option>)}</select></div><div className="timetable-stat"><span>📄</span><div><strong>{record?.fileName || 'No timetable'}</strong><small>Current file</small></div></div><div className="timetable-stat"><span>✓</span><div><strong>{record?.status || (draft ? 'Review' : 'Pending')}</strong><small>Status</small></div></div><div className="timetable-stat"><span>📚</span><div><strong>{currentSubjects.length}</strong><small>Subjects</small></div></div><div className="timetable-upload-card"><label className="upload-button">{busy ? 'Processing…' : '☁ Upload TimeTable'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={processFile}/></label><small>PDF, JPG, JPEG or PNG · Max 10 MB</small></div></div>
    {(draft || record) && <>
      {currentPeriods.length > 0 && <div className="timetable-workspace"><div className="tt-review panel"><div className="section-heading"><div><small>REVIEW / CORRECT TIMETABLE</small><h2>Review / Correct TimeTable</h2><p>Verify and edit the detected periods for your child.</p></div><span>{currentPeriods.length} detected periods</span></div><div className="tt-table-wrap"><table><thead><tr><th>#</th><th>Day</th><th>Start Time</th><th>End Time</th><th>Subject</th><th>Actions</th></tr></thead><tbody>{currentPeriods.map((period, index) => <tr key={`${period.day}-${period.start}-${index}`}><td>{index + 1}</td><td><select value={period.day} onChange={e => updatePeriod(index, 'day', e.target.value)} disabled={busy}>{DAYS.map(day => <option key={day}>{day}</option>)}</select></td><td><input type="time" value={period.start} onChange={e => updatePeriod(index, 'start', e.target.value)} disabled={busy}/></td><td><input type="time" value={period.end} onChange={e => updatePeriod(index, 'end', e.target.value)} disabled={busy}/></td><td><input value={period.subject} onChange={e => updatePeriod(index, 'subject', e.target.value)} disabled={busy}/></td><td><button className="danger-link" disabled={busy} onClick={() => setDraft(makeDraft(currentPeriods.filter((_, i) => i !== index)))}>🗑 Remove</button></td></tr>)}</tbody></table></div><div className="actions"><button className="secondary" disabled={busy} onClick={() => setDraft(makeDraft([...currentPeriods, { day: 'Monday', start: '10:00', end: '10:40', subject: '', type: 'class' }]))}>＋ Add Period</button>{draft && <button className="primary" disabled={busy} onClick={() => void saveDraft()}>▣ Save Changes</button>}</div></div>
      <div className="panel subject-management"><div className="section-heading"><div><small>SUBJECT MANAGEMENT</small><h2>📚 Subjects</h2><p>Manage subjects and chapters.</p></div></div><div className="subject-add-row"><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Add subject manually" disabled={busy}/><button className="primary" disabled={busy} onClick={() => void addSubject()}>＋ Add Subject</button></div><div className="subject-list">{currentSubjects.map(subject => <div className="subject-row" key={subject}>{subjectEdit === subject ? <><input value={subjectValue} onChange={e => setSubjectValue(e.target.value)} disabled={busy}/><button className="primary" disabled={busy} onClick={() => void modifySubject()}>Save</button><button className="secondary" disabled={busy} onClick={() => setSubjectEdit(null)}>Cancel</button></> : <><strong>{subject}</strong><span className="subject-actions"><button disabled={busy} onClick={() => { setSubjectEdit(subject); setSubjectValue(subject); }}>✎ Modify</button><button className="danger" disabled={busy} onClick={() => void deleteSubject(subject)}>Delete</button></span></>}</div>)}</div>{!currentSubjects.length && <p>No subjects yet. Add the first subject manually or upload a timetable to extract subjects.</p>}</div></div>}
    </>}
    {!record && !draft && <div className="coming-section panel"><div className="coming-icon">📚</div><h2>No timetable uploaded yet.</h2><p>You can still add, modify and delete subjects manually above. Uploading a timetable later will merge its extracted subjects into the selected learning group.</p></div>}
  </section>;
}
