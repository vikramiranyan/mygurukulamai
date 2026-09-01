import React, { useEffect, useMemo, useState } from 'react';
import { starterCurriculum, type Chapter, type Subject } from '../curriculum';
import { getLessonContent, gradeAnswer, type LessonContent } from '../aiTutor/lessonContent';
import { generateTeachingPlan } from '../aiTutor/teachingPlan';
import { checkTutorInput, ageAppropriateInstruction } from '../aiTutor/tutorSafety';
import { diagnoseMistake, remediationMessage, recommendNextStep, type LearningSignal } from '../core/adaptiveLearning';
import { nextPhase, scoreAnswers, startSession, type AnswerRecord, type LearningSession } from '../core/learningSession';
import { BrowserVoice } from '../voice/browserVoice';
import type { Child } from '../types/parent';
import type { ChapterPage, ChapterRecord, ChildWorkspace } from '../learningWorkspace';

type Props = { child: Child; onParents: () => void; signout: () => void; workspace?: ChildWorkspace };
const starterSubjects = Object.keys(starterCurriculum) as Subject[];
const emptyWorkspace: ChildWorkspace = { teachers: [], subjects: [], chapters: [], tests: [], today: [], homework: [] };

function fallbackChapters(subject: string): Chapter[] {
  return starterSubjects.includes(subject as Subject) ? starterCurriculum[subject as Subject] : [];
}
function teacherNameFor(subject: string, workspace: ChildWorkspace): string {
  return workspace.teachers.find(t => t.subjects.includes(subject) && t.enabled)?.name || workspace.teachers.find(t => t.enabled)?.name || 'Your AI Teacher';
}
function isUploadedChapter(chapter: ChapterRecord | Chapter): chapter is ChapterRecord {
  return 'fileName' in chapter && Array.isArray(chapter.pages) && (chapter.pages.length === 0 || typeof chapter.pages[0] !== 'number');
}
function uploadedPages(chapter: ChapterRecord | Chapter): ChapterPage[] {
  return isUploadedChapter(chapter) ? chapter.pages : [];
}
function chapterLesson(chapter: ChapterRecord | Chapter, targetPages?: number[]): LessonContent {
  const base = getLessonContent(chapter.id, chapter.title);
  const pages = uploadedPages(chapter);
  if (!pages.length) return base;
  const selected = targetPages?.length ? pages.filter(page => targetPages.includes(page.number)) : pages;
  const excerpts = selected.map(page => page.text).filter(Boolean).slice(0, 4);
  return { ...base, explanation: excerpts.length ? excerpts.join(' ') : base.explanation, examples: excerpts.length ? excerpts.slice(0, 3) : base.examples };
}

function childAge(dob: string): number | undefined {
  if (!dob) return undefined;
  const date = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday = now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 120 ? age : undefined;
}

export function LearningHome({ child, onParents, signout, workspace = emptyWorkspace }: Props) {
  const availableSubjects = workspace.subjects.length ? workspace.subjects : starterSubjects;
  const [subject, setSubject] = useState(availableSubjects[0] || 'English');
  const [chapterId, setChapterId] = useState('');
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [signals, setSignals] = useState<LearningSignal[]>([]);
  const [question, setQuestion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [checkIndex, setCheckIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Voice is off until you choose the microphone.');
  const [voice] = useState(() => new BrowserVoice());

  const customChapters = useMemo(() => workspace.chapters.filter(chapter => chapter.subject === subject), [workspace.chapters, subject]);
  const chapters: Array<ChapterRecord | Chapter> = customChapters.length ? customChapters : fallbackChapters(subject);
  const chapter = useMemo(() => chapters.find(item => item.id === chapterId) || chapters[0], [chapters, chapterId]);
  const activeToday = workspace.today.filter(item => item.subject === subject && item.chapterId === chapter?.id);
  const currentTarget = activeToday[0];
  const targetPages = currentTarget?.scope === 'pages' ? currentTarget.pageNumbers : undefined;
  const lesson = useMemo(() => chapter ? chapterLesson(chapter, targetPages) : getLessonContent('empty', 'Your next lesson'), [chapter, targetPages]);
  const age = childAge(child.dob);
  const plan = useMemo(() => generateTeachingPlan({ subject, chapter: chapter?.title || 'Next lesson', concepts: [chapter?.title || 'Next lesson'], profile: { mastery: session?.masteryScore ? session.masteryScore / 100 : 0, age, recentMistakes: signals.filter(signal => !signal.correct).map(() => chapter?.title || subject), consecutiveIncorrect: signals.slice(-3).filter(signal => !signal.correct).length } }), [subject, chapter, session?.masteryScore, age, signals]);
  const adaptive = useMemo(() => recommendNextStep(signals, session?.masteryScore ? session.masteryScore / 100 : 0), [signals, session?.masteryScore]);
  const teacherName = teacherNameFor(subject, workspace);

  useEffect(() => () => { voice.stopSTT(); voice.stopSpeaking(); }, [voice]);

  const resetForSubject = (nextSubject: string) => {
    const nextCustom = workspace.chapters.filter(item => item.subject === nextSubject);
    const nextFallback = fallbackChapters(nextSubject);
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    setSubject(nextSubject); setChapterId((nextCustom[0] || nextFallback[0])?.id || ''); setSession(null); setAnswers([]); setSignals([]); setFeedback(''); setCheckIndex(0); setStudentAnswer(''); setQuestion('');
  };
  const resetChapter = (nextChapter: ChapterRecord | Chapter) => {
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    setChapterId(nextChapter.id); setSession(null); setAnswers([]); setSignals([]); setFeedback(''); setCheckIndex(0); setStudentAnswer('');
  };
  const begin = () => { if (!chapter) return; setSession(startSession(child.id, subject, chapter.id)); setAnswers([]); setSignals([]); setCheckIndex(0); setStudentAnswer(''); setFeedback(''); };

  const speakFeedback = async (text: string) => {
    if (!text || !voice.supportsTTS()) return;
    setSpeaking(true);
    try { await voice.speak(ageAppropriateInstruction(text, age), 'en-IN', age && age < 9 ? 0.82 : 0.9); }
    catch { setVoiceStatus('I could not play the voice reply. You can still read it here.'); }
    finally { setSpeaking(false); }
  };

  const respondToTutor = (rawQuestion: string, speak = false) => {
    const decision = checkTutorInput(rawQuestion);
    if (!decision.allowed) { setFeedback(decision.reason || 'I cannot help with that request.'); if (speak) void speakFeedback(decision.reason || 'I cannot help with that request.'); return; }
    const safeQuestion = decision.normalized || rawQuestion.trim();
    const response = `${teacherName} says: Let's explore “${safeQuestion}” using ${chapter?.title || 'this lesson'}. ${currentTarget ? `Today's parent-selected target is ${currentTarget.topic}.` : 'Start with the lesson explanation, then try the examples and checks.'}`;
    setFeedback(response);
    if (speak) void speakFeedback(response);
  };

  const askTutor = () => respondToTutor(question, true);

  const startVoice = async () => {
    if (listening) { voice.stopSTT(); setListening(false); setVoiceStatus('Microphone stopped.'); return; }
    try {
      await voice.requestMicrophone();
      if (!voice.supportsSTT()) { setVoiceStatus('Voice input is not supported by this browser. You can type instead.'); return; }
      setVoiceStatus('Listening… ask a question about your lesson.'); setListening(true);
      voice.startSTT('en-IN', result => {
        if (!result.final) return;
        setListening(false); setQuestion(result.text); setVoiceStatus('Got it. Thinking…'); respondToTutor(result.text, true);
      }, error => {
        setListening(false);
        const messages: Record<string, string> = { 'permission-denied': 'Microphone permission was not granted. You can enable it in browser settings.', unsupported: 'Voice input is not supported here.', 'no-speech': 'I did not hear a question. Try again when you are ready.', network: 'Voice recognition needs a network connection.' };
        setVoiceStatus(messages[error] || 'Voice input could not start. You can type instead.');
      });
    } catch (error) {
      setListening(false);
      const code = error instanceof Error ? error.message : 'unknown';
      setVoiceStatus(code === 'permission-denied' ? 'Microphone permission was not granted.' : 'Microphone is not available right now.');
    }
  };

  const stopVoiceReply = () => { voice.stopSpeaking(); setSpeaking(false); setVoiceStatus('Voice reply stopped.'); };

  const submitAnswer = () => {
    const check = lesson.checks[checkIndex]; if (!check) return;
    const attempts = answers.filter(answer => answer.questionId === check.id).length + 1;
    const correct = gradeAnswer(studentAnswer, check.expected);
    const diagnosis = diagnoseMistake(studentAnswer, check.expected);
    const nextAnswers = [...answers, { questionId: check.id, correct }];
    const nextSignals = [...signals, { correct, attempts }];
    const score = scoreAnswers(nextAnswers); const phase = nextPhase(score);
    const nextAdaptive = recommendNextStep(nextSignals, score / 100);
    const message = correct ? `Correct! Your current mastery is ${score}%. ${nextAdaptive.band === 'advance' ? 'You are ready for a challenge!' : 'Let’s keep building this skill.'}` : `${remediationMessage(chapter?.title || subject, diagnosis)} ${nextAdaptive.band === 'reteach' ? 'We will slow down and try a simpler example.' : 'Then we will try another check.'}`;
    setAnswers(nextAnswers); setSignals(nextSignals); setSession({ ...(session || startSession(child.id, subject, chapter?.id || 'lesson')), phase, answers: nextAnswers, masteryScore: score });
    setFeedback(message); setStudentAnswer(''); if (checkIndex < lesson.checks.length - 1) setCheckIndex(checkIndex + 1); else void speakFeedback(message);
  };

  return <div className="app dashboard-app" style={{ minHeight: '100vh' }}>
    <header><div className="gurukulam-brand"><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><div className="dashboard-actions"><button className="parent-access" onClick={onParents}>👨‍👩‍👧 Parent Dashboard</button><button className="dashboard-signout" onClick={signout}>⇥ Sign out</button></div></header>
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section className="panel teacher-presence" style={{ marginBottom: 20 }}><div className="teacher-presence-copy"><small>MY LEARNING SPACE</small><h1>Hello, {child.name || 'Student'}! 👋</h1><p>Learn with {teacherName}, practise, and check what you know.</p></div><div className={`teacher-orb ${listening ? 'is-listening' : ''} ${speaking ? 'is-speaking' : ''}`} aria-label={`${teacherName} is ${listening ? 'listening' : speaking ? 'speaking' : 'ready'}`}><div className="teacher-orb-face">{teacherName.toLowerCase().includes('raji') ? '👩🏽‍🏫' : '👨🏽‍🏫'}</div><span>{listening ? 'Listening…' : speaking ? 'Speaking…' : 'Ready to learn'}</span></div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📖 Today's Teaching</h2>{workspace.today.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.today.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.subject}: {item.topic}</strong><div>{item.duration} min · {item.objective} {item.completed ? ' · ✓ Completed' : ''}</div></div>)}</div> : <p>Your parent will build today's learning plan from your subjects and textbook chapters.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>🏠 Homework</h2>{workspace.homework.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.homework.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.title}</strong><div>{item.subject} · Due {item.dueDate} · {item.status}</div><small>{item.instructions}</small></div>)}</div> : <p>No homework assigned yet. Great job staying ready!</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📝 Tests & Exams</h2>{workspace.tests.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.tests.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.title}</strong><div>{item.type} · {item.subject} · {item.date}</div><small>{item.topics}</small></div>)}</div> : <p>No upcoming tests have been scheduled.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>👨‍🏫 My Teachers</h2>{workspace.teachers.length ? workspace.teachers.filter(t => t.enabled).map(t => <div key={t.id} style={{ padding: 10 }}><strong>{t.name}</strong> · {t.subjects.join(', ') || 'All configured subjects'}<br /><small>{t.role} · {t.style}</small></div>) : <p>Your parent has not configured teacher details yet.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📚 Choose a subject</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{availableSubjects.map(item => <button key={item} className={subject === item ? 'primary' : 'secondary'} onClick={() => resetForSubject(item)}>{item}</button>)}</div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>Choose a chapter</h2>{chapters.length ? <div style={{ display: 'grid', gap: 10 }}>{chapters.map(item => { const uploaded = isUploadedChapter(item); return <button key={item.id} className={chapter?.id === item.id ? 'selected' : ''} style={{ textAlign: 'left', padding: 14 }} onClick={() => resetChapter(item)}><strong>{item.title}</strong><br /><small>{uploaded ? `${item.pages.length} pages · Parent uploaded` : `Teacher: ${item.teacher}`}</small></button>; })}</div> : <p>No chapter has been uploaded for {subject} yet. Your parent can add it from Parent Dashboard → Subjects.</p>}</section>
      {chapter && <section className="panel" style={{ marginBottom: 20 }}><h2>Lesson: {lesson.title}</h2>{currentTarget && <div className="tt-notice"><strong>Parent-selected teaching target:</strong> {currentTarget.topic}{currentTarget.scope === 'pages' && currentTarget.pageNumbers?.length ? ` · Pages ${currentTarget.pageNumbers.join(', ')}` : ''}</div>}<p><strong>Today's goal:</strong> {lesson.objective}</p><p>{lesson.explanation}</p><h3>Examples / Source pages</h3><ul>{lesson.examples.map((example, index) => <li key={`${index}-${example}`}>{example}</li>)}</ul>{!session ? <button className="primary" onClick={begin}>▶ Start Lesson</button> : <><div style={{ padding: 14, borderRadius: 12, background: 'var(--panel-soft, #f6f6f6)', marginBottom: 14 }}><strong>{plan.mode.toUpperCase()}</strong><p>{plan.steps.join(' → ')}</p><p>{adaptive.reason}</p><p>Mastery: <strong>{session.masteryScore}%</strong> · Confidence: <strong>{adaptive.confidence}%</strong></p></div><h3>Understanding check</h3>{lesson.checks[checkIndex] ? <><p>{lesson.checks[checkIndex].prompt}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input maxLength={300} value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }} placeholder="Type your answer" aria-label="Your answer"/><button className="primary" disabled={!studentAnswer.trim()} onClick={submitAnswer}>Check Answer</button></div></> : <p>🎉 You completed this lesson's checks. Final mastery: <strong>{session.masteryScore}%</strong>.</p>}{feedback && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</>}</section>}
      <section className="panel"><h2>💬 Ask your AI teacher</h2><p>Questions are checked for age-appropriate safety before being answered. Nothing is sent to an AI provider by this screen.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Ask about ${chapter?.title || subject}`} onKeyDown={e => { if (e.key === 'Enter') askTutor(); }} aria-label="Question for your AI teacher"/><button className="primary" disabled={!question.trim()} onClick={askTutor}>Ask</button><button className={listening ? 'danger' : 'secondary'} onClick={() => void startVoice()} aria-pressed={listening}>{listening ? '■ Stop listening' : '🎙 Ask by voice'}</button>{speaking && <button className="secondary" onClick={stopVoiceReply}>🔇 Stop reply</button>}</div><small className="voice-status" role="status">{voiceStatus}</small>{feedback && !session && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</section>
    </main><footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}
