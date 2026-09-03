import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './login-tight.css';
import './parent-dashboard.css';
import { credentialToSession, isSessionValid, type AuthSession } from './auth/googleAuth';
import { DriveSyncController } from './storage/driveSync';
import type { DriveChildRecord } from './storage/driveChildStore';
import { ParentTimetableSubjects } from './parentTimetableSubjects';
import { ParentLearningTools } from './parentLearningTools';
import { LearningHome } from './child/LearningHome';
import { defaultWorkspace, type ChildWorkspace, type LearningWorkspace } from './learningWorkspace';
import type { Child } from './types/parent';

const GOOGLE_CLIENT_ID = '96891639304-4hi2fjfnleq59tf3gflu9c4kei1o31.apps.googleusercontent.com';
type Menu = 'children' | 'timetable' | 'teachers' | 'subjects' | 'tests' | 'teaching' | 'homework';
function childId() { return `CHD-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`; }
function blankChild(): Child { return { id: childId(), name: '', dob: '', gender: '', grade: '', section: '', school: '', board: '' }; }
function Brand({ child = false }: { child?: boolean }) { return <div className="gurukulam-brand"><img className="gurukulam-brand-icon" src="./icons/icon.svg" alt="Gurukulam AI" /><div className="brand"><strong>Gurukulam AI</strong><small>{child ? 'Personal AI Teacher' : 'Parents Dashboard'}</small></div></div>; }

function Login({ setSession }: { setSession: (s: AuthSession) => void }) {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return;
      try {
        setGoogleError('');
        (window.google.accounts.id.initialize as any)({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (!response?.credential) {
              setGoogleError('Google did not return a sign-in credential. Please try again.');
              return;
            }
            const session = credentialToSession(response.credential, GOOGLE_CLIENT_ID);
            if (!session) {
              setGoogleError('Google sign-in was received but could not be verified. Please try again.');
              return;
            }
            setSession(session);
          },
          cancel_on_tap_outside: false
        });
        googleButtonRef.current.innerHTML = '';
        (window.google.accounts.id as any).renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.min(400, Math.max(260, googleButtonRef.current.clientWidth || 360))
        });
        setGoogleReady(true);
      } catch (error) {
        console.error('Google Identity Services initialization failed:', error);
        setGoogleError('Google Sign-In could not be loaded. Please refresh and try again.');
      }
    };
    if (window.google?.accounts?.id) init();
    else timer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        if (timer) window.clearInterval(timer);
        init();
      }
    }, 100);
    return () => { cancelled = true; if (timer) window.clearInterval(timer); };
  }, [setSession]);
  return <div className="login-screen"><header className="login-header"><div className="login-brand"><span className="login-logo">G</span><span><strong>Gurukulam AI</strong><small>Learning made joyful</small></span></div><span className="login-parent-badge">🔒 Parent-controlled</span></header><div className="login-content"><section className="login-hero"><div className="login-copy"><span className="login-eyebrow">A HAPPY PLACE TO LEARN</span><h1>Every lesson can become an adventure.</h1><p>Welcome to a warm, playful learning world where your child can learn, explore and grow with a personal AI teacher.</p></div><div className="login-art-card"><img src="./assets/gurukulam-two-girls-3d.png" alt="Two girls learning" /></div></section><section className="login-card"><div className="login-card-icon">🪔</div><span className="login-card-eyebrow">PARENT SIGN-IN</span><h2>Let’s start the adventure!</h2><p>Sign in securely to set up and guide your child’s learning journey.</p><div className="login-google-button-shell" ref={googleButtonRef} aria-label="Continue with Google" />{googleError && <div className="login-google-error" role="alert">{googleError}</div>}{!googleReady && !googleError && <small className="login-google-loading">Loading Google Sign-In…</small>}<small className="login-privacy">Your account keeps your child’s learning space private and parent-controlled.</small></section></div></div>;
}

function ChildAvatar({ gender }: { gender: string }) { if (gender === 'Female') return <span className="child-avatar child-avatar-female"><img src="./assets/female-child-avatar.svg" alt="Girl child" /></span>; if (gender === 'Male') return <span className="child-avatar child-avatar-male"><img src="./assets/male-child-avatar.svg" alt="Boy child" /></span>; return <span className="child-avatar child-avatar-neutral">👧</span>; }

function ChildDetails({ children, setChildren, active, setActive, driveSync }: { children: Child[]; setChildren: React.Dispatch<React.SetStateAction<Child[]>>; active: string; setActive: (id: string) => void; driveSync: DriveSyncController }) {
  const [edit, setEdit] = useState<Child | null>(null); const [view, setView] = useState<Child | null>(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const saveChild = async () => { if (!edit) return; if (Object.values(edit).some((value, index) => index > 0 && !String(value).trim())) { setNotice('Please complete all child details before saving.'); return; } setBusy(true); setNotice('Saving…'); try { await driveSync.saveChild(edit as DriveChildRecord); setChildren(current => current.some(c => c.id === edit.id) ? current.map(c => c.id === edit.id ? edit : c) : [...current, edit]); if (!active) setActive(edit.id); setEdit(null); setNotice('Child saved successfully.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Child could not be saved.'); } finally { setBusy(false); } };
  const remove = async (child: Child) => { if (!confirm(`Delete ${child.name || 'this child'}? This action cannot be undone.`)) return; setBusy(true); setNotice('Deleting learning data…'); try { await driveSync.removeChild(child.id); const remaining = children.filter(c => c.id !== child.id); setChildren(remaining); if (active === child.id) setActive(remaining[0]?.id || ''); setNotice('Child and child-specific learning data deleted successfully.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Child could not be deleted.'); } finally { setBusy(false); } };
  return <section className="parent-section child-details-page"><div className="section-heading"><div><h1>👧 Child Details</h1><p>Add, view, modify or delete children.</p></div><button className="primary" disabled={busy || !driveSync.authorized} onClick={() => setEdit(blankChild())}>＋ Add Child</button></div>{notice && <div className="tt-notice" role="status">{notice}</div>}<div className="child-list">{children.map(child => <article className="child-row" key={child.id}><div className="child-main"><ChildAvatar gender={child.gender} /><div><h3>{child.name || 'Unnamed child'}</h3><p>{child.grade}{child.section ? ` · Section ${child.section}` : ''}</p>{child.school && <span className="child-school">🏫 {child.school}</span>}</div></div><div className="row-actions"><button className="view-action" onClick={() => setView(child)}>◉ View</button><button disabled={busy} onClick={() => setEdit(child)}>✎ Modify</button><button className="danger" disabled={busy} onClick={() => void remove(child)}>Delete</button></div></article>)}</div>{!children.length && <div className="coming-section panel"><div className="coming-icon">✨</div><h2>No children added yet.</h2><p>Add your child's details to get started.</p><button className="primary empty-add" disabled={!driveSync.authorized} onClick={() => setEdit(blankChild())}>＋ Add Child</button></div>}{view && <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><small>CHILD DETAILS</small><h2>{view.name}</h2></div><button onClick={() => setView(null)}>✕</button></div><div className="detail-grid">{[['Child ID', view.id], ['Date of Birth', view.dob], ['Gender', view.gender], ['Class / Grade', view.grade], ['Section', view.section], ['School Name', view.school], ['School Board', view.board]].map(([label, value]) => <div className="detail-item" key={label}><small>{label}</small><strong>{value || '—'}</strong></div>)}</div></div></div>}{edit && <div className="modal-backdrop"><div className="modal-card child-form"><div className="modal-header"><div><small>CHILD DETAILS</small><h2>{edit.name ? 'Modify Child' : 'Add Child'}</h2></div><button onClick={() => setEdit(null)}>✕</button></div><div className="generated-id"><span>Child ID</span><strong>{edit.id}</strong><em>Auto-generated · unique · cannot be edited</em></div><div className="form-grid">{([['name', 'Child Name'], ['dob', 'Date of Birth'], ['gender', 'Gender'], ['grade', 'Class / Grade'], ['section', 'Section'], ['school', 'School Name'], ['board', 'School Board']] as const).map(([key, label]) => <label key={key}>{label}{key === 'gender' || key === 'board' ? <select value={edit[key]} onChange={event => setEdit({ ...edit, [key]: event.target.value })}><option value="">Select</option>{(key === 'gender' ? ['Female', 'Male', 'Other'] : ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other']).map(option => <option key={option}>{option}</option>)}</select> : <input type={key === 'dob' ? 'date' : 'text'} value={edit[key]} onChange={event => setEdit({ ...edit, [key]: event.target.value })} />}</label>)}</div><div className="actions"><button className="secondary" disabled={busy} onClick={() => setEdit(null)}>Cancel</button><button className="primary" disabled={busy} onClick={() => void saveChild()}>{busy ? 'Saving…' : 'Save Child'}</button></div></div></div>}</section>;
}

function Parents({ children, setChildren, active, setActive, back, signout, driveSync, workspace, setWorkspace }: { children: Child[]; setChildren: React.Dispatch<React.SetStateAction<Child[]>>; active: string; setActive: (id: string) => void; back: () => void; signout: () => void; driveSync: DriveSyncController; workspace: LearningWorkspace; setWorkspace: React.Dispatch<React.SetStateAction<LearningWorkspace>> }) {
  const [menu, setMenu] = useState<Menu>('children'); const items: [Menu, string, string][] = [['children', '👧', 'Child Details'], ['timetable', '📅', 'Time Table / Subjects'], ['teachers', '👨‍🏫', 'Teacher Details'], ['subjects', '📚', 'Subjects'], ['tests', '📝', 'Test / Exam by School / Gurukulam'], ['teaching', '📖', "Today's Teaching"], ['homework', '🏠', "Kid's Homework"]]; const selected = items.find(item => item[0] === menu)!; const child = children.find(c => c.id === active) || children[0]; const childWorkspace = child ? workspace[child.id] || defaultWorkspace() : defaultWorkspace();
  const syncTimetable = async () => { if (!child) return; try { const timetable = await driveSync.loadTimetable(child.id); const subjects = timetable?.subjects || []; if (subjects.length) setWorkspace(current => ({ ...current, [child.id]: { ...(current[child.id] || defaultWorkspace()), subjects: [...new Set([...(current[child.id]?.subjects || []), ...subjects])] } })); } catch (error) { console.error('Timetable sync failed:', error); } };
  useEffect(() => { if (menu !== 'children' && menu !== 'timetable') void syncTimetable(); }, [menu, child?.id]);
  const updateWorkspace = (next: ChildWorkspace) => { if (!child) return; setWorkspace(current => ({ ...current, [child.id]: next })); };
  const goBackToChild = async () => { await syncTimetable(); back(); };
  return <div className="parent-app"><header className="parent-topbar"><Brand /><div className="top-actions"><button className="back-child" onClick={() => void goBackToChild()}>← Child Dashboard</button><button className="signin" onClick={signout}>⇥ Sign out</button></div></header><div className="parent-shell"><aside className="parent-sidebar"><div className="sidebar-title"><span>👨‍👩‍👧</span><div><strong>Parent Dashboard</strong><small>Manage your children</small></div></div><nav>{items.map(item => <button key={item[0]} className={menu === item[0] ? 'selected' : ''} onClick={() => setMenu(item[0])}><span>{item[1]}</span><b>{item[2]}</b></button>)}</nav></aside><main className="parent-main">{menu !== 'children' && <section className="parent-hero"><div><span className="eyebrow">PARENTS DASHBOARD</span><h1>{selected[1]} {selected[2]}</h1><p>Parent-controlled tools for your child's Gurukulam AI learning environment.</p></div></section>}{menu === 'children' ? <ChildDetails children={children} setChildren={setChildren} active={active} setActive={setActive} driveSync={driveSync} /> : menu === 'timetable' ? <ParentTimetableSubjects children={children} active={active} setActive={setActive} driveSync={driveSync} /> : <ParentLearningTools mode={menu} children={children} active={active} setActive={setActive} workspace={childWorkspace} setWorkspace={updateWorkspace} />}</main></div><footer>Gurukulam AI · Parent-controlled learning environment</footer></div>;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [view, setView] = useState<'child' | 'parents'>('child');
  const [children, setChildren] = useState<Child[]>([]);
  const [active, setActive] = useState('');
  const [workspace, setWorkspace] = useState<LearningWorkspace>({});
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const [driveSync] = useState(() => new DriveSyncController());

  useEffect(() => {
    if (!session) {
      driveSync.reset(); setChildren([]); setActive(''); setWorkspace({}); setWorkspaceReady(false); setView('child'); return;
    }
    setChildren([]); setActive(''); setWorkspace({}); setWorkspaceReady(false); setView('child');

    driveSync.configure(GOOGLE_CLIENT_ID, async () => {
      try {
        const remote = await driveSync.loadChildren();
        setChildren(remote); setActive(remote[0]?.id || '');
        const timetablePairs = await Promise.all(remote.map(async child => { try { return [child.id, await driveSync.loadTimetable(child.id)] as const; } catch { return [child.id, null] as const; } }));
        const workspacePairs = await Promise.all(remote.map(async child => { try { return [child.id, await driveSync.loadWorkspace(child.id)] as const; } catch { return [child.id, null] as const; } }));
        setWorkspace(() => {
          const next: LearningWorkspace = {};
          for (const child of remote) {
            const remoteWorkspace = workspacePairs.find(pair => pair[0] === child.id)?.[1];
            const timetable = timetablePairs.find(pair => pair[0] === child.id)?.[1];
            next[child.id] = remoteWorkspace ? { ...defaultWorkspace(), ...remoteWorkspace } : defaultWorkspace();
            if (timetable?.subjects?.length) next[child.id].subjects = [...new Set([...(next[child.id].subjects || []), ...timetable.subjects])];
          }
          return next;
        });
        setWorkspaceReady(true);
      } catch (error) { console.error('Drive sync failed:', error); setWorkspaceReady(true); }
    });
  }, [session, driveSync]);

  useEffect(() => {
    if (!session || !workspaceReady) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const child = children.find(c => c.id === active);
      if (child && workspace[child.id]) void driveSync.saveWorkspace(child.id, workspace[child.id]);
    }, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [workspace, active, children, session, workspaceReady, driveSync]);

  if (!session) return <Login setSession={setSession} />;
  if (!workspaceReady) return <div className="loading-screen">Loading your Gurukulam AI space…</div>;
  const child = children.find(c => c.id === active) || children[0];
  if (!child) return <Parents children={children} setChildren={setChildren} active={active} setActive={setActive} back={() => setView('child')} signout={() => setSession(null)} driveSync={driveSync} workspace={workspace} setWorkspace={setWorkspace} />;
  if (view === 'parents') return <Parents children={children} setChildren={setChildren} active={active} setActive={setActive} back={() => setView('child')} signout={() => setSession(null)} driveSync={driveSync} workspace={workspace} setWorkspace={setWorkspace} />;
  return <LearningHome child={child} onParents={() => setView('parents')} signout={() => setSession(null)} workspace={workspace[child.id] || defaultWorkspace()} />;
}

createRoot(document.getElementById('root')!).render(<App />);
