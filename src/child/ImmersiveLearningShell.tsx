import React, { useEffect, useMemo, useState } from 'react';
import { LearningHome } from './LearningHome';
import type { Child } from '../types/parent';
import type { ChildWorkspace } from '../learningWorkspace';
import './immersive-learning.css';

type Props = { child: Child; onParents: () => void; signout: () => void; workspace?: ChildWorkspace };
type GymId = 'brainstorm' | 'pattern' | 'logic' | 'story' | 'curiosity';
type Challenge = { question: string; options: string[]; answer: string };

const patternChallenges: Challenge[] = [
  { question: 'What comes next? 2, 4, 6, 8, …', options: ['9', '10', '12'], answer: '10' },
  { question: 'What comes next? 5, 10, 15, 20, …', options: ['21', '25', '30'], answer: '25' },
  { question: 'What comes next? 1, 3, 6, 10, …', options: ['12', '14', '15'], answer: '15' },
];
const logicChallenges: Challenge[] = [
  { question: 'Asha has 3 red balls and 2 blue balls. How many balls does she have altogether?', options: ['4', '5', '6'], answer: '5' },
  { question: 'You have 4 pencils. You give 1 away. How many are left?', options: ['2', '3', '4'], answer: '3' },
  { question: 'Which does not belong: apple, banana, carrot?', options: ['apple', 'banana', 'carrot'], answer: 'carrot' },
];

function useSpeechActivity() {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const active = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
      setSpeaking(active);
      timer = window.setTimeout(tick, 120);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return speaking;
}

function GuideCharacter({ childName }: { childName: string }) {
  const speaking = useSpeechActivity();
  const [collapsed, setCollapsed] = useState(false);
  const [blink, setBlink] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setBlink(true), 4200);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!blink) return;
    const timer = window.setTimeout(() => setBlink(false), 150);
    return () => window.clearTimeout(timer);
  }, [blink]);
  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 1100);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  return <aside className={`guide-stage ${collapsed ? 'is-collapsed' : ''}`} aria-label="Gurukulam AI learning guide">
    <div className="guide-stage-glow" />
    {!collapsed && <div className="guide-speech-bubble" aria-live="polite">
      <strong>{speaking ? 'I am explaining…' : `Hi ${childName || 'friend'}! 👋`}</strong>
      <span>{speaking ? 'Listen carefully — I am talking with you.' : 'I will stay beside you while you learn.'}</span>
    </div>}
    <div className={`guide-character ${speaking ? 'is-speaking' : ''} ${celebrating ? 'is-celebrating' : ''}`} role="img" aria-label={speaking ? 'Animated teacher speaking' : 'Animated teacher ready'}>
      <div className="guide-shadow" />
      <div className="guide-legs"><div /><div /></div>
      <div className="guide-body"><div className="guide-torso"><span>GAI</span></div><div className="guide-arm guide-arm-left" /><div className="guide-arm guide-arm-right" /></div>
      <div className="guide-neck" />
      <div className="guide-head">
        <div className="guide-hair" />
        <div className={`guide-eye guide-eye-left ${blink ? 'blink' : ''}`} /><div className={`guide-eye guide-eye-right ${blink ? 'blink' : ''}`} />
        <div className="guide-nose" /><div className={`guide-mouth ${speaking ? 'speaking' : ''}`}><span /></div>
        <div className="guide-ear guide-ear-left" /><div className="guide-ear guide-ear-right" />
      </div>
      {speaking && <div className="guide-sound-waves" aria-hidden="true"><i /><i /><i /></div>}
    </div>
    {!collapsed && <div className="guide-status">{speaking ? '● Speaking' : '● Ready to learn'}</div>}
    <button className="guide-celebrate" onClick={() => setCelebrating(true)} aria-label="Celebrate">⭐</button>
    <button className="guide-toggle" onClick={() => setCollapsed(value => !value)} aria-expanded={!collapsed}>{collapsed ? '👩‍🏫' : '×'}</button>
  </aside>;
}

function MindGym({ childName }: { childName: string }) {
  const [active, setActive] = useState<GymId>('brainstorm');
  const [ideas, setIdeas] = useState(['', '', '']);
  const [ideaTopic, setIdeaTopic] = useState('A better school bag');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [story, setStory] = useState({ hero: 'a curious child', place: 'a magical library', problem: 'a missing map' });
  const [curiosity, setCuriosity] = useState('');
  const challengeSet = active === 'pattern' ? patternChallenges : logicChallenges;
  const challenge = challengeSet[challengeIndex % challengeSet.length];
  const completedIdeas = ideas.filter(item => item.trim()).length;
  const tabs: [GymId, string, string][] = [['brainstorm', '💡', 'Brainstorm'], ['pattern', '🔢', 'Patterns'], ['logic', '🧩', 'Logic'], ['story', '📚', 'Story Studio'], ['curiosity', '🔭', 'Curiosity']];
  const answer = (value: string) => {
    const correct = value === challenge.answer;
    setFeedback(correct ? 'Brilliant! Your brain spotted the idea. 🌟' : 'Good try! Look for the rule and try once more.');
    if (correct) setChallengeIndex(index => index + 1);
  };
  const storyPreview = `Once there was ${story.hero} in ${story.place}. One day, ${story.problem} appeared. What happened next? ${story.hero} had to think, explore and make a clever choice!`;

  return <section className="mind-gym panel" aria-label="Mind Gym">
    <div className="mind-gym-heading"><div><span className="mind-kicker">🧠 BEYOND SCHOOL</span><h2>Mind Gym</h2><p>Playful activities for thinking, creativity, reasoning and curiosity.</p></div><span className="mind-score">{completedIdeas}/3 ideas</span></div>
    <div className="mind-tabs" role="tablist">{tabs.map(([id, icon, label]) => <button key={id} role="tab" aria-selected={active === id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); setFeedback(''); }}>{icon} <span>{label}</span></button>)}</div>

    {active === 'brainstorm' && <div className="gym-card">
      <div className="gym-prompt"><strong>💡 Brainstorm Mission</strong><span>Can you invent 3 improvements for <b>{ideaTopic}</b>?</span></div>
      <label>Change the topic <input value={ideaTopic} onChange={event => setIdeaTopic(event.target.value)} /></label>
      <div className="idea-grid">{ideas.map((idea, index) => <label key={index}>Idea {index + 1}<textarea value={idea} onChange={event => setIdeas(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="My idea is…" rows={2} /></label>)}</div>
      <div className="gym-tip">🌱 There is no single correct answer. Try an unusual idea!</div>
    </div>}

    {(active === 'pattern' || active === 'logic') && <div className="gym-card challenge-card">
      <div className="gym-prompt"><strong>{active === 'pattern' ? '🔢 Pattern Detective' : '🧩 Logic Detective'}</strong><span>{challenge.question}</span></div>
      <div className="challenge-options">{challenge.options.map(option => <button key={option} onClick={() => answer(option)}>{option}</button>)}</div>
      {feedback && <div className="gym-feedback" role="status">{feedback}</div>}
      <button className="next-challenge" onClick={() => { setChallengeIndex(index => index + 1); setFeedback(''); }}>New challenge →</button>
    </div>}

    {active === 'story' && <div className="gym-card">
      <div className="gym-prompt"><strong>📚 Story Studio</strong><span>Build a story using three ingredients, then decide what happens next.</span></div>
      <div className="story-controls">{(['hero', 'place', 'problem'] as const).map(key => <label key={key}>{key}<input value={story[key]} onChange={event => setStory(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
      <div className="story-preview">{storyPreview}</div><div className="gym-tip">🎭 Add a surprise ending in your own words.</div>
    </div>}

    {active === 'curiosity' && <div className="gym-card">
      <div className="gym-prompt"><strong>🔭 Curiosity Corner</strong><span>Ask a “why”, “how” or “what if” question about the world.</span></div>
      <textarea className="curiosity-box" value={curiosity} onChange={event => setCuriosity(event.target.value)} placeholder={`What would ${childName || 'you'} like to discover today?`} rows={4} />
      <div className="curiosity-prompts"><button onClick={() => setCuriosity('Why does the Moon change shape?')}>Why?</button><button onClick={() => setCuriosity('How does a seed become a plant?')}>How?</button><button onClick={() => setCuriosity('What if people could live underwater?')}>What if?</button></div>
      <div className="gym-tip">🔍 Great learners do not stop at answers — they ask better questions.</div>
    </div>}
  </section>;
}

export function ImmersiveLearningShell(props: Props) {
  const childName = props.child.name || 'friend';
  const workspace = props.workspace;
  const hasLearning = Boolean(workspace?.subjects?.length || workspace?.chapters?.length || workspace?.today?.length);
  const welcomeText = useMemo(() => hasLearning ? 'Your lessons are ready. Pick a subject and ask your guide whenever you get stuck.' : 'Your learning world is waiting. Your parent will add subjects and chapters for you.', [hasLearning]);
  return <div className="immersive-learning-shell">
    <LearningHome {...props} />
    <GuideCharacter childName={childName} />
    <div className="immersive-welcome" aria-hidden="true">{welcomeText}</div>
    <MindGym childName={childName} />
  </div>;
}
