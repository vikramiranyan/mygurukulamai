import React, { useEffect, useMemo, useState } from 'react';
import { getLessonContent, gradeAnswer, type LessonContent } from '../aiTutor/lessonContent';
import { generateTeachingPlan } from '../aiTutor/teachingPlan';
import { checkTutorInput, ageAppropriateInstruction } from '../aiTutor/tutorSafety';
import { diagnoseMistake, remediationMessage, recommendNextStep, type LearningSignal } from '../core/adaptiveLearning';
import { nextPhase, scoreAnswers, startSession, type AnswerRecord, type LearningSession } from '../core/learningSession';
import { BrowserVoice } from '../voice/browserVoice';
import type { Child } from '../types/parent';
import type { ChapterPage, ChapterRecord, ChildWorkspace } from '../learningWorkspace';

type Props = { child: Child; onParents: () => void; signout: () => void; workspace?: ChildWorkspace };
const emptyWorkspace: ChildWorkspace = { teachers: [], subjects: [], chapters: [], tests: [], today: [], homework: [] };

function teacherNameFor(subject: string, workspace: ChildWorkspace): string | null {
  return workspace.teachers.find(t => t.enabled && t.subjects.includes(subject))?.name || null;
}
function isUploadedChapter(chapter: ChapterRecord): chapter is ChapterRecord {
  return Array.isArray(chapter.pages);
}
function uploadedPages(chapter: ChapterRecord): ChapterPage[] { return isUploadedChapter(chapter) ? chapter.pages : []; }
function chapterLesson(chapter: ChapterRecord, targetPages?: number[]): LessonContent {
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
  const availableSubjects = workspace.subjects;
  const [subject, setSubject] = useState(availableSubjects[0] || '');
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
  const chapter = useMemo(() => customChapters.find(item => item.id === chapterId) || customChapters[0], [customChapters, chapterId]);
  const activeToday = workspace.today.filter(item => item.subject === subject && item.chapterId === chapter?.id);
  const currentTarget = activeToday[0];
  const targetPages = currentTarget?.scope === 'pages' ? currentTarget.pageNumbers : undefined;
  const lesson = useMemo(() => chapter ? chapterLesson(chapter, targetPages) : null, [chapter, targetPages]);
  const age = childAge(child.dob);
  const plan = useMemo(() => generateTeachingPlan({ subject, chapter: chapter?.title || 'Next lesson', concepts: [chapter?.title || 'Next lesson'], profile: { mastery: session?.masteryScore ? session.masteryScore / 100 : 0, age, recentMistakes: signals.filter(signal => !signal.correct).map(() => chapter?.title || subject), consecutiveIncorrect: signals.slice(-3).filter(signal => !signal.correct).length } }), [subject, chapter, session?.masteryScore, age, signals]);
  const adaptive = useMemo(() => recommendNextStep(signals, session?.masteryScore ? session.masteryScore / 100 : 0), [signals, session?.masteryScore]);
  const teacherName = teacherNameFor(subject, workspace);

  useEffect(() => () => { voice.stopSTT(); voice.stopSpeaking(); }, [voice]);
  useEffect(() => { if (!workspace.subjects.includes(subject)) { setSubject(workspace.subjects[0] || ''); setChapterId(''); } }, [workspace.subjects, subject]);

  const resetForSubject = (nextSubject: string) => {
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    const nextChapter = workspace.chapters.find(item => item.subject === nextSubject);
    setSubject(nextSubject); setChapterId(nextChapter?.id || ''); setSession(null); setAnswers([]); setSignals([]); setFeedback(''); setCheckIndex(0); setStudentAnswer(''); setQuestion('');
  };
  const resetChapter = (nextChapter: ChapterRecord) => {
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    setChapterId(nextChapter.id); setSession(null); setAnswers([]); setSignals([]); setFeedback(''); setCheckIndex(0); setStudentAnswer('');
  };
  const begin = () => {
    if (!chapter || !teacherName) { setFeedback('Your parent must assign a teacher to this subject before the lesson can start.'); return; }
    setSession(startSession(child.id, subject, chapter.id)); setAnswers([]); setSignals([]); setCheckIndex(0); setStudentAnswer(''); setFeedback('');
  };
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
    const q = safeQuestion.toLocaleLowerCase();
    let response = '';

    // The child-facing tutor must teach, not merely echo the child's request.
    if (/\b(numbers?|count|counting)\b/.test(q) && /(10|ten|upto|up to|1-10|one to ten)/.test(q)) {
      response = `${teacherName || 'Your teacher'} says: Great! Let's learn numbers from 1 to 10.\n\n1 — one\n2 — two\n3 — three\n4 — four\n5 — five\n6 — six\n7 — seven\n8 — eight\n9 — nine\n10 — ten\n\nLet's count together: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10! 🎉\n\nNow your turn: What number comes after 5? Type the answer, or use the microphone and say it. I will check your answer and then teach you the next step.`;
    } else if (/\b(alphabet|letters|a to z|a-z)\b/.test(q)) {
      response = `${teacherName || 'Your teacher'} says: Wonderful! Let's practise the English alphabet.\n\nA B C D E F G H I J K L M N O P Q R S T U V W X Y Z\n\nWe can learn a few letters at a time. A is for Apple 🍎, B is for Ball ⚽, and C is for Cat 🐱.\n\nCan you tell me which letter comes after B?`;
    } else if (/\b(add|addition|plus)\b/.test(q)) {
      response = `${teacherName || 'Your teacher'} says: Let's learn addition! Addition means putting groups together. For example, 2 + 3 means 2 things and 3 more things. Count them: 1, 2, 3, 4, 5. So 2 + 3 = 5.\n\nYour turn: What is 1 + 2?`;
    } else if (/\b(hello|hi|hey)\b/.test(q.trim())) {
      response = `${teacherName || 'Your teacher'} says: Hello! 👋 I am ready to learn with you. Tell me what you want to learn, such as numbers 1 to 10, the alphabet, addition, or your current lesson.`;
    } else {
      const lessonName = chapter?.title || subject || 'today’s lesson';
      response = `${teacherName || 'Your teacher'} says: Let's learn this step by step. You asked: “${safeQuestion}”. We are working on ${lessonName}. First, I'll explain it simply, then we'll practise with an example, and finally I'll ask you one short question to check your understanding.\n\nTell me what part you want to learn first, or ask me a specific question about ${lessonName}.`;
    }
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
      voice.startSTT('en-IN', result => { if (!result.final) return; setListening(false); setQuestion(result.text); setVoiceStatus('Got it. Thinking…'); respondToTutor(result.text, true); }, error => {
        setListening(false);
        const messages: Record<string, string> = { 'permission-denied': 'Microphone permission was not granted. You can enable it in browser settings.', unsupported: 'Voice input is not supported here.', 'no-speech': 'I did not hear a question. Try again when you are ready.', network: 'Voice recognition needs a network connection.' };
        setVoiceStatus(messages[error] || 'Voice input could not start. You can type instead.');
      });
    } catch (error) { setListening(false); setVoiceStatus(error instanceof Error && error.message === 'permission-denied' ? 'Microphone permission was not granted.' : 'Microphone is not available right now.'); }
  };
  const stopVoiceReply = () => { voice.stopSpeaking(); setSpeaking(false); setVoiceStatus('Voice reply stopped.'); };
  const submitAnswer = () => {
    if (!lesson) return;
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
      <section className="panel teacher-presence" style={{ marginBottom: 20 }}><div className="teacher-presence-copy"><small>MY LEARNING SPACE</small><h1>Hello, {child.name || 'Student'}! 👋</h1><p>{teacherName ? `Learn with ${teacherName}, practise, and check what you know.` : 'Your parent controls which teacher teaches each subject.'}</p></div><div className={`teacher-orb ${listening ? 'is-listening' : ''} ${speaking ? 'is-speaking' : ''}`} aria-label={`${teacherName || 'Teacher'} is ${listening ? 'listening' : speaking ? 'speaking' : 'ready'}`}><div className="teacher-orb-face">{teacherName ? '👩🏽‍🏫' : '👨🏽‍🏫'}</div><span>{listening ? 'Listening…' : speaking ? 'Speaking…' : teacherName ? 'Ready to learn' : 'Teacher not assigned'}</span></div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📖 Today's Teaching</h2>{workspace.today.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.today.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.subject}: {item.topic}</strong><div>{item.duration} min · {item.objective} {item.completed ? ' · ✓ Completed' : ''}</div></div>)}</div> : <p>Your parent will build today's learning plan from your subjects and textbook chapters.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>🏠 Homework</h2>{workspace.homework.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.homework.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.title}</strong><div>{item.subject} · Due {item.dueDate} · {item.status}</div><small>{item.instructions}</small></div>)}</div> : <p>No homework assigned yet. Great job staying ready!</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📝 Tests & Exams</h2>{workspace.tests.length ? <div style={{ display: 'grid', gap: 8 }}>{workspace.tests.map(item => <div key={item.id} style={{ padding: 12, borderRadius: 10, background: 'var(--panel-soft, #f6f6f6)' }}><strong>{item.title}</strong><div>{item.type} · {item.subject} · {item.date}</div><small>{item.topics}</small></div>)}</div> : <p>No upcoming tests have been scheduled.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>👨‍🏫 My Teachers</h2>{workspace.teachers.length ? workspace.teachers.filter(t => t.enabled).map(t => <div key={t.id} style={{ padding: 10 }}><strong>{t.name}</strong> · {t.subjects.join(', ')}<br /><small>{t.role} · {t.style}</small></div>) : <p>Your parent has not configured teacher details yet.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>📚 Choose a subject</h2>{availableSubjects.length ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{availableSubjects.map(item => <button key={item} className={subject === item ? 'primary' : 'secondary'} onClick={() => resetForSubject(item)}>{item}</button>)}</div> : <p>No subjects are configured yet. Ask your parent to add subjects from Time Table / Subjects.</p>}</section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>Choose a chapter</h2>{customChapters.length ? <div style={{ display: 'grid', gap: 10 }}>{customChapters.map(item => <button key={item.id} className={chapter?.id === item.id ? 'selected' : ''} style={{ textAlign: 'left', padding: 14 }} onClick={() => resetChapter(item)}><strong>{item.title}</strong><br /><small>{item.pages.length} pages · Parent uploaded</small></button>)}</div> : <p>No chapter has been uploaded for {subject || 'this subject'} yet. Your parent can add it from Parent Dashboard → Subjects.</p>}</section>
      {chapter && lesson && <section className="panel" style={{ marginBottom: 20 }}><h2>Lesson: {lesson.title}</h2>{currentTarget && <div className="tt-notice"><strong>Parent-selected teaching target:</strong> {currentTarget.topic}{currentTarget.scope === 'pages' && currentTarget.pageNumbers?.length ? ` · Pages ${currentTarget.pageNumbers.join(', ')}` : ''}</div>}{!teacherName && <div className="tt-notice"><strong>Teacher setup required:</strong> Ask your parent to assign a teacher to {subject} before starting this lesson.</div>}<p><strong>Today's goal:</strong> {lesson.objective}</p><p>{lesson.explanation}</p><h3>Examples / Source pages</h3><ul>{lesson.examples.map((example, index) => <li key={`${index}-${example}`}>{example}</li>)}</ul>{!session ? <button className="primary" disabled={!teacherName} onClick={begin}>▶ Start Lesson</button> : <><div style={{ padding: 14, borderRadius: 12, background: 'var(--panel-soft, #f6f6f6)', marginBottom: 14 }}><strong>{plan.mode.toUpperCase()}</strong><p>{plan.steps.join(' → ')}</p><p>{adaptive.reason}</p><p>Mastery: <strong>{session.masteryScore}%</strong> · Confidence: <strong>{adaptive.confidence}%</strong></p></div><h3>Understanding check</h3>{lesson.checks[checkIndex] ? <><p>{lesson.checks[checkIndex].prompt}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input maxLength={300} value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }} placeholder="Type your answer" aria-label="Your answer"/><button className="primary" disabled={!studentAnswer.trim()} onClick={submitAnswer}>Check Answer</button></div></> : <p>🎉 You completed this lesson's checks. Final mastery: <strong>{session.masteryScore}%</strong>.</p>}{feedback && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</>}</section>}
      <section className="panel"><h2>💬 Ask your AI teacher</h2><p>Questions are checked for age-appropriate safety before being answered. Nothing is sent to an AI provider by this screen.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Ask about ${chapter?.title || subject || 'your lesson'}`} onKeyDown={e => { if (e.key === 'Enter') askTutor(); }} aria-label="Question for your AI teacher"/><button className="primary" disabled={!question.trim()} onClick={askTutor}>Ask</button><button className={listening ? 'danger' : 'secondary'} onClick={() => void startVoice()} aria-pressed={listening}>{listening ? '■ Stop listening' : '🎙 Ask by voice'}</button>{speaking && <button className="secondary" onClick={stopVoiceReply}>🔇 Stop reply</button>}</div><small className="voice-status" role="status">{voiceStatus}</small>{feedback && !session && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</section>
    </main><footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}
