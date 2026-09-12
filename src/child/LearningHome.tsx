import React, { useEffect, useMemo, useState } from 'react';
import { askHostedTutor, speechLanguage, type TutorLanguage } from '../aiTutor/hostedTutor';
import { getLessonContent, gradeAnswer, type LessonContent } from '../aiTutor/lessonContent';
import { generateTeachingPlan } from '../aiTutor/teachingPlan';
import { checkTutorInput, ageAppropriateInstruction } from '../aiTutor/tutorSafety';
import { diagnoseMistake, remediationMessage, recommendNextStep, type LearningSignal } from '../core/adaptiveLearning';
import { nextPhase, scoreAnswers, startSession, type AnswerRecord, type LearningSession } from '../core/learningSession';
import { BrowserVoice } from '../voice/browserVoice';
import { getActiveDriveSync } from '../storage/driveSync';
import type { Child } from '../types/parent';
import type { ChapterPage, ChapterRecord, ChildWorkspace, LearningProgressEntry } from '../learningWorkspace';
import { TeacherCompanion } from './TeacherCompanion';

type Props = { child: Child; onParents: () => void; signout: () => void; workspace?: ChildWorkspace; onWorkspaceChange?: (workspace: ChildWorkspace) => void };
const emptyWorkspace: ChildWorkspace = { teachers: [], subjects: [], chapters: [], tests: [], today: [], homework: [], learningProgress: {} };

function teacherNameFor(subject: string, workspace: ChildWorkspace): string | null {
  return workspace.teachers.find(t => t.enabled && t.subjects.includes(subject))?.name || null;
}
function isUploadedChapter(chapter: ChapterRecord): chapter is ChapterRecord { return Array.isArray(chapter.pages); }
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
function progressKey(subject: string, chapterId: string): string { return `${subject.trim()}|${chapterId.trim()}`; }
function progressFromWorkspace(workspace: ChildWorkspace, subject: string, chapterId: string): LearningProgressEntry | undefined { return workspace.learningProgress?.[progressKey(subject, chapterId)]; }

export function LearningHome({ child, onParents, signout, workspace = emptyWorkspace, onWorkspaceChange }: Props) {
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
  const [language, setLanguage] = useState<TutorLanguage>('English');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [tutorBusy, setTutorBusy] = useState(false);
  const [playMode, setPlayMode] = useState<'story' | 'cards' | 'challenge' | 'maths' | 'brainstorm' | 'calm' | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeMessage, setChallengeMessage] = useState('');
  const [brainstormPrompt, setBrainstormPrompt] = useState('');
  const tutorRequest = React.useRef<AbortController | null>(null);
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

  useEffect(() => () => { voice.stopSTT(); voice.stopSpeaking(); tutorRequest.current?.abort(); }, [voice]);
  useEffect(() => { if (!workspace.subjects.includes(subject)) { setSubject(workspace.subjects[0] || ''); setChapterId(''); } }, [workspace.subjects, subject]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!chapter) return;
      const driveSync = getActiveDriveSync();
      let latestWorkspace = workspace;
      if (driveSync?.authorized) {
        try { latestWorkspace = (await driveSync.loadWorkspace(child.id)) || workspace; } catch { latestWorkspace = workspace; }
      }
      if (cancelled) return;
      const entry = progressFromWorkspace(latestWorkspace, subject, chapter.id);
      if (!entry) return;
      setSession(entry.session as LearningSession);
      setAnswers(entry.session.answers as AnswerRecord[]);
      setSignals(entry.signals as LearningSignal[]);
      const nextIndex = Math.min(entry.session.answers.length, Math.max(0, (lesson?.checks.length || 1) - 1));
      setCheckIndex(nextIndex);
      setFeedback(`Welcome back! Your saved mastery for ${chapter.title} is ${entry.session.masteryScore}%.`);
    };
    void restore();
    return () => { cancelled = true; };
  }, [child.id, chapter?.id, subject]);

  const persistProgress = async (nextSession: LearningSession, nextSignals: LearningSignal[]) => {
    const driveSync = getActiveDriveSync();
    if (!driveSync?.authorized || !nextSession.chapterId) return;
    const key = progressKey(nextSession.subject, nextSession.chapterId);
    const entry: LearningProgressEntry = { subject: nextSession.subject, chapterId: nextSession.chapterId, session: nextSession, signals: nextSignals.map(signal => ({ questionId: signal.questionId, correct: signal.correct, attempts: signal.attempts })), updatedAt: Date.now() };
    const nextWorkspace: ChildWorkspace = { ...workspace, learningProgress: { ...(workspace.learningProgress || {}), [key]: entry } };
    try { await driveSync.saveWorkspace(child.id, nextWorkspace); }
    catch (error) { console.error('Learning progress save failed:', error); setFeedback('Your answer was recorded here, but Google Drive could not save the progress yet. We will retry on the next answer.'); }
  };
  const updateWorkspace = async (nextWorkspace: ChildWorkspace) => {
    onWorkspaceChange?.(nextWorkspace);
    const driveSync = getActiveDriveSync();
    if (!driveSync?.authorized) { setFeedback('This change is shown here, but Google Drive is not connected yet.'); return; }
    try { await driveSync.saveWorkspace(child.id, nextWorkspace); setFeedback('Saved successfully.'); }
    catch (error) { setFeedback(error instanceof Error ? error.message : 'Could not save this change.'); }
  };
  const completeHomework = (id: string) => {
    const nextWorkspace = { ...workspace, homework: workspace.homework.map(item => item.id === id ? { ...item, status: 'Completed' as const } : item) };
    void updateWorkspace(nextWorkspace);
  };
  const completeTeaching = (id: string) => {
    const nextWorkspace = { ...workspace, today: workspace.today.map(item => item.id === id ? { ...item, completed: true } : item) };
    void updateWorkspace(nextWorkspace);
  };

  const resetForSubject = (nextSubject: string) => {
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    const nextChapter = workspace.chapters.find(item => item.subject === nextSubject);
    const saved = nextChapter ? progressFromWorkspace(workspace, nextSubject, nextChapter.id) : undefined;
    setSubject(nextSubject); setChapterId(nextChapter?.id || ''); setSession(saved?.session as LearningSession | null); setAnswers((saved?.session.answers as AnswerRecord[]) || []); setSignals((saved?.signals as LearningSignal[]) || []); setFeedback(saved ? `Saved mastery: ${saved.session.masteryScore}%.` : ''); setCheckIndex(saved ? Math.min(saved.session.answers.length, Math.max(0, (getLessonContent(nextChapter?.id || '', nextChapter?.title || '').checks.length || 1) - 1)) : 0); setStudentAnswer(''); setQuestion('');
  };
  const resetChapter = (nextChapter: ChapterRecord) => {
    voice.stopSTT(); voice.stopSpeaking(); setListening(false); setSpeaking(false);
    const saved = progressFromWorkspace(workspace, subject, nextChapter.id);
    setChapterId(nextChapter.id); setSession(saved?.session as LearningSession | null); setAnswers((saved?.session.answers as AnswerRecord[]) || []); setSignals((saved?.signals as LearningSignal[]) || []); setFeedback(saved ? `Saved mastery: ${saved.session.masteryScore}%.` : ''); setCheckIndex(saved ? Math.min(saved.session.answers.length, Math.max(0, (getLessonContent(nextChapter.id, nextChapter.title).checks.length || 1) - 1)) : 0); setStudentAnswer('');
  };
  const begin = () => {
    if (!chapter || !teacherName) { setFeedback('Your parent must assign a teacher to this subject before the lesson can start.'); return; }
    const saved = progressFromWorkspace(workspace, subject, chapter.id);
    if (saved) { setSession(saved.session as LearningSession); setAnswers(saved.session.answers as AnswerRecord[]); setSignals(saved.signals as LearningSignal[]); setCheckIndex(Math.min(saved.session.answers.length, Math.max(0, (lesson?.checks.length || 1) - 1))); setFeedback(`Welcome back! Your saved mastery is ${saved.session.masteryScore}%.`); return; }
    const nextSession = startSession(child.id, subject, chapter.id);
    setSession(nextSession); setAnswers([]); setSignals([]); setCheckIndex(0); setStudentAnswer(''); setFeedback('');
    void persistProgress(nextSession, []);
  };
  const speakFeedback = async (text: string, responseLanguage: TutorLanguage = language) => {
    if (!text || !voice.supportsTTS()) return;
    setSpeaking(true);
    try { await voice.speak(ageAppropriateInstruction(text, age), speechLanguage(responseLanguage), age && age < 9 ? 0.82 : 0.9); }
    catch { setVoiceStatus('I could not play the voice reply. You can still read it here.'); }
    finally { setSpeaking(false); }
  };
  const respondToTutor = async (rawQuestion: string, speak = false) => {
    const decision = checkTutorInput(rawQuestion);
    if (!decision.allowed) { setFeedback(decision.reason || 'I cannot help with that request.'); if (speak) void speakFeedback(decision.reason || 'I cannot help with that request.'); return; }
    const safeQuestion = decision.normalized || rawQuestion.trim();
    try {
      tutorRequest.current?.abort();
      const controller = new AbortController();
      tutorRequest.current = controller;
      setTutorBusy(true);
      const textbookContext = chapter ? uploadedPages(chapter).map(page => `Page ${page.number}: ${page.text}`).join('\n').slice(0, 12000) : '';
      const hosted = await askHostedTutor({ question: safeQuestion, language, subject, chapter: chapter?.title || subject || 'today’s lesson', grade: child.grade, teacherName: teacherName || undefined, textbookContext }, controller.signal);
      if (hosted) { setFeedback(hosted.text); if (speak) void speakFeedback(hosted.text, hosted.language); return; }
      throw new Error('The hosted tutor returned no answer.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'The internet-connected tutor is unavailable.';
      setFeedback(message);
      if (speak) void speakFeedback(message, language);
      return;
    } finally { setTutorBusy(false); }
  };
  const askTutor = () => { if (!tutorBusy) void respondToTutor(question, true); };
  const startVoice = async () => {
    if (listening) { voice.stopSTT(); setListening(false); setVoiceStatus('Microphone stopped.'); return; }
    try {
      await voice.requestMicrophone();
      if (!voice.supportsSTT()) { setVoiceStatus('Voice input is not supported by this browser. You can type instead.'); return; }
      setVoiceStatus('Listening… ask a question about your lesson.'); setListening(true);
      voice.startSTT(speechLanguage(language), result => { if (!result.final) return; setListening(false); setQuestion(result.text); setVoiceStatus('Got it. Thinking…'); void respondToTutor(result.text, true); }, error => {
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
    const nextAnswers: AnswerRecord[] = [...answers, { questionId: check.id, correct, attempts }];
    const nextSignals: LearningSignal[] = [...signals, { questionId: check.id, correct, attempts }];
    const score = scoreAnswers(nextAnswers); const phase = nextPhase(score);
    const nextAdaptive = recommendNextStep(nextSignals, score / 100);
    const baseSession = session || startSession(child.id, subject, chapter?.id || 'lesson');
    const nextSession: LearningSession = { ...baseSession, childId: child.id, subject, chapterId: chapter?.id || baseSession.chapterId, phase, answers: nextAnswers, masteryScore: score, lastActivityAt: Date.now(), streak: correct ? baseSession.streak + 1 : 0 };
    const message = correct ? `Correct! Your current mastery is ${score}%. ${nextAdaptive.band === 'advance' ? 'You are ready for a challenge!' : 'Let’s keep building this skill.'}` : `${remediationMessage(chapter?.title || subject, diagnosis)} ${nextAdaptive.band === 'reteach' ? 'We will slow down and try a simpler example.' : 'Then we will try another check.'}`;
    setAnswers(nextAnswers); setSignals(nextSignals); setSession(nextSession); setFeedback(message); setStudentAnswer('');
    void persistProgress(nextSession, nextSignals);
    if (checkIndex < lesson.checks.length - 1) setCheckIndex(checkIndex + 1); else void speakFeedback(message);
  };
  const completedToday = workspace.today.filter(item => item.completed).length;
  const currentMastery = session?.masteryScore || 0;
  const subjectIcon = (value: string) => {
    const name = value.toLocaleLowerCase();
    if (name.includes('math')) return '🔢';
    if (name.includes('english') || name.includes('language')) return '📚';
    if (name.includes('science') || name.includes('evs')) return '🔬';
    if (name.includes('art') || name.includes('drawing')) return '🎨';
    if (name.includes('computer')) return '💻';
    return '🌱';
  };
  const focusLesson = () => document.getElementById('child-lesson')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const focusTeacher = () => document.getElementById('child-teacher')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const playFeatures = [
    { id: 'story' as const, icon: '📖', title: 'Story journey', text: 'Learn through a short story.' },
    { id: 'cards' as const, icon: '🃏', title: 'Flashcards', text: 'Remember key ideas.' },
    { id: 'challenge' as const, icon: '🏅', title: 'Daily challenge', text: 'One brave question.' },
    { id: 'maths' as const, icon: '🔢', title: 'Speed Maths', text: 'Warm up your number brain.' },
    { id: 'brainstorm' as const, icon: '💡', title: 'Brainstorm', text: 'Ask a why or what-if.' },
    { id: 'calm' as const, icon: '🌿', title: 'Calm corner', text: 'Breathe before learning.' },
  ];
  const flashcards = [
    { front: subject || 'Learning', back: chapter?.title || 'Choose a chapter to begin' },
    { front: 'Teacher tip', back: 'Explain your answer in your own words.' },
    { front: 'Brave learner', back: 'A mistake is a clue that helps you grow.' },
  ];
  const submitChallenge = () => setChallengeMessage(challengeAnswer.trim().toLowerCase() === '7' ? 'Wonderful! You found the answer.' : 'Good try! Think of 3 + 4 and try once more.');

  return <div className="app dashboard-app child-dashboard-v2" style={{ minHeight: '100vh' }}>
    <header className="child-topbar">
      <div className="child-brand-lockup">
        <div className="child-brand-mark" aria-hidden="true">G<span>AI</span></div>
        <div className="brand"><strong>Gurukulam AI</strong><small>My Learning Space</small></div>
      </div>
      <nav className="child-nav" aria-label="Learning sections">
        <button className="active" onClick={() => focusSection('child-home')}>Home</button>
        <button onClick={() => focusSection('child-worlds')}>Worlds</button>
        <button onClick={() => focusSection('child-practice')}>Practice</button>
        <button onClick={focusTeacher}>Teacher</button>
      </nav>
      <div className="dashboard-actions child-top-actions">
        <button className="parent-access" onClick={onParents}>👨‍👩‍👧 <span>Parent Dashboard</span></button>
        <button className="dashboard-signout" onClick={signout}>⇥ <span>Sign out</span></button>
      </div>
    </header>
    <main id="child-home" className="child-main">
      <section className="child-hero panel">
        <div className="child-hero-copy">
          <div className="hero-kicker">✨ MY LEARNING SPACE</div>
          <h1>Hello, {child.name || 'Student'}! <span>👋</span></h1>
          <p>{teacherName ? `Learn with ${teacherName}, practise new skills, and show what you know.` : 'Your parent controls which teacher teaches each subject.'}</p>
          <div className="hero-chips"><span>📚 Learn</span><span>🎯 Practise</span><span>⭐ Grow</span></div>
        </div>
        <div className="hero-art-wrap">
          <img src="./assets/gurukulam-two-girls-3d.png" alt="Two children learning together" className="hero-art" />
          <TeacherCompanion name={teacherName} subject={subject} speaking={speaking} listening={listening} onAsk={focusTeacher} />
        </div>
        <div className="hero-sparkles" aria-hidden="true">✦　✧　★</div>
      </section>
      <section className="child-section-head">
        <div><span>YOUR ADVENTURE</span><h2>Small steps, big discoveries</h2></div>
        <div className="section-path">{completedToday}/{workspace.today.length || 1} steps complete</div>
      </section>
      <section className="adventure-board panel">
        <div className="adventure-intro"><span className="adventure-icon">🗺️</span><div><strong>{currentTarget ? currentTarget.topic : chapter ? `Explore ${chapter.title}` : 'Choose your first adventure'}</strong><p>{currentTarget ? `${currentTarget.duration} minutes · ${currentTarget.completed ? 'Adventure complete' : currentTarget.objective}` : 'Pick a learning world below and meet your teacher.'}</p></div><button className="adventure-cta" onClick={focusLesson} disabled={!chapter || !teacherName}>{session ? 'Continue lesson' : 'Enter lesson'} <span>→</span></button></div>
        <div className="adventure-steps" aria-label="Learning journey">
          {['Warm up', 'Meet teacher', 'Try it', 'Celebrate'].map((step, index) => <div key={step} className={`adventure-step ${index === (session ? 2 : 0) ? 'current' : index < (session ? 2 : 0) ? 'done' : ''}`}><span>{index < (session ? 2 : 0) ? '✓' : index + 1}</span><small>{step}</small></div>)}
        </div>
      </section>
      <section id="child-worlds" className="child-section-head compact-head">
        <div><span>EXPLORE YOUR WORLDS</span><h2>Where will you go today?</h2></div>
        <div className="section-path">Tap a world to choose a lesson</div>
      </section>
      <div className="world-grid">
        {availableSubjects.length ? availableSubjects.map(item => {
          const worldChapter = workspace.chapters.find(entry => entry.subject === item);
          const worldProgress = worldChapter ? progressFromWorkspace(workspace, item, worldChapter.id)?.session.masteryScore || 0 : 0;
          return <button key={item} className={`world-card ${subject === item ? 'active' : ''}`} onClick={() => resetForSubject(item)}><span className="world-art">{subjectIcon(item)}</span><span className="world-copy"><strong>{item}</strong><small>{worldChapter ? `${worldProgress}% discovered` : 'Coming soon'}</small><i><b style={{ width: `${worldProgress}%` }} /></i></span><span className="world-arrow">→</span></button>;
        }) : <div className="empty-world"><span>🌱</span><strong>Your learning garden is ready</strong><p>Your parent can add your first subject from the Parent Dashboard.</p></div>}
      </div>
      <section id="child-practice" className="child-section-head compact-head">
        <div><span>PLAYFUL PRACTICE</span><h2>Choose a little learning game</h2></div>
        <div className="section-path">Short, friendly activities</div>
      </section>
      <section className="feature-studio panel">
        <div className="feature-grid">{playFeatures.map(feature => <button key={feature.id} className={`feature-tile feature-${feature.id} ${playMode === feature.id ? 'active' : ''}`} onClick={() => { setPlayMode(feature.id); setChallengeMessage(''); }}><span>{feature.icon}</span><strong>{feature.title}</strong><small>{feature.text}</small></button>)}</div>
        {playMode && <div className="feature-stage">
          {playMode === 'story' && <><span className="stage-kicker">STORY JOURNEY</span><h3>The little seed that kept trying</h3><p>A tiny seed wanted to touch the sunlight. Each day it practised reaching a little higher. Your learning grows in the same way: one curious question at a time.</p><button className="stage-action" onClick={() => void speakFeedback('Your learning grows one curious question at a time.')}>🔊 Read it aloud</button></>}
          {playMode === 'cards' && <><span className="stage-kicker">FLASHCARD {flashcardIndex + 1} OF {flashcards.length}</span><h3>{flashcards[flashcardIndex].front}</h3><p>{flashcards[flashcardIndex].back}</p><button className="stage-action" onClick={() => setFlashcardIndex((flashcardIndex + 1) % flashcards.length)}>Next card →</button></>}
          {playMode === 'challenge' && <><span className="stage-kicker">DAILY CHALLENGE</span><h3>What is 3 + 4?</h3><div className="stage-answer"><input value={challengeAnswer} onChange={event => setChallengeAnswer(event.target.value)} aria-label="Daily challenge answer" placeholder="Your answer" /><button className="stage-action" onClick={submitChallenge}>Check</button></div>{challengeMessage && <p className="stage-message" role="status">{challengeMessage}</p>}</>}
          {playMode === 'maths' && <><span className="stage-kicker">NUMBER WARM-UP</span><h3>Can you count by 2s?</h3><p>2 · 4 · 6 · 8 · 10 · 12 · 14</p><button className="stage-action" onClick={() => setChallengeMessage('Excellent rhythm! Now try counting backwards.')}>I did it!</button>{challengeMessage && <p className="stage-message" role="status">{challengeMessage}</p>}</>}
          {playMode === 'brainstorm' && <><span className="stage-kicker">BRAINSTORM</span><h3>What would you like to wonder about?</h3><div className="stage-answer"><input value={brainstormPrompt} onChange={event => setBrainstormPrompt(event.target.value)} aria-label="Brainstorm question" placeholder="Why does…?" /><button className="stage-action" onClick={() => void respondToTutor(brainstormPrompt || 'Tell me a fun why question about my lesson.', true)}>Explore</button></div></>}
          {playMode === 'calm' && <><span className="stage-kicker">CALM CORNER</span><h3>Take three gentle breaths</h3><p>Inhale slowly… hold softly… exhale like you are blowing a feather away.</p><button className="stage-action" onClick={() => setChallengeMessage('You are ready. Let’s learn with a calm mind.')}>I feel ready 🌿</button>{challengeMessage && <p className="stage-message" role="status">{challengeMessage}</p>}</>}
        </div>}
      </section>
      <div className="quick-grid">
        <section className="quick-card quick-today panel">
          <div className="quick-icon">📖</div><div className="quick-label">TODAY</div><h3>Teaching plan</h3>
          {workspace.today.length ? <div className="quick-list">{workspace.today.slice(0, 2).map(item => <div key={item.id}><strong>{item.subject}: {item.topic}</strong><small>{item.duration} min · {item.completed ? '✓ Completed' : item.objective}</small>{!item.completed && <button className="secondary" onClick={() => completeTeaching(item.id)}>Mark complete</button>}</div>)}</div> : <p>Your next lesson will appear here when your parent creates today’s plan.</p>}
        </section>
        <section className="quick-card quick-homework panel">
          <div className="quick-icon">🎒</div><div className="quick-label">PRACTISE</div><h3>Homework</h3>
          {workspace.homework.length ? <div className="quick-list">{workspace.homework.slice(0, 2).map(item => <div key={item.id}><strong>{item.title}</strong><small>{item.subject} · Due {item.dueDate} · {item.status}</small>{item.status !== 'Completed' && <button className="secondary" onClick={() => completeHomework(item.id)}>Mark done</button>}</div>)}</div> : <p>No homework yet. Great job staying ready!</p>}
        </section>
        <section className="quick-card quick-tests panel">
          <div className="quick-icon">🏆</div><div className="quick-label">MILESTONES</div><h3>My progress</h3>
          <div className="progress-orbit"><strong>{currentMastery}%</strong><small>current mastery</small></div><p>Every brave try helps your learning garden grow.</p>
        </section>
        <section className="quick-card quick-teachers panel" data-active-teacher={teacherName || ''} data-active-subject={subject}>
          <div className="quick-icon">👩🏽‍🏫</div><div className="quick-label">YOUR GUIDE</div><h3>Ask your teacher</h3>
          {teacherName ? <><p>{teacherName} is ready to help with {subject || 'your lesson'}.</p><button className="secondary" onClick={focusTeacher}>Ask a question</button></> : <p>Your parent has not configured teacher details yet.</p>}
        </section>
      </div>
      <section className="learning-path panel">
        <div className="learning-path-title"><div className="path-icon">🧭</div><div><span>LEARNING PATH</span><h2>Choose what to learn</h2></div></div>
        <div className="path-controls">
          <div className="path-block"><label>1 · SUBJECT</label>{availableSubjects.length ? <div className="subject-pills">{availableSubjects.map(item => <button key={item} className={subject === item ? 'subject-pill active' : 'subject-pill'} data-subject={item} onClick={() => resetForSubject(item)}>{item}</button>)}</div> : <p>No subjects are configured yet. Ask your parent to add subjects from Time Table / Subjects.</p>}</div>
          <div className="path-arrow" aria-hidden="true">→</div>
          <div className="path-block"><label>2 · CHAPTER</label>{customChapters.length ? <div className="chapter-pills">{customChapters.map(item => <button key={item.id} className={chapter?.id === item.id ? 'chapter-pill active' : 'chapter-pill'} onClick={() => resetChapter(item)}><strong>{item.title}</strong><small>{item.pages.length} pages</small></button>)}</div> : <p>No chapter has been uploaded for {subject || 'this subject'} yet. Your parent can add it from Parent Dashboard → Subjects.</p>}</div>
        </div>
      </section>
      {chapter && lesson && <section id="child-lesson" className="lesson-card panel">
        <div className="lesson-heading"><div><span>📘 YOUR LESSON</span><h2>{lesson.title}</h2></div>{session && <div className="mastery-badge">⭐ {session.masteryScore}% mastery</div>}</div>
        {currentTarget && <div className="tt-notice lesson-target"><strong>Today’s target:</strong> {currentTarget.topic}{currentTarget.scope === 'pages' && currentTarget.pageNumbers?.length ? ` · Pages ${currentTarget.pageNumbers.join(', ')}` : ''}</div>}
        {!teacherName && <div className="tt-notice lesson-target"><strong>Teacher setup required:</strong> Ask your parent to assign a teacher to {subject} before starting this lesson.</div>}
        <div className="lesson-body"><div><p className="lesson-goal"><strong>🎯 Today’s goal:</strong> {lesson.objective}</p><p>{lesson.explanation}</p></div><div className="example-box"><span>💡 TRY THIS</span><ul>{lesson.examples.map((example, index) => <li key={`${index}-${example}`}>{example}</li>)}</ul></div></div>
        {!session ? <button className="primary lesson-start" disabled={!teacherName} onClick={begin}>▶ Start Lesson</button> : <div className="lesson-session"><div className="session-summary"><strong>{plan.mode.toUpperCase()}</strong><span>{adaptive.reason}</span><small>Confidence {adaptive.confidence}%</small></div><h3>Understanding check</h3>{lesson.checks[checkIndex] ? <><p>{lesson.checks[checkIndex].prompt}</p><div className="answer-row"><input maxLength={300} value={studentAnswer} onChange={e => setStudentAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }} placeholder="Type your answer" aria-label="Your answer"/><button className="primary" disabled={!studentAnswer.trim()} onClick={submitAnswer}>Check Answer</button></div></> : <p>🎉 You completed this lesson’s checks. Final mastery: <strong>{session.masteryScore}%</strong>.</p>}{feedback && <div className="tt-notice feedback-box" role="status">{feedback}</div>}</div>}
      </section>}
      <section id="child-teacher" className="ai-teacher-card panel">
        <div className="ai-copy"><div className="ai-label">🤖 ALWAYS READY TO HELP</div><h2>Ask your AI teacher</h2><p>Ask a question about <strong>{chapter?.title || subject || 'your lesson'}</strong>. I’ll keep the explanation simple and age-appropriate.</p><div className="ai-input-row"><select value={language} onChange={e => setLanguage(e.target.value as TutorLanguage)} aria-label="Teacher language">{(['English', 'Hindi', 'Tamil', 'Telugu'] as TutorLanguage[]).map(item => <option key={item}>{item}</option>)}</select><input maxLength={500} value={question} onChange={e => setQuestion(e.target.value)} placeholder={`Ask about ${chapter?.title || subject || 'your lesson'}`} onKeyDown={e => { if (e.key === 'Enter') askTutor(); }} aria-label="Question for your AI teacher"/>        <button className="primary" disabled={!question.trim() || tutorBusy} onClick={askTutor}>{tutorBusy ? 'Thinking…' : 'Ask ✨'}</button></div><div className="voice-row"><button className={listening ? 'voice-button active' : 'voice-button'} onClick={() => void startVoice()} aria-pressed={listening}>{listening ? '■ Stop listening' : '🎙 Ask by voice'}</button>{speaking && <button className="voice-button" onClick={stopVoiceReply}>🔇 Stop reply</button>}<small className="voice-status" role="status">{voiceStatus}</small></div></div>
        <div className="ai-robot" aria-hidden="true"><div className="robot-face">🤖</div><div className="robot-bubble">“Let’s learn<br/>together!”</div></div>
        {feedback && !session && <div className="ai-response" role="status"><strong>{teacherName || 'Your AI teacher'}</strong><span>{feedback}</span></div>}
      </section>
    </main>
    <footer className="child-footer"><span>Gurukulam AI</span> · Parent-controlled learning environment · Made for curious minds 🌱</footer>
  </div>;
}
