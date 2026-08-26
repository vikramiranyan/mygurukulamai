import React, {useMemo, useState} from 'react';
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

function App(){
 const [subject,setSubject]=useState(subjects[1]); const [chapter,setChapter]=useState(subjects[1].chapters[1]); const [approved,setApproved]=useState<Record<string,boolean>>({});
 const currentKey=`${subject.name}:${chapter}`;
 const teacher=subject.teacher;
 const pages=useMemo(()=>[1,2,3,4,5,6],[]);
 return <div className="app">
  <header><div><span className="logo">G</span><div className="brand"><strong>Gurukulam AI</strong><small>Personal AI Teacher</small></div></div><button className="signin">Sign in with Google</button></header>
  <main>
   <section className="hero"><div><span className="eyebrow">PARENT CONTROL CENTRE</span><h1>Plan today's learning.</h1><p>Choose the subject and chapter. Gurukulam AI will show the source pages for parent verification before teaching begins.</p></div><div className="teacher-card"><div className="avatar">{teacher==='Vikram'?'👨‍🏫':'👩‍🏫'}</div><div><small>Today's teacher</small><h2>{teacher}</h2><span>{teacher==='Vikram'?'English · Maths · Computer':'EVS · Hindi · GK · Other subjects'}</span></div></div></section>
   <section className="workspace">
    <aside className="panel subjects"><h3>Subjects</h3>{subjects.map(s=><button key={s.name} className={s.name===subject.name?'selected':''} onClick={()=>{setSubject(s);setChapter(s.chapters[0])}}><span>{s.icon}</span><b>{s.name}</b><em>{s.teacher}</em></button>)}</aside>
    <section className="panel chapter"><div className="panel-title"><div><small>STEP 1 · SELECT TOPIC</small><h2>{subject.name}</h2></div><span className="teacher-pill">{teacher === 'Vikram'?'👨‍🏫':'👩‍🏫'} {teacher}</span></div>
      <label>Chapter / Topic</label><select value={chapter} onChange={e=>setChapter(e.target.value)}>{subject.chapters.map(c=><option key={c}>{c}</option>)}</select>
      <div className={`status ${approved[currentKey]?'ok':''}`}>{approved[currentKey]?'✓ Parent approved':'● Needs parent verification'}</div>
      <div className="pages"><div className="pages-head"><div><small>STEP 2 · SOURCE PAGES</small><h3>Chapter page preview</h3></div><span>{pages.length} pages found</span></div><div className="page-grid">{pages.map(p=><div className="page" key={p}><div className="page-number">{p}</div><div className="paper"><i>GURUKULAM</i><strong>{chapter}</strong><span>Page {p}</span><div className="lines"/></div></div>)}</div></div>
      <div className="actions"><button className="secondary">↥ Upload this chapter</button><button className="primary" onClick={()=>setApproved(a=>({...a,[currentKey]:true}))}>✓ Approve pages</button></div>
    </section>
   </section>
   <section className="next panel"><div><small>AFTER APPROVAL</small><h3>Ready for the Tutor Engine</h3><p>The verified chapter becomes the trusted source for teaching, practice, assessment and mastery tracking.</p></div><button className="primary">Start teaching →</button></section>
  </main>
  <footer>Gurukulam AI · Grade 1 curriculum foundation · Parent-controlled source verification</footer>
 </div>
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
