import React, { useEffect, useMemo, useState } from 'react';
import { getDocument as getPdfDocument } from './timetable/pdfjsClient';
import type { DriveSyncController } from './storage/driveSync';
import { getActiveDriveSync } from './storage/driveSync';
import type { Child } from './types/parent';
import type { ChapterPage, ChapterRecord, ChildWorkspace, HomeworkItem, TeachingPlanItem, TeachingScope, TeacherProfile, TestExam } from './learningWorkspace';
import { distinctLearningScopeGroups, sharedLearningScopeId } from './storage/sharedLearningScope';

const MAX_CHAPTER_SIZE = 15 * 1024 * 1024;
const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
const OCR_SPACE_API_KEY = 'helloworld';
const OCR_SPACE_TIMEOUT_MS = 120_000;
const PDF_OCR_MAX_DIMENSION = 1800;
const SUBJECT_UPLOAD_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#15803d'];
type BusyAction = 'chapter';

type PageImageHandler = (pageNumber: number, image: Blob) => Promise<void>;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create a page image.')), 'image/png');
  });
}

async function extractPdfPages(file: File, onPageImage?: PageImageHandler): Promise<ChapterPage[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await getPdfDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: ChapterPage[] = [];
  const scannedPages: Array<{ number: number; blob: Blob }> = [];
  const preparedImages: Array<{ number: number; blob: Blob }> = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => String(item.str ?? '')).join(' ').replace(/\s+/g, ' ').trim();
    const pageImage = await renderPdfPage(page, pageNo);
    const image = await canvasToBlob(pageImage);
    preparedImages.push({ number: pageNo, blob: image });
    if (text) pages.push({ number: pageNo, text: text.slice(0, 6000) });
    else scannedPages.push({ number: pageNo, blob: image });
  }
  if (scannedPages.length) {
    for (const page of scannedPages) {
      try {
        const text = await recognizeWithOcr(page.blob);
        pages.push({ number: page.number, text: text.replace(/\s+/g, ' ').trim().slice(0, 6000) });
      } catch (error) {
        console.warn(`OCR failed for PDF page ${page.number}.`, error);
        pages.push({ number: page.number, text: '' });
      }
      if (onPageImage) await onPageImage(page.number, page.blob);
    }
  }
  if (onPageImage) {
    const scannedPageNumbers = new Set(scannedPages.map(page => page.number));
    for (const page of preparedImages) {
      if (!scannedPageNumbers.has(page.number)) await onPageImage(page.number, page.blob);
    }
  }
  return pages.sort((a, b) => a.number - b.number);
}

async function renderPdfPage(page: any, pageNo: number): Promise<HTMLCanvasElement> {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2, PDF_OCR_MAX_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
  const viewport = page.getViewport({ scale: Math.max(0.5, scale) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(`Could not prepare page ${pageNo} for OCR.`);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}


async function recognizeWithOcr(image: Blob): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OCR_SPACE_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('apikey', OCR_SPACE_API_KEY);
    form.append('language', 'eng');
    form.append('isOverlayRequired', 'false');
    form.append('OCREngine', '2');
    form.append('file', image, 'chapter-page.png');
    const response = await fetch(OCR_SPACE_ENDPOINT, { method: 'POST', body: form, signal: controller.signal });
    if (!response.ok) throw new Error(`OCR service returned HTTP ${response.status}.`);
    const result = await response.json() as { IsErroredOnProcessing?: boolean; ErrorMessage?: string | string[]; ParsedResults?: Array<{ ParsedText?: string }> };
    if (result.IsErroredOnProcessing) {
      const message = Array.isArray(result.ErrorMessage) ? result.ErrorMessage.join(' ') : result.ErrorMessage;
      throw new Error(message || 'OCR service could not process this page.');
    }
    return String(result.ParsedResults?.map(parsed => parsed.ParsedText || '').join('\n') || '');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('OCR.space timed out while processing this page.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function extractChapterPages(file: File, onPageImage?: PageImageHandler): Promise<ChapterPage[]> {
  if (file.name.toLowerCase().endsWith('.pdf')) return extractPdfPages(file, onPageImage);
  const imageUrl = URL.createObjectURL(file);
  try {
    const sourceResponse = await fetch(imageUrl);
    const sourceImage = await sourceResponse.blob();
    const text = await recognizeWithOcr(sourceImage);
    if (onPageImage) await onPageImage(1, sourceImage);
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    if (!normalizedText) throw new Error('No readable text detected in this image. Try a clearer image with good contrast.');
    return [{ number: 1, text: normalizedText.slice(0, 6000) }];
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function chapterFor(workspace: ChildWorkspace, subject: string, chapterId?: string): ChapterRecord | undefined {
  return workspace.chapters.find(chapter => chapter.subject === subject && chapter.id === chapterId);
}

type Props = { mode: 'teachers' | 'subjects' | 'tests' | 'teaching' | 'homework'; children: Child[]; active: string; setActive: (id: string) => void; workspace: ChildWorkspace; setWorkspace: (next: ChildWorkspace) => void; driveSync?: DriveSyncController };

export function ParentLearningTools({ mode, children, active, setActive, workspace, setWorkspace, driveSync: providedDriveSync }: Props) {
  const learningGroups = useMemo(() => distinctLearningScopeGroups(children), [children]);
  const activeChild = children.find(c => c.id === active) || children[0];
  const selectedGroup = activeChild ? learningGroups.find(group => group.id === sharedLearningScopeId(activeChild)) || learningGroups[0] : undefined;
  const child = selectedGroup?.representative;
  const learningScopeId = selectedGroup?.id || '';
  const scopedChildNames = selectedGroup?.children.map(item => item.name || 'Unnamed child').join(' & ') || '';
  const [text, setText] = useState('');
  const [subject, setSubject] = useState(workspace.subjects[0] || '');
  const [date, setDate] = useState('');
  const [topic, setTopic] = useState('');
  const [testType, setTestType] = useState<TestExam['type']>('Gurukulam');
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [voiceLanguage, setVoiceLanguage] = useState<'English' | 'Hindi' | 'Tamil' | 'Telugu'>('English');
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherView, setTeacherView] = useState<TeacherProfile | null>(null);
  const [teacherEdit, setTeacherEdit] = useState<TeacherProfile | null>(null);
  const [teacherDelete, setTeacherDelete] = useState<TeacherProfile | null>(null);
  const [teacherIdPreview, setTeacherIdPreview] = useState('');
  const [teacherDraft, setTeacherDraft] = useState({
    name: '',
    subject: workspace.subjects[0] || '',
    gender: 'female' as 'female' | 'male',
    language: 'English' as 'English' | 'Hindi' | 'Tamil' | 'Telugu',
  });
  const [scope, setScope] = useState<TeachingScope>('full_chapter');
  const [chapterId, setChapterId] = useState('');
  const [selectedPageNumber, setSelectedPageNumber] = useState<number | null>(null);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [busySubject, setBusySubject] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!workspace.subjects.includes(subject)) setSubject(workspace.subjects[0] || ''); }, [workspace.subjects, subject]);
  useEffect(() => {
    setTeacherDraft(current => ({
      ...current,
      subject: workspace.subjects.includes(current.subject) ? current.subject : (workspace.subjects[0] || ''),
    }));
  }, [workspace.subjects]);
  const subjectChapters = useMemo(() => workspace.chapters.filter(chapter => chapter.subject === subject), [workspace.chapters, subject]);
  const selectedChapter = useMemo(() => chapterFor(workspace, subject, chapterId), [workspace, subject, chapterId]);
  useEffect(() => {
    if (!selectedChapter) {
      const next = subjectChapters[0];
      setChapterId(next?.id || '');
      setSelectedPageNumber(next?.pages[0]?.number ?? null);
      setPageNumbers([]);
      return;
    }
    setSelectedPageNumber(current => selectedChapter.pages.some(page => page.number === current) ? current : (selectedChapter.pages[0]?.number ?? null));
    setPageNumbers(current => current.filter(page => selectedChapter.pages.some(item => item.number === page)));
  }, [selectedChapter, subjectChapters]);
  if (!child) return <div className={`coming-section panel learning-empty-state ${mode === 'teachers' ? '' : `parent-learning-page ${mode}-page`}`}><div className="coming-icon">👧</div><h2>Add a child first</h2><p>These learning controls become available after a child is added.</p></div>;

  const openTeacherModal = () => {
    setTeacherDraft({
      name: '',
      subject: workspace.subjects[0] || '',
      gender: 'female',
      language: 'English',
    });
    setTeacherIdPreview(crypto.randomUUID().slice(0, 12).toUpperCase().replace(/-/g, ''));
    setTeacherModalOpen(true);
  };

  const saveTeacher = () => {
    const name = teacherDraft.name.trim();
    const assignedSubject = teacherDraft.subject.trim();
    if (!name) { setNotice('Enter the teacher name.'); return; }
    if (!assignedSubject) { setNotice('Select a subject before assigning a teacher.'); return; }
    const existing = workspace.teachers.find(t => t.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
    const teacher: TeacherProfile = existing
      ? { ...existing, subjects: [...new Set([...existing.subjects, assignedSubject])], voiceGender: teacherDraft.gender, voiceLanguage: teacherDraft.language }
      : { id: crypto.randomUUID(), name, role: 'Personal AI Teacher', subjects: [assignedSubject], style: 'Warm, patient and step-by-step', voiceGender: teacherDraft.gender, voiceLanguage: teacherDraft.language, enabled: true };
    const others = workspace.teachers.filter(t => t.id !== teacher.id);
    setWorkspace({ ...workspace, teachers: [...others, teacher] });
    setTeacherDraft({ name: '', subject: workspace.subjects[0] || '', gender: 'female', language: 'English' });
    setTeacherIdPreview('');
    setTeacherModalOpen(false);
    setNotice(`${teacher.name} is now assigned to ${assignedSubject}.`);
  };

  const viewTeacher = (teacher: TeacherProfile) => {
    setTeacherView(teacher);
  };

  const modifyTeacher = (teacher: TeacherProfile) => {
    setTeacherEdit(teacher);
  };

  const saveTeacherEdit = () => {
    if (!teacherEdit) return;
    const name = teacherEdit.name.trim();
    const subjects = [...new Set(teacherEdit.subjects.map(value => value.trim()).filter(Boolean))];
    if (!name) { setNotice('Enter the teacher name.'); return; }
    if (!subjects.length) { setNotice('Assign at least one subject to the teacher.'); return; }
    if (workspace.teachers.some(t => t.id !== teacherEdit.id && t.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setNotice('A teacher with that name already exists.');
      return;
    }
    setWorkspace({
      ...workspace,
      teachers: workspace.teachers.map(t => t.id === teacherEdit.id
        ? { ...teacherEdit, name, subjects, role: teacherEdit.role.trim(), style: teacherEdit.style.trim() }
        : t),
    });
    setTeacherEdit(null);
    setNotice(`${name} was updated successfully.`);
  };

  const deleteTeacher = (teacher: TeacherProfile) => {
    setTeacherDelete(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (!teacherDelete) return;
    const deletedName = teacherDelete.name;
    setWorkspace({ ...workspace, teachers: workspace.teachers.filter(t => t.id !== teacherDelete.id) });
    setTeacherDelete(null);
    setNotice(`Teacher “${deletedName}” deleted.`);
  };

  const uploadChapter = async (event: React.ChangeEvent<HTMLInputElement>, selectedSubject: string) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (!selectedSubject) { setNotice('Select a subject before uploading a chapter.'); return; }
    setSubject(selectedSubject);
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { setNotice('Upload a PDF, JPG, JPEG or PNG chapter.'); return; }
    if (file.size > MAX_CHAPTER_SIZE) { setNotice('Chapter file is too large. Maximum allowed size is 15 MB.'); return; }
    const title = window.prompt(`Chapter name for ${selectedSubject}`, file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()); if (!title?.trim()) return;
    setBusySubject(selectedSubject); setBusyAction('chapter'); setNotice('Reading chapter pages…');
    try {
    const driveSync = providedDriveSync || getActiveDriveSync();
    if (!driveSync) throw new Error('Google Drive is not ready. Refresh the page and try again.');
    if (!(await driveSync.ensureConnection())) throw new Error('Google Drive authorization has expired. Click Connect Google Drive and try again.');
    setNotice('Saving the original chapter to Google Drive…');
    const chapterId = crypto.randomUUID();
    const uploadedFile = await driveSync.uploadChapterFile(file, learningScopeId, selectedSubject, title.trim());
    setNotice('Reading the chapter back from Google Drive…');
    const storedFile = await driveSync.downloadChapterFile(uploadedFile.id);
    const storedChapter = new File([storedFile], file.name, { type: file.type || storedFile.type || 'application/pdf' });
    setNotice('Extracting chapter text from the Drive copy…');
    const pages = await extractChapterPages(storedChapter, async (pageNumber, image) => {
      setNotice(`Uploading split page ${pageNumber} to the chapter folder…`);
      await driveSync.uploadChapterPage(uploadedFile.folderId, pageNumber, image);
    });
    if (!pages.length) throw new Error('No pages could be read from this file.');
    const sourceUrl = uploadedFile.webViewLink || '';
    if (!sourceUrl) throw new Error('The chapter was read, but could not be stored for later viewing. Connect Google Drive and try again.');
    const readablePages = pages.filter(page => page.text.trim()).length;
    const chapter: ChapterRecord = { id: chapterId, subject: selectedSubject, title: title.trim(), fileName: file.name, uploadedAt: new Date().toISOString(), pages, readStatus: readablePages === pages.length ? 'read' : readablePages ? 'partial' : 'ocr_pending', reviewStatus: 'review_required', sourceUrl, sourceFileId: uploadedFile.id, driveFolderId: uploadedFile.folderId, driveFolderUrl: uploadedFile.folderUrl };
    setNotice('Saving extracted chapter text to Google Drive…');
    await driveSync.saveChapterText(learningScopeId, chapter.id, {
      version: 1,
      sourceFileId: uploadedFile.id,
      sourceFileName: file.name,
      chapterId: chapter.id,
      subject: selectedSubject,
      title: title.trim(),
      extractedAt: new Date().toISOString(),
      pages,
    });
    setWorkspace({ ...workspace, chapters: [...workspace.chapters, chapter] });
    setChapterId(chapter.id);
    setSelectedPageNumber(chapter.pages[0]?.number ?? null);
    setPageNumbers([]);
    setNotice(`${chapter.title} is ready for your review: ${pages.length} pages split, ${readablePages} read successfully. Confirm it before teaching.`);
    } catch (error) {
    setNotice(error instanceof Error ? `Chapter could not be read: ${error.message}` : 'Chapter could not be read. Upload a readable PDF or image and try again.');
    } finally { setBusySubject(null); setBusyAction(null); }
  };

  const deleteChapter = async (chapter: ChapterRecord) => {
    if (!window.confirm(`Delete “${chapter.title}” and all of its Drive files?`)) return;
    const driveSync = providedDriveSync || getActiveDriveSync();
    if (!driveSync || !(await driveSync.ensureConnection())) {
      setNotice('Google Drive is not connected. The chapter was not deleted.');
      return;
    }
    setBusySubject(chapter.subject);
    setBusyAction('chapter');
    setNotice(`Deleting “${chapter.title}” and its original PDF, page images and extracted text from Google Drive…`);
    try {
      await driveSync.deleteChapter(learningScopeId, chapter);
      setWorkspace({ ...workspace, chapters: workspace.chapters.filter(item => item.id !== chapter.id), today: workspace.today.filter(item => item.chapterId !== chapter.id) });
      if (chapterId === chapter.id) setChapterId('');
      setNotice(`“${chapter.title}” and its Drive files were deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Chapter was not deleted: ${error.message}` : 'Chapter was not deleted because its Drive files could not be removed.');
    } finally {
      setBusySubject(null);
      setBusyAction(null);
    }
  };
  const addTest = () => { if (!text.trim() || !subject || !date) { setNotice('Enter a test name, subject and date.'); return; } const item: TestExam = { id: crypto.randomUUID(), title: text.trim(), subject, date, type: testType, topics: topic.trim() || 'Full chapter review', status: 'Upcoming' }; setWorkspace({ ...workspace, tests: [...workspace.tests, item] }); setText(''); setTopic(''); setDate(''); setTestType('Gurukulam'); setNotice('Assessment scheduled.'); };
  const confirmChapter = (chapter: ChapterRecord) => {
    if (chapter.readStatus === 'ocr_pending' || !chapter.pages.length) {
      setNotice('This chapter has no readable pages yet. Review or re-upload it before confirming.');
      return;
    }
    setWorkspace({ ...workspace, chapters: workspace.chapters.map(item => item.id === chapter.id ? { ...item, reviewStatus: 'confirmed' } : item) });
    setNotice(`“${chapter.title}” is confirmed and ready to teach.`);
  };
  const addTeaching = () => { if (!subject || !selectedChapter) { setNotice('Select a subject and chapter first.'); return; } if (selectedChapter.reviewStatus !== 'confirmed') { setNotice('Review and confirm this chapter before adding it to Today’s Teaching.'); return; } if (scope === 'pages' && !pageNumbers.length) { setNotice('Select at least one page, or choose Full chapter.'); return; } const orderedPages = [...pageNumbers].sort((a, b) => a - b); const target = scope === 'full_chapter' ? `Full chapter · ${selectedChapter.title}` : `Pages ${orderedPages.join(', ')} · ${selectedChapter.title}`; const item: TeachingPlanItem = { id: crypto.randomUUID(), subject, topic: target, duration: 25, objective: scope === 'full_chapter' ? `Learn and practise the full ${selectedChapter.title} chapter.` : `Learn and practise the selected pages from ${selectedChapter.title}.`, completed: false, scope, chapterId: selectedChapter.id, pageNumbers: scope === 'pages' ? orderedPages : undefined }; setWorkspace({ ...workspace, today: [...workspace.today, item] }); setNotice(`Added ${target} to Today's Teaching.`); };
  const addHomework = () => { if (!subject || !text.trim() || !date) { setNotice('Enter a homework title, subject and due date.'); return; } const item: HomeworkItem = { id: crypto.randomUUID(), subject, title: text.trim(), instructions: topic.trim() || 'Complete the assigned practice and review your answers.', dueDate: date, status: 'Pending' }; setWorkspace({ ...workspace, homework: [...workspace.homework, item] }); setText(''); setTopic(''); setDate(''); setNotice('Homework assigned.'); };
  const selectGroup = <select className="timetable-child" value={selectedGroup?.id || ''} onChange={e => { const group = learningGroups.find(item => item.id === e.target.value); if (group) setActive(group.representative.id); }}><option value="" disabled>Select school, class and section</option>{learningGroups.map(group => <option key={group.id} value={group.id}>{group.representative.school || 'School not added'} · Class {group.representative.grade || '—'} · Section {group.representative.section || '—'}</option>)}</select>;

  return <section className={`parent-section ${mode === 'teachers' ? 'teacher-details-page' : `parent-learning-page ${mode}-page`}`}>{mode !== 'teachers' && <div className="section-heading"><div><small>PARENT CONTROL</small><h1>{mode === 'subjects' ? '📚 Subjects & Chapters' : mode === 'tests' ? '📝 Test / Exam' : mode === 'teaching' ? "📖 Today's Teaching" : "🏠 Kid's Homework"}</h1><p>Configure learning for <strong>{scopedChildNames}</strong>. Changes apply to this School, Class and Section group.</p></div>{selectGroup}</div>}{notice && mode !== 'teachers' && <div className="tt-notice" role="status">{notice}</div>}

    {mode === 'teachers' && <><div className="teacher-layout"><div className="teacher-main-panel"><div className="teacher-list-heading"><div><span className="teacher-create-icon">👥</span><div><h2>Assigned Teachers</h2><p>Manage teachers for {scopedChildNames}. Changes apply to this School, Class and Section group.</p></div></div><div className="teacher-toolbar">{selectGroup}<button className="primary teacher-popup-trigger" onClick={openTeacherModal}>＋ Add Teacher</button></div></div><div className="teacher-grid">{workspace.teachers.map(t => <article className="teacher-card" key={t.id}><div className="teacher-card-main"><div className="teacher-info"><div className="teacher-name-line"><h3>{t.name}</h3></div><div className="teacher-meta"><p><span className="teacher-meta-label">Subjects:</span> {t.subjects.join(', ') || 'No subjects assigned'}</p><p><span className="teacher-meta-label">Gender:</span> {t.voiceGender === 'male' ? 'Male' : 'Female'}</p><p><span className="teacher-meta-label">Language:</span> {t.voiceLanguage || 'English'}</p></div></div></div><div className="teacher-card-actions"><button className="tile-action view-btn" onClick={() => viewTeacher(t)}>View</button><button className="tile-action edit-btn" onClick={() => modifyTeacher(t)}>Modify</button><button className="tile-action delete-btn" onClick={() => deleteTeacher(t)}>Delete</button></div></article>)}</div></div></div>{teacherModalOpen && <div className="modal-backdrop"><div className="modal-card teacher-form-card"><div className="modal-header"><div><small>TEACHER DETAILS</small><h2>Add Teacher</h2></div><button type="button" onClick={() => setTeacherModalOpen(false)} aria-label="Close add teacher dialog">✕</button></div><div className="teacher-form-grid"><label>Teacher Name<input value={teacherDraft.name} onChange={event => setTeacherDraft({ ...teacherDraft, name: event.target.value })} placeholder="Enter teacher name" /></label><label>Subject<select value={teacherDraft.subject} onChange={event => setTeacherDraft({ ...teacherDraft, subject: event.target.value })} aria-label="Teacher subject"><option value="">Select</option>{workspace.subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></label><label>Gender<select value={teacherDraft.gender} onChange={event => setTeacherDraft({ ...teacherDraft, gender: event.target.value as 'female' | 'male' })} aria-label="Teacher gender"><option value="female">Female</option><option value="male">Male</option></select></label><label>Language / Voice<select value={teacherDraft.language} onChange={event => setTeacherDraft({ ...teacherDraft, language: event.target.value as 'English' | 'Hindi' | 'Tamil' | 'Telugu' })} aria-label="Teacher voice language">{['English', 'Hindi', 'Tamil', 'Telugu'].map(option => <option key={option} value={option}>{option}</option>)}</select></label></div><div className="teacher-modal-actions"><button className="secondary" type="button" onClick={() => setTeacherModalOpen(false)}>Cancel</button><button className="primary" type="button" onClick={saveTeacher}>Save Teacher</button></div></div></div>}</>}

    {teacherView && <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><small>TEACHER DETAILS</small><h2>{teacherView.name}</h2></div><button type="button" onClick={() => setTeacherView(null)} aria-label="Close teacher details dialog">✕</button></div><div className="detail-grid">{[['Teacher ID', teacherView.id], ['Subjects', teacherView.subjects.join(', ') || 'No subjects assigned'], ['Gender', teacherView.voiceGender === 'male' ? 'Male' : 'Female'], ['Language / Voice', teacherView.voiceLanguage || 'English']].map(([label, value]) => <div className="detail-item" key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div></div></div>}
    {teacherEdit && <div className="modal-backdrop"><div className="modal-card teacher-form-card"><div className="modal-header"><div><small>TEACHER DETAILS</small><h2>Modify Teacher</h2></div><button type="button" onClick={() => setTeacherEdit(null)} aria-label="Close modify teacher dialog">✕</button></div><div className="teacher-form-grid"><label>Teacher Name<input value={teacherEdit.name} onChange={event => setTeacherEdit({ ...teacherEdit, name: event.target.value })} /></label><label>Subjects<input value={teacherEdit.subjects.join(', ')} onChange={event => setTeacherEdit({ ...teacherEdit, subjects: event.target.value.split(',') })} /></label><label>Gender<select value={teacherEdit.voiceGender} onChange={event => setTeacherEdit({ ...teacherEdit, voiceGender: event.target.value as TeacherProfile['voiceGender'] })}><option value="female">Female</option><option value="male">Male</option></select></label><label>Language / Voice<select value={teacherEdit.voiceLanguage} onChange={event => setTeacherEdit({ ...teacherEdit, voiceLanguage: event.target.value as TeacherProfile['voiceLanguage'] })}>{['English', 'Hindi', 'Tamil', 'Telugu'].map(option => <option key={option} value={option}>{option}</option>)}</select></label></div><div className="teacher-modal-actions"><button className="secondary" type="button" onClick={() => setTeacherEdit(null)}>Cancel</button><button className="primary" type="button" onClick={saveTeacherEdit}>Save Changes</button></div></div></div>}
    {teacherDelete && <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><small>DELETE TEACHER</small><h2>Delete {teacherDelete.name}?</h2></div><button type="button" onClick={() => setTeacherDelete(null)} aria-label="Close delete teacher dialog">✕</button></div><p>This teacher will be removed from this child's learning setup. This action cannot be undone.</p><div className="teacher-modal-actions"><button className="secondary" type="button" onClick={() => setTeacherDelete(null)}>Cancel</button><button className="danger" type="button" onClick={confirmDeleteTeacher}>Delete Teacher</button></div></div></div>}

    {mode === 'subjects' && <div className="subject-list">{workspace.subjects.map((value, subjectIndex) => <article className="panel" key={value} style={{ marginBottom: 14 }}><div className="section-heading"><div><h2>📘 {value}</h2><p>{workspace.chapters.filter(chapter => chapter.subject === value).length} chapter(s) · Upload a chapter file and enter its name.</p></div></div><div className="subject-add-row"><label className="upload-button" style={{ background: SUBJECT_UPLOAD_COLORS[subjectIndex % SUBJECT_UPLOAD_COLORS.length] }}>{busySubject === value && busyAction === 'chapter' ? 'Reading…' : '＋ Upload Chapter'}<input type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={Boolean(busySubject)} onChange={event => void uploadChapter(event, value)}/></label></div>{workspace.chapters.filter(chapter => chapter.subject === value).map(chapter => {
      const activePage = chapter.pages.find(page => page.number === selectedPageNumber) || chapter.pages[0];
      const readablePages = chapter.pages.filter(page => page.text.trim()).length;
      const unreadablePages = chapter.pages.length - readablePages;
      const readLabel = chapter.readStatus === 'ocr_pending' ? 'OCR pending' : unreadablePages ? 'Partially read' : 'Successfully read';
      const reviewLabel = chapter.reviewStatus === 'review_required' ? 'Review required' : 'Confirmed for teaching';
      return <details key={chapter.id} className="subject-row" open={chapter.id === chapterId}><summary><strong>📖 {chapter.title}</strong><span>{chapter.pages.length ? `${chapter.pages.length} pages split · ${readablePages} read successfully${unreadablePages ? ` · ${unreadablePages} need review` : ''} · ${chapter.fileName}` : 'Chapter name only · textbook pages not available'}</span>{chapter.sourceUrl && <a href={chapter.sourceUrl} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>Open file</a>}</summary><div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <div className="tt-notice" role={chapter.reviewStatus === 'review_required' ? 'alert' : 'status'}><strong>{reviewLabel}</strong> · {readLabel} · {readablePages} of {chapter.pages.length} pages contain extracted text. {chapter.readStatus === 'ocr_pending' && 'The original and split pages are saved in Drive; retry OCR when processing is available. '} {chapter.driveFolderUrl && <a href={chapter.driveFolderUrl} target="_blank" rel="noreferrer">Open chapter folder in Google Drive</a>}</div>
        {chapter.pages.length > 0 && <div><h3 style={{ margin: '0 0 8px' }}>Pages</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 10 }}>
          {chapter.pages.map(page => {
            const preview = page.text.trim().split(/\s+/).slice(0, 8).join(' ') || 'No text detected';
            const isSelected = page.number === activePage?.number;
            return <button type="button" key={page.number} aria-label={`Open page ${page.number}`} onClick={() => { setChapterId(chapter.id); setSelectedPageNumber(page.number); }} style={{ textAlign: 'left', cursor: 'pointer', border: `2px solid ${isSelected ? 'var(--kid-green, #21644d)' : '#d8e2dc'}`, borderRadius: 10, padding: 10, background: isSelected ? '#eef8f1' : '#fff', minHeight: 92 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Page {page.number}</strong><span style={{ display: 'block', fontSize: 12, lineHeight: 1.35, color: '#65756d' }}>{preview}{page.text.trim() ? '…' : ''}</span>
            </button>;
          })}
        </div></div>}
        {activePage && <div className="panel" style={{ padding: 16, background: 'var(--panel-soft, #f6f6f6)' }}><div className="section-heading"><div><h3 style={{ margin: 0 }}>Page {activePage.number}</h3><p style={{ margin: '4px 0 0' }}>Full page view · click another thumbnail to navigate</p></div></div><p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{activePage.text || 'No readable text detected on this page.'}</p></div>}
        {chapter.reviewStatus === 'review_required' && <button className="primary" disabled={chapter.readStatus === 'ocr_pending' || !chapter.pages.length} onClick={() => confirmChapter(chapter)}>✓ Confirm chapter and make ready to teach</button>}
        <button className="danger" disabled={Boolean(busySubject)} onClick={() => void deleteChapter(chapter)}>Delete Chapter and Drive Files</button>
      </div></details>;
    })}{!workspace.chapters.some(chapter => chapter.subject === value) && <p>No chapters uploaded yet. Upload a PDF, JPG, JPEG or PNG chapter file.</p>}</article>)}{!workspace.subjects.length && <div className="coming-section panel"><h2>No subjects yet</h2><p>Add subjects under Time Table / Subjects. If no timetable exists, subjects can be created there manually.</p></div>}</div>}

    {mode === 'tests' && <><div className="panel"><h2>Create school / Gurukulam assessment</h2><div className="form-grid"><label>Test name<input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Maths Chapter Test"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Assessment type<select value={testType} onChange={e => setTestType(e.target.value as TestExam['type'])}><option value="Gurukulam">Gurukulam</option><option value="School">School</option></select></label><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Topics<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chapters / concepts"/></label></div><button className="primary" onClick={addTest}>＋ Schedule Test</button></div><div className="child-list">{workspace.tests.map(t => <article className="child-row" key={t.id}><div><h3>📝 {t.title}</h3><p>{t.type} · {t.subject} · {t.date}</p><span className="child-school">{t.topics}</span></div><button className="danger" onClick={() => setWorkspace({ ...workspace, tests: workspace.tests.filter(x => x.id !== t.id) })}>Delete</button></article>)}</div></>}

    {mode === 'teaching' && <><div className="panel"><h2>Plan today's teaching</h2><div className="form-grid"><label>Subject<select value={subject} onChange={e => { setSubject(e.target.value); setChapterId(''); setPageNumbers([]); }}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Chapter<select value={chapterId} onChange={e => { setChapterId(e.target.value); setPageNumbers([]); }}><option value="">Select chapter</option>{subjectChapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label><label>Teaching scope<select value={scope} onChange={e => { setScope(e.target.value as TeachingScope); setPageNumbers([]); }}><option value="full_chapter">Full chapter</option><option value="pages">Specific pages</option></select></label></div>{selectedChapter && scope === 'pages' && <div className="panel" style={{ marginTop: 14 }}><h3>Select pages from {selectedChapter.title}</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>{selectedChapter.pages.map(page => <label key={page.number} className="subject-row" style={{ cursor: 'pointer' }}><input type="checkbox" checked={pageNumbers.includes(page.number)} onChange={event => setPageNumbers(current => event.target.checked ? [...current, page.number] : current.filter(number => number !== page.number))}/><strong>Page {page.number}</strong></label>)}</div></div>}{!subjectChapters.length && subject && <p className="tt-notice">No chapters uploaded for this subject yet. Upload a chapter under Subjects before creating today's teaching.</p>}<button className="primary" disabled={Boolean(busySubject) || !selectedChapter || (scope === 'pages' && !pageNumbers.length)} onClick={addTeaching}>＋ Add to Today's Teaching</button></div><div className="child-list">{workspace.today.map(t => <article className="child-row" key={t.id}><div><h3>📖 {t.subject}: {t.topic}</h3><p>{t.duration} minutes · {t.objective}</p></div><button className={t.completed ? 'secondary' : 'primary'} onClick={() => setWorkspace({ ...workspace, today: workspace.today.map(x => x.id === t.id ? { ...x, completed: !x.completed } : x) })}>{t.completed ? 'Completed' : 'Mark Complete'}</button></article>)}</div></>}

    {mode === 'homework' && <><div className="panel"><h2>Assign homework</h2><div className="form-grid"><label>Title<input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Addition practice"/></label><label>Subject<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">Select subject</option>{workspace.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Due date<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Instructions<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What should the child do?"/></label></div><button className="primary" onClick={addHomework}>＋ Assign Homework</button></div><div className="child-list">{workspace.homework.map(h => <article className="child-row" key={h.id}><div><h3>🏠 {h.title}</h3><p>{h.subject} · Due {h.dueDate} · {h.status}</p><span className="child-school">{h.instructions}</span></div><button className="danger" onClick={() => setWorkspace({ ...workspace, homework: workspace.homework.filter(x => x.id !== h.id) })}>Delete</button></article>)}</div></>}
  </section>;
}
