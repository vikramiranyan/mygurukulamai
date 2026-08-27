import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

type Subject = {name:string; teacher:'Vikram'|'Raji'; icon:string; chapters:string[]};
const subjects: Subject[] = [
 {name:'English',teacher:'Vikram',icon:'📘',chapters:['Sounds & Letters','Reading','Vocabulary','Grammar']},
 {name:'Maths',teacher:'Vikram',icon:'➗',chapters:['Numbers','Addition','Subtraction','Shapes']},
 {name:'Computer',teacher:'Vikram',icon:'💻',chapters:['Computer Basics','Parts of a Computer','Digital Safety']},
 {name:'EVS',teacher:'Raji',icon:'🌱',chapters:['My Family','Plants Around Us','Animals','Our Neighbourhood']},
 {name:'Hindi',teacher:'Raji',icon:'अ',chapters:['वर्णमाला','शब्द','पठन','लेखन']},
 {name:'GK',teacher:'Raji',icon:'🌍',chapters:['My World','Nature','People & Places','Fun Facts']}
];

type SpeechRecognitionLike = {continuous:boolean; interimResults:boolean; lang:string; onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null; onend:(()=>void)|null; start:()=>void; stop:()=>void};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type Progress = Record<string,{checks:number;correct:number}>;
type GoogleCredentialResponse = {credential:string};
type GoogleIdConfiguration = {client_id:string;callback:(response:GoogleCredentialResponse)=>void;auto_select?:boolean;cancel_on_tap_outside?:boolean};
type GoogleIdentity = {accounts:{id:{initialize:(config:GoogleIdConfiguration)=>void;prompt:()=>void;disableAutoSelect:()=>void}}};
declare global {interface Window {google?:{accounts:{id:{initialize:(config:GoogleIdConfiguration)=>void;prompt:()=>void;disableAutoSelect:()=>void}}}}}

const GOOGLE_CLIENT_ID='96891639304-4hi2fjfnleq59oktf3gflu9c4kei1o31.apps.googleusercontent.com';
const profileKey='gurukulam-child-profile';
const progressKey='gurukulam-progress';
const authKey='gurukulam-parent-auth';
const googleProfileKey='gurukulam-google-profile';
function loadJson<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function decodeGooglePayload(token:string):{name?:string;email?:string;picture?:string;sub?:string}{try{const part=token.split('.')[1];return JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g,'+').replace(/_/g,'/')))))}catch{return {}}}

function App(){
 const [subject,setSubject]=useState(subjects[1]);
 const [chapter,setChapter]=useState(subjects[1].chapters[1]);
 const [approved,setApproved]=useState<Record<string,boolean>>(()=>loadJson('gurukulam-approved',{}));
 const [teaching,setTeaching]=useState(false);
 const [answer,setAnswer]=useState<'correct'|'retry'|null>(null);
 const [childName,setChildName]=useState(()=>loadJson<string>(profileKey,'My Child'));
 const [progress,setProgress]=useState<Progress>(()=>loadJson(progressKey,{}));
 const [listening,setListening]=useState(false);
 const [heard,setHeard]=useState('');
 const [voiceMessage,setVoiceMessage]=useState('');
 const [signedIn,setSignedIn]=useState(()=>loadJson<boolean>(authKey,false));
 const [googleProfile,setGoogleProfile]=useState<{name?:string;email?:string;picture?:string}>(()=>loadJson(googleProfileKey,{}));
 const currentKey=`${subject.name}:${chapter}`;
 const teacher=subject.teacher;
 const pages=useMemo(()=>[1,2,3,4,5,6],[]);
 const isApproved=Boolean(approved[currentKey]);
 const currentProgress=progress[currentKey]??{checks:0,correct:0};
 const totalChecks=Object.values(progress).reduce((n,p)=>n+p.checks,0);
 const totalCorrect=Object.values(progress).reduce((n,p)=>n+p.correct,0);
 const question = subject.name==='Maths' && chapter==='Addition' ? 'What is 2 + 3?' : `Tell ${teacher} one thing you learned about ${chapter}.`;
 useEffect(()=>{localStorage.setItem(profileKey,JSON.stringify(childName));},[childName]);
 useEffect(()=>{localStorage.setItem('gurukulam-approved',JSON.stringify(approved));},[approved]);
 useEffect(()=>{localStorage.setItem(progressKey,JSON.stringify(progress));},[progress]);
 useEffect(()=>{localStorage.setItem(authKey,JSON.stringify(signedIn));},[signedIn]);
 useEffect(()=>{localStorage.setItem(googleProfileKey,JSON.stringify(googleProfile));},[googleProfile]);
 useEffect(()=>{
  const init=()=>{if(!window.google)return;window.google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:(response)=>{const p=decodeGooglePayload(response.credential);setGoogleProfile(p);setSignedIn(true);setVoiceMessage('Google account signed in successfully.');if(p.name&&!childName||childName==='My Child')setChildName(p.name);}})};
  if(window.google)init();else{const timer=window.setInterval(()=>{if(window.google){window.clearInterval(timer);init();}},100);return()=>window.clearInterval(timer)}
 },[]);
 const speak=(text:string)=>{if('speechSynthesis' in window){window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.92;u.lang=subject.name==='Hindi'?'hi-IN':'en-IN';window.speechSynthesis.speak(u);setVoiceMessage('Speaking…')}};
 const toggleListening=()=>{
  const Ctor=(window as Window & {webkitSpeechRecognition?:SpeechRecognitionConstructor;SpeechRecognition?:SpeechRecognitionConstructor}).SpeechRecognition||(window as Window & {webkitSpeechRecognition?:SpeechRecognitionConstructor}).webkitSpeechRecognition;
  if(!Ctor){setVoiceMessage('Voice input is not supported in this browser.');return}
  if(listening){setListening(false);return}
  const recognition=new Ctor(); recognition.continuous=false; recognition.interimResults=false; recognition.lang=subject.name==='Hindi'?'hi-IN':'en-IN';
  recognition.onresult=(event)=>{const text=event.results[0]?.[0]?.transcript||'';setHeard(text);setVoiceMessage('Voice request captured.');};
  recognition.onend=()=>setListening(false); setListening(true);setVoiceMessage('Listening…');recognition.start();
 };
 const recordCheck=(result:'correct'|'retry')=>{setAnswer(result);setProgress(p=>({...p,[currentKey]:{checks:(p[currentKey]?.checks??0)+1,correct:(p[currentKey]?.correct??0)+(result==='correct'?1:0)}}));if(result==='correct')speak(`Excellent ${childName}! You understood ${chapter}.`);else speak(`Let's try ${chapter} again with a simpler explanation.`)};
 const signIn=()=>{if(!window.google){setVoiceMessage('Google Sign-In is loading. Please try again in a moment.');return}window.google.accounts.id.prompt()};
 const signOut=()=>{window.google?.accounts.id.disableAutoSelect();setSignedIn(false);setGoogleProfile({});setVoiceMessage('Signed out of this device.');};
 return <div className="app">
  <header><div><span className="logo">G</span><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><button className="signin" onClick={signedIn?signOut:signIn}>{signedIn?'✓ '+(googleProfile.name||'Parent signed in'):'Sign in with Google'}</button></header>
  <main>
   <section className="hero"><div><span className="eyebrow">PARENT CONTROL CENTRE</span><h1>Plan today's learning.</h1><p>Choose the subject and chapter. Gurukulam AI will show the source pages for parent verification before teaching begins.</p>{signedIn&&<div className="auth-badge">✓ Google account authenticated · {googleProfile.email||'Parent session active'} · Child profile saved</div>}</div><div className={`teacher-card ${teaching?'speaking':''}`}><div className="avatar">{teacher==='Vikram'?'👨‍🏫':'👩‍🏫'}</div><div><small>Today's teacher</small><h2>{teacher}</h2><span>{teacher==='Vikram'?'English · Maths · Computer':'EVS · Hindi · GK · Other subjects'}</span></div></div></section>
   <section className="workspace">
    <aside className="panel subjects"><h3>Subjects</h3>{subjects.map(s=><button key={s.name} className={s.name===subject.name?'selected':''} onClick={()=>{setSubject(s);setChapter(s.chapters[0]);setTeaching(false);setAnswer(null)}}><span>{s.icon}</span><b>{s.name}</b><em>{s.teacher}</em></button>)}</aside>
    <section className="panel chapter"><div className="panel-title"><div><small>STEP 1 · SELECT TOPIC</small><h2>{subject.name}</h2></div><span className="teacher-pill">{teacher === 'Vikram'?'👨‍🏫':'👩‍🏫'} {teacher}</span></div>
      <label>Child</label><input value={childName} onChange={e=>setChildName(e.target.value)} aria-label="Child name" />
      <label>Chapter / Topic</label><select value={chapter} onChange={e=>{setChapter(e.target.value);setTeaching(false);setAnswer(null)}}>{subject.chapters.map(c=><option key={c}>{c}</option>)}</select>
      <div className={`status ${isApproved?'ok':''}`}>{isApproved?'✓ Parent approved':'● Needs parent verification'}</div>
      <div className="pages"><div className="pages-head"><div><small>STEP 2 · SOURCE PAGES</small><h3>Chapter page preview</h3></div><span>{pages.length} pages found</span></div><div className="page-grid">{pages.map(p=><div className="page" key={p}><div className="page-number">{p}</div><div className="paper"><i>GURUKULAM</i><strong>{chapter}</strong><span>Page {p}</span><div className="lines"/></div></div>)}</div></div>
      <div className="actions"><button className="secondary" onClick={()=>setVoiceMessage('Chapter upload is queued for the curriculum ingestion lane.')}>↥ Upload this chapter</button><button className="primary" onClick={()=>setApproved(a=>({...a,[currentKey]:true}))}>✓ Approve pages</button></div>
    </section>
   </section>
   <section className="next panel"><div><small>AFTER APPROVAL</small><h3>{teaching ? `${teacher} is teaching ${childName}` : 'Ready for the Tutor Engine'}</h3><p>{teaching ? `Lesson: ${chapter}. ${answer==='correct'?'Excellent! Mastery check passed.':answer==='retry'?'Let’s try that again with a simpler explanation.':`Question: ${question}`}` : 'The verified chapter becomes the trusted source for teaching, practice, assessment and mastery tracking.'}</p>{currentProgress.checks>0&&<div className="progress-line">Mastery checks: {currentProgress.correct}/{currentProgress.checks} correct</div>}</div><div className="actions"><button className="secondary" disabled={!teaching || !isApproved} onClick={()=>recordCheck('retry')}>I don't know</button><button className="primary" disabled={!isApproved} onClick={()=>{setTeaching(true);setAnswer(null);speak(`Hello ${childName}. I am ${teacher}. Let's learn ${chapter}.`)}}>{teaching ? 'Continue →' : 'Start teaching →'}</button></div></section>
   {teaching && isApproved && <section className="panel check"><small>KNOWLEDGE CHECK</small><h3>{question}</h3><div className="check-actions"><button onClick={()=>recordCheck('correct')}>✓ I know it</button><button onClick={()=>recordCheck('retry')}>↻ Need help</button></div><div className="voice-tools"><button className={listening?'listening':''} onClick={toggleListening}>{listening?'⏹ Stop listening':'🎙 Voice request'}</button><button onClick={()=>speak(question)}>🔊 Read question</button>{heard&&<span>Heard: “{heard}”</span>}</div>{voiceMessage&&<div className="voice-message">{voiceMessage}</div>}</section>}
   <section className="panel progress-board"><div><small>LEARNING SNAPSHOT</small><h3>{childName}'s progress</h3><p>{totalChecks?`${totalCorrect} correct answers across ${totalChecks} mastery checks.`:'No mastery checks yet. Start a lesson to build progress.'}</p></div><div className="progress-stats"><strong>{totalChecks?Math.round(totalCorrect/totalChecks*100):0}%</strong><span>mastery</span></div></section>
  </main>
  <footer>Gurukulam AI · Grade 1 curriculum foundation · Parent-controlled source verification</footer>
 </div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
