import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './login-tight.css';
import './parent-dashboard.css';
import { credentialToSession, isSessionValid, type AuthSession } from './auth/googleAuth';
import { BrowserVoice } from './voice/browserVoice';

type Subject = { name: string; teacher: 'Vikram' | 'Raji'; icon: string; chapters: string[] };
const subjects: Subject[] = [
  { name: 'English', teacher: 'Vikram', icon: '📘', chapters: ['Sounds & Letters', 'Reading', 'Vocabulary', 'Grammar'] },
  { name: 'Maths', teacher: 'Vikram', icon: '➗', chapters: ['Numbers', 'Addition', 'Subtraction', 'Shapes'] },
  { name: 'Computer', teacher: 'Vikram', icon: '💻', chapters: ['Computer Basics', 'Parts of a Computer', 'Digital Safety'] },
  { name: 'EVS', teacher: 'Raji', icon: '🌱', chapters: ['My Family', 'Plants Around Us', 'Animals', 'Our Neighbourhood'] },
  { name: 'Hindi', teacher: 'Raji', icon: 'अ', chapters: ['वर्णमाला', 'शब्द', 'पठन', 'लेखन'] },
  { name: 'GK', teacher: 'Raji', icon: '🌍', chapters: ['My World', 'Nature', 'People & Places', 'Fun Facts'] },
];

type ChildProfile = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  grade: string;
  section: string;
  school: string;
  board: string;
};

type View = 'child' | 'parents';
type ParentMenu = 'children' | 'timetable' | 'teachers' | 'subjects' | 'tests' | 'teaching' | 'homework';
type GoogleCredentialResponse = { credential: string };
type GoogleIdConfiguration = { client_id: string; callback: (r: GoogleCredentialResponse) => void };

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (c: GoogleIdConfiguration) => void; prompt: () => void; disableAutoSelect: () => void } } };
  }
}

const GOOGLE_CLIENT_ID = '96891639304-4hi2fjfnleq59oktf3gflu9c4kei1o31.apps.googleusercontent.com';
const SESSION_KEY = 'gurukulam-auth-session';
const CHILDREN_KEY = 'children';

function loadJson<T>(storage: Storage, key: string, fallback: T): T {
  try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function prefix(id: string) { return `gurukulam:${encodeURIComponent(id)}`; }
function loadAccount<T>(id: string, key: string, fallback: T) { return loadJson(localStorage, `${prefix(id)}:${key}`, fallback); }
function saveAccount<T>(id: string, key: string, value: T) { localStorage.setItem(`${prefix(id)}:${key}`, JSON.stringify(value)); }
function loadSession(): AuthSession | null {
  const session = loadJson<AuthSession | null>(sessionStorage, SESSION_KEY, null);
  if (!isSessionValid(session)) { sessionStorage.removeItem(SESSION_KEY); return null; }
  return session;
}
function createChildId() {
  const uuid = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase() : `${Date.now()}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  return `CHD-${uuid}`;
}
function newChild(): ChildProfile {
  return { id: createChildId(), name: '', dob: '', gender: '', grade: '', section: '', school: '', board: '' };
}
function defaultChild(): ChildProfile {
  return { ...newChild(), name: 'My Child', grade: 'Grade 1' };
}
function normalizeChildren(children: ChildProfile[]): ChildProfile[] {
  return children.map(child => child.id.startsWith('child-') ? { ...child, id: createChildId() } : child);
}

function Login({ sessionMessage, setSession }: { sessionMessage: string; setSession: (s: AuthSession) => void }) {
  const [message, setMessage] = useState(sessionMessage);
  useEffect(() => {
    const init = () => window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: response => {
        const session = credentialToSession(response.credential, GOOGLE_CLIENT_ID);
        if (session) { setSession(session); setMessage('Google authentication successful. Welcome to Gurukulam AI.'); }
        else setMessage('Google authentication could not be verified.');
      },
    });
    if (window.google) init();
    else {
      const timer = window.setInterval(() => { if (window.google) { window.clearInterval(timer); init(); } }, 100);
      return () => window.clearInterval(timer);
    }
  }, [setSession]);

  return <div className="login-screen" role="main">
    <header className="login-header">
      <div className="login-brand"><span className="login-logo">G</span><span><strong>Gurukulam AI</strong><small>Learning made joyful</small></span></div>
      <span className="login-parent-badge">🔒 Parent-controlled</span>
    </header>
    <div className="login-content">
      <section className="login-hero">
        <div className="login-copy"><span className="login-eyebrow">A HAPPY PLACE TO LEARN</span><h1>Every lesson can become an adventure.</h1><p>Welcome to a warm, playful learning world where your child can learn, explore and grow with a personal AI teacher.</p><div className="login-trust"><span>🌱 Safe</span><span>🧠 Personalised</span><span>✨ Joyful</span></div></div>
        <div className="login-art-card"><img src="./assets/gurukulam-two-girls-3d.png" alt="Two South Indian girls learning together"/><div className="login-spark spark-one">✦</div><div className="login-spark spark-two">✦</div></div>
      </section>
      <section className="login-card"><div className="login-card-icon">🪔</div><span className="login-card-eyebrow">PARENT SIGN-IN</span><h2>Let’s start the adventure!</h2><p>Sign in securely to set up and guide your child’s learning journey.</p><button className="login-google-button" aria-label="Continue with Google" onClick={() => window.google?.accounts.id.prompt()}><span className="google-g">G</span><span>Continue with Google</span><span className="google-arrow">→</span></button><small className="login-privacy">Your account keeps your child’s learning space private and parent-controlled.</small>{message && <div className="login-message-overlay" role="status">{message}</div>}</section>
    </div>
    <footer className="login-footer">Gurukulam AI · Learn with curiosity, grow with confidence</footer>
  </div>;
}

function ChildDashboard({ child, onParentsAccess }: { child: ChildProfile; onParentsAccess: () => void }) {
  return <div className="app dashboard-app">
    <header><div><span className="logo">G</span><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><button className="parent-access" onClick={onParentsAccess}>👨‍👩‍👧 Parents Access</button></header>
    <main>
      <section className="child-welcome panel"><div><small>MY LEARNING SPACE</small><h1>Hello, {child.name || 'Student'}! 👋</h1><p>Welcome to your Gurukulam AI learning journey.</p></div><div className="child-id-badge">Child ID · {child.id}</div></section>
      <section className="panel child-subjects"><div className="section-heading"><div><small>LEARN TODAY</small><h2>Choose a subject</h2></div><span>{child.grade || 'Grade not set'}{child.section ? ` · ${child.section}` : ''}</span></div><div className="subject-card-grid">{subjects.map(subject => <article className="subject-card" key={subject.name}><span className="subject-icon">{subject.icon}</span><div><h3>{subject.name}</h3><p>AI Teacher {subject.teacher}</p></div><span>→</span></article>)}</div></section>
    </main>
    <footer>Gurukulam AI · Child learning environment</footer>
  </div>;
}

function ChildDetails({ profiles, activeId, setProfiles, setActiveId }: { profiles: ChildProfile[]; activeId: string; setProfiles: React.Dispatch<React.SetStateAction<ChildProfile[]>>; setActiveId: (id: string) => void }) {
  const active = profiles.find(child => child.id === activeId) || profiles[0];
  const [editing, setEditing] = useState<ChildProfile | null>(null);
  const [viewing, setViewing] = useState<ChildProfile | null>(null);
  const [error, setError] = useState('');

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.dob || !editing.gender || !editing.grade.trim() || !editing.section.trim() || !editing.school.trim() || !editing.board) {
      setError('Please complete all Child Details fields.'); return;
    }
    setProfiles(current => current.some(child => child.id === editing.id) ? current.map(child => child.id === editing.id ? editing : child) : [...current, editing]);
    setActiveId(editing.id); setEditing(null); setError('');
  };
  const remove = (id: string) => {
    const child = profiles.find(item => item.id === id);
    if (!child || !window.confirm(`Delete ${child.name || 'this child'}? This removes the child from this parent account.`)) return;
    setProfiles(current => current.filter(item => item.id !== id));
    if (activeId === id) { const next = profiles.find(item => item.id !== id); if (next) setActiveId(next.id); }
  };

  return <section className="parent-section">
    <div className="section-heading"><div><small>MENU 1</small><h1>👧 Child Details</h1><p>Add, view, modify or delete children linked to this parent account.</p></div><button className="primary" onClick={() => setEditing(newChild())}>＋ Add Child</button></div>
    <div className="child-list">{profiles.map(child => <article className={`child-row ${active?.id === child.id ? 'active' : ''}`} key={child.id}>
      <div className="child-main"><span className="child-avatar">👧</span><div><h3>{child.name || 'Unnamed child'}</h3><p>{child.grade || 'Grade not set'}{child.section ? ` · Section ${child.section}` : ''}</p><small>Child ID: {child.id}</small></div></div>
      <div className="row-actions"><button onClick={() => { setViewing(child); setActiveId(child.id); }}>View</button><button onClick={() => setEditing(child)}>Modify</button><button className="danger" onClick={() => remove(child.id)}>Delete</button></div>
    </article>)}</div>

    {viewing && <div className="modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) setViewing(null); }}><div className="modal-card"><div className="modal-header"><div><small>CHILD PROFILE</small><h2>{viewing.name}</h2></div><button onClick={() => setViewing(null)}>✕</button></div><div className="detail-grid">{[['Child ID', viewing.id], ['Date of Birth', viewing.dob], ['Gender', viewing.gender], ['Class / Grade', viewing.grade], ['Section', viewing.section], ['School Name', viewing.school], ['School Board', viewing.board]].map(([label, value]) => <div className="detail-item" key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div><div className="actions"><button className="secondary" onClick={() => { setEditing(viewing); setViewing(null); }}>Modify</button><button className="primary" onClick={() => setViewing(null)}>Close</button></div></div></div>}

    {editing && <div className="modal-backdrop"><div className="modal-card child-form"><div className="modal-header"><div><small>{editing.id ? 'CHILD DETAILS' : 'NEW CHILD'}</small><h2>{editing.name ? 'Modify Child' : 'Add Child'}</h2></div>{editing && <button onClick={() => { setEditing(null); setError(''); }}>✕</button>}</div><div className="generated-id"><span>Child ID</span><strong>{editing.id}</strong><em>Auto-generated · unique · cannot be edited</em></div><div className="form-grid">
      <label>Child Name<input value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} maxLength={80}/></label>
      <label>Date of Birth<input type="date" value={editing.dob} onChange={event => setEditing({ ...editing, dob: event.target.value })}/></label>
      <label>Gender<select value={editing.gender} onChange={event => setEditing({ ...editing, gender: event.target.value })}><option value="">Select</option><option>Female</option><option>Male</option><option>Other</option></select></label>
      <label>Class / Grade<input value={editing.grade} onChange={event => setEditing({ ...editing, grade: event.target.value })} maxLength={40}/></label>
      <label>Section<input value={editing.section} onChange={event => setEditing({ ...editing, section: event.target.value })} maxLength={20}/></label>
      <label>School Name<input value={editing.school} onChange={event => setEditing({ ...editing, school: event.target.value })} maxLength={120}/></label>
      <label>School Board<select value={editing.board} onChange={event => setEditing({ ...editing, board: event.target.value })}><option value="">Select</option><option>CBSE</option><option>ICSE</option><option>State Board</option><option>IB</option><option>Cambridge</option><option>Other</option></select></label>
    </div>{error && <div className="form-error">{error}</div>}<div className="actions"><button className="secondary" onClick={() => { setEditing(null); setError(''); }}>Cancel</button><button className="primary" onClick={save}>Save Child</button></div></div></div>}
  </section>;
}

function ParentsDashboard({ profiles, activeId, setProfiles, setActiveId, onBack, onSignOut }: { profiles: ChildProfile[]; activeId: string; setProfiles: React.Dispatch<React.SetStateAction<ChildProfile[]>>; setActiveId: (id: string) => void; onBack: () => void; onSignOut: () => void }) {
  const [menu, setMenu] = useState<ParentMenu>('children');
  const menuItems: Array<{ id: ParentMenu; label: string; icon: string; status: string }> = [
    { id: 'children', label: 'Child Details', icon: '👧', status: 'Defined' },
    { id: 'timetable', label: 'TimeTable', icon: '📅', status: 'Defined' },
    { id: 'teachers', label: 'Teacher Details', icon: '👨‍🏫', status: 'Defined' },
    { id: 'subjects', label: 'Subjects', icon: '📚', status: 'To be discussed' },
    { id: 'tests', label: 'Test / Exam by School / Gurukulam', icon: '📝', status: 'To be discussed' },
    { id: 'teaching', label: "Today's Teaching", icon: '📖', status: 'To be discussed' },
    { id: 'homework', label: "Kid's Homework", icon: '🏠', status: 'To be discussed' },
  ];
  const selected = menuItems.find(item => item.id === menu)!;
  return <div className="parent-app">
    <header className="parent-topbar"><div><span className="logo">G</span><div className="brand"><strong>Gurukulam AI</strong><small>Parents Dashboard</small></div></div><div className="top-actions"><button className="back-child" onClick={onBack}>← Child Dashboard</button><button className="signin" onClick={onSignOut}>Sign out</button></div></header>
    <div className="parent-shell"><aside className="parent-sidebar"><div className="sidebar-title"><span>👨‍👩‍👧</span><div><strong>Parents Access</strong><small>Manage your children</small></div></div><nav>{menuItems.map(item => <button key={item.id} className={menu === item.id ? 'selected' : ''} onClick={() => setMenu(item.id)}><span>{item.icon}</span><b>{item.label}</b>{item.status === 'Defined' ? <i>●</i> : <em>•</em>}</button>)}</nav></aside><main className="parent-main"><section className="parent-hero"><div><span className="eyebrow">PARENTS DASHBOARD</span><h1>{selected.icon} {selected.label}</h1><p>Parent-controlled tools for your child's Gurukulam AI learning environment.</p></div><div className="parent-child-switch"><small>ACTIVE CHILD</small><select value={activeId} onChange={event => setActiveId(event.target.value)}>{profiles.map(child => <option key={child.id} value={child.id}>{child.name || 'Unnamed child'}</option>)}</select></div></section>{menu === 'children' ? <ChildDetails profiles={profiles} activeId={activeId} setProfiles={setProfiles} setActiveId={setActiveId}/> : <section className="coming-section panel"><div className="coming-icon">{selected.icon}</div><small>{selected.status.toUpperCase()}</small><h2>{selected.label}</h2><p>This menu is visible in the Parents Dashboard. Detailed functionality will be finalized before implementation.</p></section>}</main></div><footer>Gurukulam AI · Parent-controlled learning environment</footer>
  </div>;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [view, setView] = useState<View>('child');
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const activeProfile = useMemo(() => profiles.find(profile => profile.id === activeProfileId) || profiles[0], [profiles, activeProfileId]);

  useEffect(() => {
    if (!session) { setProfiles([]); setActiveProfileId(''); setView('child'); return; }
    const stored = loadAccount<ChildProfile[]>(session.user.id, CHILDREN_KEY, []);
    const children = stored.length ? normalizeChildren(stored) : [defaultChild()];
    setProfiles(children);
    const storedActive = loadAccount<string>(session.user.id, 'active-child', children[0].id);
    setActiveProfileId(children.some(child => child.id === storedActive) ? storedActive : children[0].id);
    setView('child');
  }, [session?.user.id]);

  useEffect(() => {
    if (!session || !profiles.length || !activeProfileId) return;
    saveAccount(session.user.id, CHILDREN_KEY, profiles);
    saveAccount(session.user.id, 'active-child', activeProfileId);
  }, [session?.user.id, profiles, activeProfileId]);

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const timer = window.setTimeout(() => { sessionStorage.removeItem(SESSION_KEY); setSession(null); }, Math.max(session.expiresAt - Date.now(), 0));
    return () => window.clearTimeout(timer);
  }, [session]);

  const signOut = () => { window.google?.accounts.id.disableAutoSelect(); sessionStorage.removeItem(SESSION_KEY); setSession(null); setSessionMessage(''); };
  if (!session) return <Login sessionMessage={sessionMessage} setSession={setSession}/>;
  if (view === 'parents') return <ParentsDashboard profiles={profiles} activeId={activeProfileId} setProfiles={setProfiles} setActiveId={setActiveProfileId} onBack={() => setView('child')} onSignOut={signOut}/>;
  return <ChildDashboard child={activeProfile || defaultChild()} onParentsAccess={() => setView('parents')}/>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
