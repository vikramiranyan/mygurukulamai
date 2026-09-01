import React, { useEffect, useMemo, useState } from 'react';
import { getDocument as getPdfDocument } from './timetable/pdfjsClient';
import type { Child } from './types/parent';
import type { ChapterPage, ChapterRecord, ChildWorkspace, HomeworkItem, TeachingPlanItem, TeachingScope, TeacherProfile, TestExam } from './learningWorkspace';

const MAX_CHAPTER_SIZE = 15 * 1024 * 1024;

async function extractPdfPages(file: File): Promise<ChapterPage[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await getPdfDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: ChapterPage[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => String(item.str ?? '')).join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ number: pageNo, text: text.slice(0, 6000) });
  }
  return pages;
}


async function createOcrImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2, 2200 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Image processing is unavailable in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = Math.round(0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]);
    const value = gray > 180 ? 255 : 0;
    image.data[i] = value; image.data[i + 1] = value; image.data[i + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

async function extractChapterPages(file: File): Promise<ChapterPage[]> {
  if (file.name.toLowerCase().endsWith('.pdf')) return extractPdfPages(file);
  const mod = await import('tesseract.js');
  const image = await createOcrImage(file);
  const result = await (mod.recognize as any)(image, 'eng', { tessedit_pageseg_mode: 11 });
  const text = String(result.data.text || '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('No readable text detected in this image. Try a clearer image with good contrast.');
  return [{ number: 1, text: text.slice(0, 6000) }];
}

function chapterFor(workspace: ChildWorkspace, subject: string, chapterId?: string): ChapterRecord | undefined {
  return workspace.chapters.find(chapter => chapter.subject === subject && chapter.id === chapterId);
}

type Props = { mode: 'teachers' | 'subjects' | 'tests' | 'teaching' | 'homework'; children: Child[]; active: string; setActive: (id: string) => void; workspace: ChildWorkspace; setWorkspace: (next: ChildWorkspace) => void };

export function ParentLearningTools({ mode, children, active, setActive, workspace, setWorkspace }: Props) {
  const child = children.find(c => c.id === active) || children[0];
  const [text, setText] = useState('');
  const [subject, setSubject] = useState(workspace.subjects[0] || '');
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [scope, setScope] = useState<TeachingScope>('full_chapter');
  const [chapterId, setChapterId] = useState('');
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { if (!workspace.subjects.includes(subject)) setSubject(workspace.subjects[0] || ''); }, [workspace.subjects, subject]);
  const subjectChapters = useMemo(() => workspace.chapters.filter(chapter => chapter.subject === subject), [workspace.chapters, subject]);
  const selectedChapter = useMemo(() => chapterFor(workspace, subject, chapterId), [workspace, subject, chapterId]);
  useEffect(() => { if (!selectedChapter) { const next = subjectChapters[0]; setChapterId(next?.id || ''); setPageNumbers([]); return; } setPageNumbers(current => current.filter(page => selectedChapter.pages.some(item => item.number === page))); }, [selectedChapter, subjectChapters]);
  if (!child) return <div className="coming-section panel"><div className="coming-icon">👧</div><h2>Add a child first</h2><p>These learning controls become available after a child is added.</p></div>;

  const saveTeacher = () => {
    const name = text.trim();
    const assignedSubject = subject.trim();
    if (!name) { setNotice('Enter the teacher name.'); return; }
    if (!assignedSubject) { setNotice('Select a subject before assigning a teacher.'); return; }
    const existing = workspace.teachers.find(t => t.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    const teacher: TeacherProfile = existing
      ? { ...existing, subjects: [...new Set([...existing.subjects, assignedSubject])] }
      : { id: crypto.randomUUID(), name, role: 'Personal AI Teacher', subjects: [assignedSubject], style: 'Warm, patient and step-by-step', enabled: true };
    const others = workspace.teachers.filter(t => t.id !== teacher.id);
    setWorkspace({ ...workspace, teachers: [...others, teacher] });
    setText(''); setNotice(`${teacher.name} is now assigned to ${assignedSubject}.`);
  };

  const modifyTeacher = (teacher: TeacherProfile) => {
    const name = window.prompt('Teacher name', teacher.name)?.trim();
    if (!name) return;
    const rawSubjects = window.prompt('Subjects (comma-separated)', teacher.subjects.join(', '));
    if (rawSubjects === null) return;
    const subjects = [...new Set(rawSubjects.split(',').map(value => value.trim()).filter(Boolean))];
    if (!subjects.length) { setNotice('Assign at least one subject to the teacher.'); return; }
    if (workspace.teachers.some(t => t.id !== teacher.id && t.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) { setNotice('A teacher with that name already exists.'); return; }
    setWorkspace({ ...workspace, teachers: workspace.teachers.map(t => t.id === teacher.id ? { ...t, name, subjects } : t) });
    setNotice(`${name} was updated successfully.`);
  };

  const deleteTeacher = (teacher: TeacherProfile) => {
    if (!window.confirm(`Delete teacher “${teacher.name}” from this child's learning setup?`)) return;
    setWorkspace({ ...workspace, teachers: workspace.teachers.filter(t => t.id !== teacher.id) });
    setNotice(`Teacher “${teacher.name}” deleted.`);
  };

  const uploadChapter = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!subject) { setNotice('Select a subject before uploading a chapter.'); return; }
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { setNotice('Upload a PDF, JPG, JPEG or PNG chapter.'); return; }
    if (file.size > MAX_CHAPTER_SIZE) { setNotice('Chapter file is too large. Maximum allowed size is 15 MB.'); return; }
    const title = window.prompt(`Chapter name for ${subject}`, file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()); if (!title?.trim()) return;
    setBusy(true); setNotice('Reading chapter pages…');
    try { const pages = await extractChapterPages(file); if (!pages.length) throw new Error('No pages could be read from this file.'); const chapter: ChapterRecord = { id: crypto.randomUUID(), subject, title: title.trim(), fileName: file.name, uploadedAt: new Date().toISOString(), pages }; setWorkspace({ ...workspace, chapters: [...workspace.chapters, chapter] }); setChapterId(chapter.id); setPageNumbers([]); setNotice(`${chapter.title} uploaded under ${subject} with ${pages.length} page${pages.length === 1 ? '' : 's'}.`); } catch (error) { setNotice(error instanceof Error ? error.message : 'Chapter could not be read.'); } finally { setBusy(false); }
  };

  const deleteChapter = (chapter: ChapterRecord) => { if (!window.confirm(`Delete “${chapter.title}” and all of its page data?`)) return; setWorkspace({ ...workspace, chapters: workspace.chapters.filter(item => item.id !== chapter.id), today: workspace.today.filter(item => item.chapterId !== chapter.id) }); if (chapterId === chapter.id) setChapterId(''); setNotice(`Chapter “${chapter.title}” deleted.`); };
  const addTest = () => { if (!text.trim() || !subject || !date) { setNotice('Enter a test name, subject and date.'); return; } const item: TestExam = { id: crypto.randomUUID(), title: text.trim(), subject, date, type: 'Gurukulam', topics: topic.trim() || 'Full chapter review', status: 'Upcoming' }; setWorkspace({ ...workspace, tests: [...workspace.tests, item] }); setText(''); setTopic(''); setDate(''); setNotice('Assessment scheduled.'); };
  const addTeaching = () => { if (!subject || !selectedChapter) { setNotice('Select a subject and chapter first.'); return; } if (scope === 'pages' && !pageNumbers.length) { setNotice('Select at least one page, or choose Full chapter.'); return; } const orderedPages = [...pageNumbers].sort((a, b) => a - b); const target = scope === 'full_chapter' ? `Full chapter · ${selectedChapter.title}` : `Pages ${orderedPages.join(', ')} · ${selectedChapter.title}`; const item: TeachingPlanItem = { id: crypto.randomUUID(), subject, topic: target, duration: 25, objective: scope === 'full_chapter' ? `Learn and practise the full ${selectedChapter.title} chapter.` : `Learn and practise the selected pages from ${selectedChapter.title}.`, completed: false, scope, chapterId: selectedChapter.id, pageNumbers: scope === 'pages' ? orderedPages : undefined }; setWorkspace({ ...workspace, today: [...workspace.today, item] }); setNotice(`Added ${target} to Today's Teaching.`); };
  const addHomework = () => { if (!subject || !text.trim() || !date) { setNotice('Enter a homework title, subject and due date.'); return; } const item: HomeworkItem = { id: crypto.randomUUID(), subject, title: text.trim(), instructions: topic.trim() || 'Complete the assigned practice and review your answers.', dueDate: date, status: 'Pending' }; setWorkspace({ ...workspace, homework: [...workspace.homework, item] }); setText(''); setTopic(''); setDate(''); setNotice('Homework assigned.'); };
  const selectChild = <select className="timetable-child" value={child.id} onChange={e => setActive(e.target.value)}><option value="" disabled>Select child</option>{children.map(c => <option key={c.id} value={c.id}>{c.name || 'Unnamed child'}</option>)}</select>;

  return <section className="parent-section"><div className="section-heading"><div><small>PARENT CONTROL</small><h1>{mode === 'teachers' ? '👨‍🏫 Teacher Details' : mode === 'subjects' ? '📚 Subjects & Chapters' : mode === 'tests' ? '📝 Test / Exam' : mode === 'teaching' ? "📖 Today's Teaching" : "🏠 Kid's Homework"}</h1><p>Configure learning for <strong>{child.name}</strong>. Changes apply only to this child.</p></div>{selectChild}</div>{notice && <div className="tt-notice" role="status">{notice}</div>}

    {mode === 'teachers' && <><div className="panel"><h2>Create / assign a teacher</h2><p>Teachers are never pre-created. Create a teacher and explicitly assign one or more existing subjects.</p><div className="subject-add-row"><input value={text} onChange={e => setText(e.target.value)} placeholder="Teacher name"/><select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select><button className="primary" onClick={saveTeacher}>Save Teacher</button></div></div><div className="child-list">{workspace.teachers.map(t => <article className="child-row" key={t.id}><div><h3>👨‍🏫 {t.name}</h3><p>{t.role} · {t.subjects.join(', ') || 'No subjects assigned'}</p><span className="child-school">{t.style}</span></div><div className="row-actions"><button className="secondary" onClick={() => modifyTeacher(t)}>✎ Modify</button><button className="danger" onClick={() => deleteTeacher(t)}>Delete</button><button className={t.enabled ? 'secondary' : 'primary'} onClick={() => setWorkspace({ ...workspace, teachers: workspace.teachers.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x) })}>{t.enabled ? 'Enabled' : 'Enable'}</button></div></article>)}{!workspace.teachers.length && <div className="coming-section panel"><h2>No teachers created</h2><p>Create a teacher here and explicitly assign the subjects they teach.</p></div>}</div></>}

    {mode === 'subjects' && <div className="subject-list">{workspace.subjects.map(value => <article className="panel" key={value} style={{ marginBottom: 14 }}><div className="section-heading"><div><h2>📘 {value}</h2><p>{workspace.chapters.filter(chapter => chapter.subject === value).length} chapter(s) · Subjects are maintained in Time Table / Subjects.</p></div></div><div className="subject-add-row"><label className="upload-button">{busy ? 'Reading…' : '＋ Upload Chapter'}<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onChange={uploadChapter}/></label></div>{workspace.chapters.filter(chapter => chapter.subject === value).map(chapter => <details key={chapter.id} className="subject-row" open={chapter.id === chapterId}><summary><strong>📖 {chapter.title}</strong><span>{chapter.pages.length} pages · {chapter.fileName}</span></summary><div style={{ display: 'grid', gap: 8, marginTop: 12 }}>{chapter.pages.map(page => <div key={page.number} className="panel" style={{ padding: 12, background: 'var(--panel-soft, #f6f6f6)' }}><strong>Page {page.number}</strong><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{page.text || 'No readable text detected on this page.'}</p></div>)}<button className="danger" onClick={() => deleteChapter(chapter)}>Delete Chapter</button></div></details>)}{!workspace.chapters.some(chapter => chapter.subject === value) && <p>No chapters uploaded yet. Upload the textbook chapter PDF/image for this subject.</p>}</article>)}{!workspace.subjects.length && <div className="coming-section panel"><h2>No subjects yet</h2><p>Add subjects under Time Table / Subjects. If no timetable exists, subjects can be created there manually.</p></div>}</div>}

    {mode === 'tests' && <><div className="panel"><h2>Create school / Gurukulam assessment</h2><div className="form-grid"><label>Test name<input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Maths Chapter Test"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Topics<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chapters / concepts"/></label></div><button className="primary" onClick={addTest}>＋ Schedule Test</button></div><div className="child-list">{workspace.tests.map(t => <article className="child-row" key={t.id}><div><h3>📝 {t.title}</h3><p>{t.type} · {t.subject} · {t.date}</p><span className="child-school">{t.topics}</span></div><button className="danger" onClick={() => setWorkspace({ ...workspace, tests: workspace.tests.filter(x => x.id !== t.id) })}>Delete</button></article>)}</div></>}

    {mode === 'teaching' && <><div className="panel"><h2>Plan today's teaching</h2><div className="form-grid"><label>Subject<select value={subject} onChange={e => { setSubject(e.target.value); setChapterId(''); setPageNumbers([]); }}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={e => { setChapterId(e.target.value); setPageNumbers([]); }}><option value="">Select chapter</option>{subjectChapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><label>Teaching scope<select value={scope} onChange={e => { setScope(e.target.value as TeachingScope); setPageNumbers([]); }}><option value="full_chapter">Full chapter</option><option value="pages">Specific pages</option></select></label></div>{selectedChapter && scope === 'pages' && <div className="panel" style={{ marginTop: 14 }}><h3>Select pages from {selectedChapter.title}</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>{selectedChapter.pages.map(page => <label key={page.number} className="subject-row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={pageNumbers.includes(page.number)} onChange={event => setPageNumbers(current => event.target.checked ? [...current, page.number] : current.filter(number => number !== page.number))}/><strong>Page {page.number}</strong></label>)}</div></div>}{!subjectChapters.length && subject && <p className="tt-notice">No chapters uploaded for this subject yet. Upload a chapter under Subjects before creating today's teaching.</p>}<button className="primary" disabled={busy || !selectedChapter || (scope === 'pages' && !pageNumbers.length)} onClick={addTeaching}>＋ Add to Today's Teaching</button></div><div className="child-list">{workspace.today.map(t => <article className="child-row" key={t.id}><div><h3>📖 {t.subject}: {t.topic}</h3><p>{t.duration} minutes · {t.objective}</p></div><button className={t.completed ? 'secondary' : 'primary'} onClick={() => setWorkspace({ ...workspace, today: workspace.today.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x) })}>{t.completed ? 'Completed' : 'Mark Complete'}</button></article>)}</div></>}

    {mode === 'homework' && <><div className="panel"><h2>Assign homework</h2><div className="form-grid"><label>Title<input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Addition practice"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Due date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Instructions<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What should the child do?"/></label></div><button className="primary" onClick={addHomework}>＋ Assign Homework</button></div><div className="child-list">{workspace.homework.map(h => <article className="child-row" key={h.id}><div><h3>🏠 {h.title}</h3><p>{h.subject} · Due {h.dueDate} · {h.status}</p><span className="child-school">{h.instructions}</span></div><button className="danger" onClick={() => setWorkspace({ ...workspace, homework: workspace.homework.filter(x => x.id !== h.id) })}>Delete</button></article>)}</div></>}
  </section>;
}
