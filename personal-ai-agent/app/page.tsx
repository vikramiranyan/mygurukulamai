"use client";
import { useRef, useState } from "react";
type Message = { role: "user" | "assistant"; content: string };
type Artifact = { name: string; content: string };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null;
  onend: (() => void) | null; start: () => void; stop: () => void;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}
export default function Home() {
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("Press the microphone and speak your task.");
  const [speakReplies, setSpeakReplies] = useState(true);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<Artifact[]>([]);
  const [messages, setMessages] = useState<Message[]>([{role:"assistant",content:"I’m your Personal AI Agent prototype. You can speak a task using the microphone, or type it. I can plan tasks and create downloadable files; browser control and secure code execution are not enabled yet."}]);
  const recognitionRef = useRef<Recognition | null>(null);
  async function submitPrompt(raw: string) {
    const prompt = raw.trim();
    if (!prompt || busy) return;
    const next = [...messages, {role:"user" as const, content:prompt}];
    setMessages(next); setTask(""); setBusy(true); setError("");
    try {
      const res = await fetch("/api/agent", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:next.slice(-12)})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent request failed");
      const answer = String(data.answer || "No response returned.");
      setMessages([...next,{role:"assistant",content:answer}]);
      if (data.artifacts?.length) setFiles(old=>[...data.artifacts,...old].slice(0,10));
      if (speakReplies && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setBusy(false); }
  }
  function startVoice() {
    if (typeof window === "undefined") return;
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      setVoiceNotice("Voice recognition is not supported in this browser. Try the latest Safari or Chrome, or use typing.");
      return;
    }
    try {
      window.speechSynthesis?.cancel();
      const recognition = new Speech();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const spoken = Array.from(event.results as ArrayLike<any>).map((r: any) => r[0]?.transcript || "").join(" ").trim();
        if (spoken) {
          setTask(spoken);
          setVoiceNotice("Heard: " + spoken);
          void submitPrompt(spoken);
        }
      };
      recognition.onerror = (event: any) => {
        setVoiceNotice(event.error === "not-allowed" ? "Microphone permission was denied. Allow microphone access in browser settings." : "Voice input error: " + event.error + ". Press the microphone and try again.");
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setVoiceNotice("Listening… speak your task now.");
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setVoiceNotice("Could not start the microphone. Check browser microphone permission and try again.");
    }
  }
  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
    setVoiceNotice("Voice input stopped.");
  }
  function download(f: Artifact) {
    const u=URL.createObjectURL(new Blob([f.content],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a"); a.href=u; a.download=f.name; a.click(); URL.revokeObjectURL(u);
  }
  return <main className="shell">
    <header><div className="logo">✳</div><div><small>VOICE-FIRST PERSONAL WORKSPACE</small><h1>Personal AI Agent</h1></div><span className="badge">Prototype v0.2</span></header>
    <section className="hero"><small>YOUR VOICE. YOUR TASK. A RESULT.</small><h2>Tell me what to<br/><span>get done for you.</span></h2><p>Press the microphone and speak in English. The agent sends your request to the AI service and can read its reply aloud. Text remains available as a fallback.</p>
      <div className="voice-control">
        <button className={"mic-button" + (listening ? " listening" : "")} type="button" onClick={listening ? stopVoice : startVoice} disabled={busy && !listening} aria-label={listening ? "Stop listening" : "Start voice input"}>{listening ? "■ Stop listening" : "🎙 Speak a task"}</button>
        <span className="voice-status" aria-live="polite">{voiceNotice}</span>
      </div>
      <label className="speak-toggle"><input type="checkbox" checked={speakReplies} onChange={e=>setSpeakReplies(e.target.checked)}/> Read agent replies aloud</label>
      <div className="quick"><button onClick={()=>setTask("Create a responsive school website landing page and provide the HTML and CSS files.")}>Build a website</button><button onClick={()=>setTask("Write a Python script to analyze a CSV file and summarize missing values.")}>Write code</button><button onClick={()=>setTask("Plan a project tracker web app with architecture, milestones, and tests.")}>Plan a project</button></div>
    </section>
    <section className="grid"><div className="panel"><div className="panelhead"><b>Agent conversation</b><span>{listening ? "● Listening" : busy ? "● Working" : "● Ready"}</span></div><div className="chat" aria-live="polite">{messages.map((m,i)=><div className={"msg "+m.role} key={i}><b>{m.role==="user"?"YOU":"AGENT"}</b><p>{m.content}</p></div>)}{busy&&<div className="msg assistant"><b>AGENT</b><p>Working on your task…</p></div>}</div>
      <form onSubmit={e=>{e.preventDefault();void submitPrompt(task);}}><textarea value={task} onChange={e=>setTask(e.target.value)} placeholder="Optional: type a task…" rows={2} disabled={busy}/>{error&&<p className="error">{error}</p>}<div className="formfoot"><small>Never paste passwords or API keys.</small><button disabled={busy||!task.trim()}>{busy?"Working…":"Send task ↗"}</button></div></form></div>
      <aside className="panel side"><div className="panelhead"><b>Capabilities</b><span>v0.2</span></div><div className="cap"><b>✓ Voice input</b><p>Browser speech recognition; microphone permission required.</p><label>ADDED</label></div><div className="cap"><b>✓ Spoken replies</b><p>Browser text-to-speech for agent responses.</p><label>ADDED</label></div><div className="cap"><b>✓ Task planning</b><p>Break down requests into actionable steps.</p><label>ON</label></div><div className="cap"><b>✓ File generation</b><p>Create downloadable code and text files.</p><label>ON</label></div><div className="cap"><b>○ Browser & computer</b><p>Not connected yet.</p><label>NEXT</label></div><div className="cap"><b>○ Secure code execution</b><p>Not implemented yet.</p><label>NEXT</label></div><div className="panelhead"><b>Generated files ({files.length})</b></div>{files.length?files.map((f,i)=><button className="file" key={i} onClick={()=>download(f)}>⇩ {f.name}</button>):<p className="empty">Files created by the agent will appear here.</p>}<div className="notice"><b>Current prototype limits</b><p>Voice capture and spoken replies are browser-dependent. This version does not execute arbitrary shell commands, control a browser, or deploy websites automatically.</p></div></aside></section>
    <footer>PERSONAL AI AGENT · PRIVATE PROJECT <span>Voice input is a first step, not full autonomy.</span></footer>
  </main>;
}
