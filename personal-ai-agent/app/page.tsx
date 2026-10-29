"use client";
import { useState } from "react";
type Message = { role: "user" | "assistant"; content: string };
type Artifact = { name: string; content: string };
export default function Home() {
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<Artifact[]>([]);
  const [messages, setMessages] = useState<Message[]>([{role:"assistant",content:"I’m your Personal AI Agent. Describe a task and I’ll plan it or create starter files. Browser control, shell execution, and automatic deployment are not enabled yet."}]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const prompt = task.trim(); if (!prompt || busy) return;
    const next = [...messages, {role:"user" as const, content:prompt}]; setMessages(next); setTask(""); setBusy(true); setError("");
    try {
      const res = await fetch("/api/agent", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-12)})});
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Agent request failed");
      setMessages([...next,{role:"assistant",content:data.answer}]); if (data.artifacts?.length) setFiles(old=>[...data.artifacts,...old].slice(0,10));
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setBusy(false); }
  }
  function download(f: Artifact) { const u=URL.createObjectURL(new Blob([f.content],{type:"text/plain;charset=utf-8"})); const a=document.createElement("a"); a.href=u; a.download=f.name; a.click(); URL.revokeObjectURL(u); }
  return <main className="shell">
    <header><div className="logo">✳</div><div><small>PERSONAL WORKSPACE</small><h1>Personal AI Agent</h1></div><span className="badge">Prototype v0.1</span></header>
    <section className="hero"><small>YOUR TASK. A PLAN. A RESULT.</small><h2>What should I<br/><span>get done for you?</span></h2><p>Describe the outcome you want. The agent can reason through a task, plan next steps, and create code or text files for you.</p>
      <div className="quick"><button onClick={()=>setTask("Create a responsive school website landing page and provide the HTML and CSS files.")}>Build a website</button><button onClick={()=>setTask("Write a Python script to analyze a CSV file and summarize missing values.")}>Write code</button><button onClick={()=>setTask("Plan a project tracker web app with architecture, milestones, and tests.")}>Plan a project</button></div>
    </section>
    <section className="grid"><div className="panel"><div className="panelhead"><b>Agent conversation</b><span>● Cloud-ready</span></div><div className="chat">{messages.map((m,i)=><div className={"msg "+m.role} key={i}><b>{m.role==="user"?"YOU":"AGENT"}</b><p>{m.content}</p></div>)}{busy&&<div className="msg assistant"><b>AGENT</b><p>Working on your task…</p></div>}</div>
      <form onSubmit={submit}><textarea value={task} onChange={e=>setTask(e.target.value)} placeholder="Describe a task you want completed…" rows={3} disabled={busy}/>{error&&<p className="error">{error}</p>}<div className="formfoot"><small>Do not paste passwords or API keys.</small><button disabled={busy||!task.trim()}>{busy?"Working…":"Run task ↗"}</button></div></form></div>
      <aside className="panel side"><div className="panelhead"><b>Capabilities</b><span>v0.1</span></div><div className="cap"><b>✓ Task planning</b><p>Break down requests into actionable steps.</p><label>ON</label></div><div className="cap"><b>✓ File generation</b><p>Create downloadable code and text files.</p><label>ON</label></div><div className="cap"><b>○ Browser & computer</b><p>Integration planned; not connected yet.</p><label>NEXT</label></div><div className="cap"><b>○ Persistent memory</b><p>Database-backed memory not connected.</p><label>NEXT</label></div><div className="panelhead"><b>Generated files ({files.length})</b></div>{files.length?files.map((f,i)=><button className="file" key={i} onClick={()=>download(f)}>⇩ {f.name}</button>):<p className="empty">Files created by the agent will appear here.</p>}<div className="notice"><b>Safety by design</b><p>This prototype does not execute arbitrary shell commands or deploy generated code automatically.</p></div></aside></section>
    <footer>PERSONAL AI AGENT · PRIVATE PROJECT <span>Designed to grow one safe capability at a time.</span></footer>
  </main>;
}
