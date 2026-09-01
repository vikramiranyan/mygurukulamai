import React, { useMemo, useState } from 'react';
import { starterCurriculum, type Chapter, type Subject, teacherFor } from '../curriculum';
import { getLessonContent, gradeAnswer } from '../aiTutor/lessonContent';
import { generateTeachingPlan } from '../aiTutor/teachingPlan';
import { checkTutorInput } from '../aiTutor/tutorSafety';
import { nextPhase, scoreAnswers, startSession, type AnswerRecord, type LearningSession } from '../core/learningSession';
import type { Child } from '../types/parent';

type Props = { child: Child; onParents: () => void; signout: () => void };
const subjects = Object.keys(starterCurriculum) as Subject[];

export function LearningHome({ child, onParents, signout }: Props) {
  const [subject, setSubject] = useState<Subject>('English');
  const [chapter, setChapter] = useState<Chapter>(starterCurriculum.English[0]);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [question, setQuestion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [checkIndex, setCheckIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');

  const chapters = starterCurriculum[subject];
  const lesson = useMemo(() => getLessonContent(chapter.id, chapter.title), [chapter]);
  const plan = useMemo(() => generateTeachingPlan({ subject, chapter: chapter.title, concepts: [chapter.title], profile: { mastery: session?.masteryScore ? session.masteryScore / 100 : 0 } }), [subject, chapter, session?.masteryScore]);

  const resetChapter = (nextSubject: Subject, nextChapter: Chapter) => {
    setSubject(nextSubject); setChapter(nextChapter); setSession(null); setAnswers([]); setFeedback(''); setCheckIndex(0); setStudentAnswer('');
  };
  const begin = () => { setSession(startSession(child.id, subject, chapter.id)); setAnswers([]); setCheckIndex(0); setStudentAnswer(''); setFeedback(''); };
  const askTutor = () => {
    const decision = checkTutorInput(question);
    if (!decision.allowed) { setFeedback(decision.reason || 'I cannot help with that request.'); return; }
    setFeedback(question.trim() ? `${teacherFor(subject)} says: Let's explore “${question.trim()}” using ${chapter.title}. Start with the lesson explanation, then try the examples and checks.` : 'Ask me something about this lesson.');
  };
  const submitAnswer = () => {
    const check = lesson.checks[checkIndex];
    if (!check) return;
    const correct = gradeAnswer(studentAnswer, check.expected);
    const nextAnswers = [...answers, { questionId: check.id, correct }];
    const score = scoreAnswers(nextAnswers); const phase = nextPhase(score);
    setAnswers(nextAnswers); setSession({ ...(session || startSession(child.id, subject, chapter.id)), phase, answers: nextAnswers, masteryScore: score });
    setFeedback(correct ? `Correct! Your current mastery is ${score}%.` : `Not quite. ${plan.mode === 'reteach' ? 'Let’s revisit the explanation and try again.' : 'Let’s use another example and try again.'}`);
    setStudentAnswer('');
    if (checkIndex < lesson.checks.length - 1) setCheckIndex(checkIndex + 1);
  };

  return <div className="app dashboard-app" style={{ minHeight: '100vh' }}>
    <header><div className="gurukulam-brand"><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><div className="dashboard-actions"><button className="parent-access" onClick={onParents}>👨‍👩‍👧 Parent Dashboard</button><button className="dashboard-signout" onClick={signout}>⇥ Sign out</button></div></header>
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section className="panel" style={{ marginBottom: 20 }}><small>MY LEARNING SPACE</small><h1>Hello, {child.name || 'Student'}! 👋</h1><p>Learn with {teacherFor(subject)}, practise, and check what you know.</p></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>1. Choose a subject</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{subjects.map(item => <button key={item} className={subject === item ? 'primary' : 'secondary'} onClick={() => resetChapter(item, starterCurriculum[item][0])}>{item}</button>)}</div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>2. Choose a chapter</h2><div style={{ display: 'grid', gap: 10 }}>{chapters.map(item => <button key={item.id} className={chapter.id === item.id ? 'selected' : ''} style={{ textAlign: 'left', padding: 14 }} onClick={() => resetChapter(subject, item)}><strong>{item.title}</strong><br /><small>Teacher: {item.teacher}</small></button>)}</div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>3. Lesson: {lesson.title}</h2><p><strong>Today's goal:</strong> {lesson.objective}</p><p>{lesson.explanation}</p><h3>Examples</h3><ul>{lesson.examples.map(example => <li key={example}>{example}</li>)}</ul>{!session ? <button className="primary" onClick={begin}>▶ Start Lesson</button> : <><div style={{ padding: 14, borderRadius: 12, background: 'var(--panel-soft, #f6f6f6)', marginBottom: 14 }}><strong>{plan.mode.toUpperCase()}</strong><p>{plan.steps.join(' → ')}</p><p>Mastery: <strong>{session.masteryScore}%</strong></p></div><h3>Understanding check</h3>{lesson.checks[checkIndex] ? <><p>{lesson.checks[checkIndex].prompt}</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }} placeholder="Type your answer" aria-label="Your answer"/><button className="primary" disabled={!studentAnswer.trim()} onClick={submitAnswer}>Check Answer</button></div></> : <p>🎉 You completed this lesson's checks. Final mastery: <strong>{session.masteryScore}%</strong>.</p>}{feedback && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</>}</section>
      <section className="panel"><h2>💬 Ask your AI teacher</h2><p>Questions are checked for age-appropriate safety before being answered.</p><div style={{ display: 'flex', gap: 10 }}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Ask about ${chapter.title}`} onKeyDown={e => { if (e.key === 'Enter') askTutor(); }}/><button className="primary" onClick={askTutor}>Ask</button></div>{feedback && !session && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</section>
    </main><footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}
