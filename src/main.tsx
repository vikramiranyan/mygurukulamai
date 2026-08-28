import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import {credentialToSession, isSessionValid, type AuthSession} from './auth/googleAuth';

type Subject = {name: string; teacher: 'Vikram' | 'Raji'; icon: string; chapters: string[]};
const subjects: Subject[] = [
  {name: 'English', teacher: 'Vikram', icon: '📘', chapters: ['Sounds & Letters', 'Reading', 'Vocabulary', 'Grammar']},
  {name: 'Maths', teacher: 'Vikram', icon: '➗', chapters: ['Numbers', 'Addition', 'Subtraction', 'Shapes']},
  {name: 'Computer', teacher: 'Vikram', icon: '💻', chapters: ['Computer Basics', 'Parts of a Computer', 'Digital Safety']},
  {name: 'EVS', teacher: 'Raji', icon: '🌱', chapters: ['My Family', 'Plants Around Us', 'Animals', 'Our Neighbourhood']},
  {name: 'Hindi', teacher: 'Raji', icon: 'अ', chapters: ['वर्णमाला', 'शब्द', 'पठन', 'लेखन']},
  {name: 'GK', teacher: 'Raji', icon: '🌍', chapters: ['My World', 'Nature', 'People & Places', 'Fun Facts']}
];

type ChildProfile = {id: string; name: string; grade: string};
type Progress = Record<string, {checks: number; correct: number}>;
type GoogleCredentialResponse = {credential: string};
type GoogleIdConfiguration = {client_id: string; callback: (r: GoogleCredentialResponse) => void};

declare global {
  interface Window {
    google?: {accounts: {id: {initialize: (c: GoogleIdConfiguration) => void; prompt: () => void; disableAutoSelect: () => void}}};
  }
}

const GOOGLE_CLIENT_ID = '96891639304-4hi2fjfnleq59oktf3gflu9c4kei1o31.apps.googleusercontent.com';
const SESSION_KEY = 'gurukulam-auth-session';
const defaultProfiles: ChildProfile[] = [{id: 'child-1', name: 'My Child', grade: 'Grade 1'}];

function loadJson<T>(storage: Storage, key: string, fallback: T): T {
  try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function accountPrefix(userId: string) {
  return `gurukulam:${encodeURIComponent(userId)}`;
}

function loadAccount<T>(userId: string, key: string, fallback: T): T {
  return loadJson(localStorage, `${accountPrefix(userId)}:${key}`, fallback);
}

function saveAccount<T>(userId: string, key: string, value: T) {
  localStorage.setItem(`${accountPrefix(userId)}:${key}`, JSON.stringify(value));
}

function loadSession(): AuthSession | null {
  const session = loadJson<AuthSession | null>(sessionStorage, SESSION_KEY, null);
  if (!isSessionValid(session)) {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [profiles, setProfiles] = useState<ChildProfile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState('child-1');
  const [progress, setProgress] = useState<Progress>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState(subjects[1]);
  const [chapter, setChapter] = useState(subjects[1].chapters[1]);
  const [teaching, setTeaching] = useState(false);
  const [answer, setAnswer] = useState<'correct' | 'retry' | null>(null);
  const [message, setMessage] = useState('');
  const pages = useMemo(() => [1, 2, 3, 4, 5, 6], []);

  useEffect(() => {
    if (!session) {
      setProfiles(defaultProfiles);
      setActiveProfileId('child-1');
      setProgress({});
      setApproved({});
      return;
    }
    // Never migrate unscoped legacy storage automatically. Doing so could assign
    // one parent's old browser data to a different Google account.
    const loadedProfiles = loadAccount(session.user.id, 'children', defaultProfiles);
    setProfiles(loadedProfiles.length ? loadedProfiles : defaultProfiles);
    const savedActive = loadAccount<string>(session.user.id, 'active-child', loadedProfiles[0]?.id || 'child-1');
    setActiveProfileId(loadedProfiles.some(p => p.id === savedActive) ? savedActive : loadedProfiles[0]?.id || 'child-1');
    setProgress(loadAccount(session.user.id, 'progress', {}));
    setApproved(loadAccount(session.user.id, 'approved', {}));
    setTeaching(false);
    setAnswer(null);
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) return;
    saveAccount(session.user.id, 'children', profiles);
    saveAccount(session.user.id, 'active-child', activeProfileId);
    saveAccount(session.user.id, 'progress', progress);
    saveAccount(session.user.id, 'approved', approved);
  }, [session?.user.id, profiles, activeProfileId, progress, approved]);

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const remaining = session.expiresAt - Date.now();
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(SESSION_KEY);
      setSession(null);
      setMessage('Your Google session expired. Please sign in again.');
    }, Math.max(remaining, 0));
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    const init = () => window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: response => {
        const next = credentialToSession(response.credential, GOOGLE_CLIENT_ID);
        if (!next) {
          setMessage('Google authentication could not be verified. Please try again.');
          return;
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        setSession(next);
        setMessage('Google authentication successful. Welcome to Gurukulam AI.');
      }
    });
    if (window.google) init();
    else {
      const timer = window.setInterval(() => {
        if (window.google) { window.clearInterval(timer); init(); }
      }, 100);
      return () => window.clearInterval(timer);
    }
  }, []);

  const signIn = () => window.google ? window.google.accounts.id.prompt() : setMessage('Google Sign-In is still loading. Please try again.');
  const signOut = () => {
    window.google?.accounts.id.disableAutoSelect();
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setTeaching(false);
    setAnswer(null);
    setMessage('Signed out successfully.');
  };

  const addChild = () => {
    if (!session || profiles.length >= 5) return;
    const id = `child-${Date.now()}`;
    setProfiles(p => [...p, {id, name: `Child ${p.length + 1}`, grade: 'Grade 1'}]);
    setActiveProfileId(id);
  };
  const updateName = (name: string) => setProfiles(p => p.map(x => x.id === activeProfileId ? {...x, name: name.slice(0, 60) || 'My Child'} : x));
  const check = (ok: boolean) => {
    if (!session) return;
    const active = profiles.find(p => p.id === activeProfileId) || profiles[0];
    const key = `${active.id}:${subject.name}:${chapter}`;
    setAnswer(ok ? 'correct' : 'retry');
    setProgress(p => ({...p, [key]: {checks: (p[key]?.checks || 0) + 1, correct: (p[key]?.correct || 0) + (ok ? 1 : 0)}}));
  };

  if (!session) return <div className="login-screen">
    <div className="login-art">
      <div className="login-badge">G</div><span>GURUKULAM AI</span>
      <h1>Learning that feels<br/><em>personal.</em></h1>
      <p>A parent-controlled AI learning space for every child's curiosity, progress and confidence.</p>
      <div className="login-illustration"><div>📚</div><div>👨‍🏫</div><div>🧒</div><div>✨</div></div>
    </div>
    <div className="login-card">
      <div className="login-logo">G</div><p className="eyebrow">WELCOME TO GURUKULAM</p>
      <h2>Let's begin learning.</h2>
      <p className="login-copy">Sign in as a parent to access your children's learning dashboard.</p>
      <button className="google-btn" onClick={signIn}><span className="google-g">G</span><span>Continue with Google</span></button>
      <div className="login-note">🔒 Secure parent-controlled access</div>
      {message && <div className="login-message">{message}</div>}
      <small>By continuing, you enter the Gurukulam AI learning environment.</small>
    </div>
  </div>;

  const active = profiles.find(p => p.id === activeProfileId) || profiles[0];
  const key = `${active.id}:${subject.name}:${chapter}`;
  const current = progress[key] || {checks: 0, correct: 0};
  const teacher = subject.teacher;
  const total = Object.entries(progress).filter(([k]) => k.startsWith(`${active.id}:`));
  const checks = total.reduce((n, [, p]) => n + p.checks, 0);
  const correct = total.reduce((n, [, p]) => n + p.correct, 0);

  return <div className="app">
    <header><div><span className="logo">G</span><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><button className="signin" onClick={signOut}>Sign out</button></header>
    <main>
      <section className="hero"><div><span className="eyebrow">PARENT DASHBOARD</span><h1>Plan today's learning.</h1><p>Welcome, {session.user.displayName}. Choose a child, subject and chapter to begin.</p><div className="auth-badge">✓ Google authenticated · Parent controls unlocked</div></div><div className="teacher-card"><div className="avatar">{teacher === 'Vikram' ? '👨‍🏫' : '👩‍🏫'}</div><div><small>Today's teacher</small><h2>{teacher}</h2><span>{teacher === 'Vikram' ? 'English · Maths · Computer' : 'EVS · Hindi · GK'}</span></div></div></section>
      <section className="panel progress-board"><div><small>CHILD PROFILES</small><h3>{profiles.length} profile{profiles.length === 1 ? '' : 's'}</h3><p>Separate learning progress for every child.</p></div><div className="actions"><select value={activeProfileId} onChange={e => setActiveProfileId(e.target.value)}>{profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.grade}</option>)}</select><button className="secondary" disabled={profiles.length >= 5} onClick={addChild}>＋ Add child</button></div></section>
      <section className="workspace"><aside className="panel subjects"><h3>Subjects</h3>{subjects.map(s => <button key={s.name} className={s.name === subject.name ? 'selected' : ''} onClick={() => {setSubject(s);setChapter(s.chapters[0]);setTeaching(false);setAnswer(null)}}><span>{s.icon}</span><b>{s.name}</b><em>{s.teacher}</em></button>)}</aside>
        <section className="panel chapter"><div className="panel-title"><div><small>STEP 1 · SELECT TOPIC</small><h2>{subject.name}</h2></div><span className="teacher-pill">{teacher === 'Vikram' ? '👨‍🏫' : '👩‍🏫'} {teacher}</span></div>
          <label>Child profile</label><input value={active.name} maxLength={60} onChange={e => updateName(e.target.value)}/>
          <label>Chapter / Topic</label><select value={chapter} onChange={e => {setChapter(e.target.value);setTeaching(false);setAnswer(null)}}>{subject.chapters.map(c => <option key={c}>{c}</option>)}</select>
          <div className={`status ${approved[key] ? 'ok' : ''}`}>{approved[key] ? '✓ Parent approved' : '● Needs parent verification'}</div>
          <div className="pages"><div className="pages-head"><div><small>STEP 2 · SOURCE PAGES</small><h3>Chapter page preview</h3></div><span>{pages.length} pages found</span></div><div className="page-grid">{pages.map(p => <div className="page" key={p}><div className="page-number">{p}</div><div className="paper"><i>GURUKULAM</i><strong>{chapter}</strong><span>Page {p}</span><div className="lines"/></div></div>)}</div></div>
          <div className="actions"><button className="secondary" onClick={() => setMessage('Chapter upload queued for curriculum ingestion.')}>↥ Upload chapter</button><button className="primary" onClick={() => setApproved(a => ({...a, [key]: true}))}>✓ Approve pages</button></div>
        </section>
      </section>
      <section className="next panel"><div><small>AFTER APPROVAL</small><h3>{teaching ? `${teacher} is teaching ${active.name}` : 'Ready for the Tutor Engine'}</h3><p>{teaching ? `Lesson: ${chapter}. ${answer === 'correct' ? 'Excellent! Mastery check passed.' : answer === 'retry' ? 'Let’s try that again.' : `Question: Tell me one thing you learned about ${chapter}.`}` : 'The verified chapter becomes the trusted source for teaching, practice, assessment and mastery tracking.'}</p>{current.checks > 0 && <div className="progress-line">Mastery checks: {current.correct}/{current.checks} correct</div>}</div><div className="actions"><button className="secondary" disabled={!teaching || !approved[key]} onClick={() => check(false)}>Need help</button><button className="primary" disabled={!approved[key]} onClick={() => {setTeaching(true);setAnswer(null)}}>{teaching ? 'Continue →' : 'Start teaching →'}</button></div></section>
      <section className="panel progress-board"><div><small>LEARNING SNAPSHOT</small><h3>{active.name}'s progress</h3><p>{checks ? `${correct} correct answers across ${checks} mastery checks.` : 'No mastery checks yet.'}</p></div><div className="progress-stats"><strong>{checks ? Math.round(correct / checks * 100) : 0}%</strong><span>mastery</span></div></section>
      {message && <div className="voice-message">{message}</div>}
    </main><footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
