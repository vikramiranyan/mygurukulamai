import React, { useMemo, useState } from 'react';
import { starterCurriculum, type Chapter, type Subject, teacherFor } from '../curriculum';
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

  const chapters = starterCurriculum[subject];
  const plan = useMemo(() => generateTeachingPlan({ subject, chapter: chapter.title, concepts: [chapter.title], profile: { mastery: session?.masteryScore ? session.masteryScore / 100 : 0 } }), [subject, chapter, session?.masteryScore]);

  const chooseSubject = (value: Subject) => {
    setSubject(value);
    setChapter(starterCurriculum[value][0]);
    setSession(null); setAnswers([]); setFeedback('');
  };

  const begin = () => {
    setSession(startSession(child.id, subject, chapter.id));
    setAnswers([]); setQuestion(''); setFeedback('');
  };

  const askTutor = () => {
    const decision = checkTutorInput(question);
    if (!decision.allowed) { setFeedback(decision.reason || 'I cannot help with that request.'); return; }
    setFeedback(question.trim() ? `Great question! Your ${subject} teacher ${teacherFor(subject)} would explain “${question.trim()}” step by step.` : 'Ask me something about this lesson.');
  };

  const submitCheck = (correct: boolean) => {
    const nextAnswers = [...answers, { questionId: `${chapter.id}-${answers.length + 1}`, correct }];
    const score = scoreAnswers(nextAnswers);
    const phase = nextPhase(score);
    setAnswers(nextAnswers);
    setSession({ ...(session || startSession(child.id, subject, chapter.id)), phase, answers: nextAnswers, masteryScore: score });
    setFeedback(correct ? `Correct! Current mastery: ${score}%.` : `Let's learn it again. Current mastery: ${score}%.`);
  };

  return <div className="app dashboard-app" style={{ minHeight: '100vh' }}>
    <header><div className="gurukulam-brand"><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><div className="dashboard-actions"><button className="parent-access" onClick={onParents}>👨‍👩‍👧 Parent Dashboard</button><button className="dashboard-signout" onClick={signout}>⇥ Sign out</button></div></header>
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <section className="panel" style={{ marginBottom: 20 }}><small>MY LEARNING SPACE</small><h1>Hello, {child.name || 'Student'}! 👋</h1><p>Choose a subject and start today's lesson with your personal AI teacher.</p></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>1. Choose a subject</h2><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{subjects.map(item => <button key={item} className={subject === item ? 'primary' : 'secondary'} onClick={() => chooseSubject(item)}>{item}</button>)}</div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>2. Choose a chapter</h2><div style={{ display: 'grid', gap: 10 }}>{chapters.map(item => <button key={item.id} className={chapter.id === item.id ? 'selected' : ''} style={{ textAlign: 'left', padding: 14 }} onClick={() => { setChapter(item); setSession(null); setAnswers([]); setFeedback(''); }}><strong>{item.title}</strong><br /><small>Teacher: {item.teacher} · {item.sourceStatus === 'needs_verification' ? 'Needs parent verification' : 'Trusted source'}</small></button>)}</div></section>
      <section className="panel" style={{ marginBottom: 20 }}><h2>3. {session ? 'Learning session' : 'Start learning'}</h2><p>{plan.steps.join(' → ')}</p>{!session ? <button className="primary" onClick={begin}>▶ Start {chapter.title}</button> : <><div style={{ padding: 14, borderRadius: 12, background: 'var(--panel-soft, #f6f6f6)', marginBottom: 14 }}><strong>{plan.mode.toUpperCase()}</strong><p>Teacher {chapter.teacher} is guiding this lesson. Mastery: {session.masteryScore}%</p></div><h3>Quick understanding check</h3><p>Did the explanation make this concept clear?</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="primary" onClick={() => submitCheck(true)}>Yes, I understand</button><button className="secondary" onClick={() => submitCheck(false)}>No, teach me again</button></div>{feedback && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</>}</section>
      <section className="panel"><h2>💬 Ask your AI teacher</h2><p>Questions are checked for age-appropriate safety before being answered.</p><div style={{ display: 'flex', gap: 10 }}><input value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Ask about ${chapter.title}`} onKeyDown={e => { if (e.key === 'Enter') askTutor(); }} /><button className="primary" onClick={askTutor}>Ask</button></div>{feedback && !session && <div className="tt-notice" role="status" style={{ marginTop: 14 }}>{feedback}</div>}</section>
    </main>
    <footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}
