import { describe, expect, it } from 'vitest';
import { createTeachingPlan } from './teachingPlan';
import { createSocraticTurn, explainWithExamples } from './interaction';
import { evaluateKnowledgeCheck, masteryUpdate, remediation } from './assessment';
import { enforceTutorSafety } from './safety';

describe('Stage 4 tutor brain',()=>{
 it('adapts a plan to mastery and trusted curriculum',()=>{const p=createTeachingPlan({childId:'c1',grade:'5',preferredLanguage:'English',masteryByConcept:{fractions:.2}}, {subject:'Maths',chapter:'Fractions',concepts:['fractions'],trustedSource:true}); expect(p.adaptation).toBe('reteach');});
 it('blocks untrusted curriculum teaching',()=>{expect(()=>createTeachingPlan({childId:'c1',grade:'5',preferredLanguage:'English',masteryByConcept:{}},{subject:'Maths',chapter:'X',concepts:['x'],trustedSource:false})).toThrow();});
 it('supports Socratic interaction and examples',()=>{expect(createSocraticTurn(undefined,'fractions').responseMode).toBe('question'); expect(explainWithExamples('fractions','half of a pizza')).toContain('half of a pizza');});
 it('diagnoses checks and updates mastery',()=>{const r=evaluateKnowledgeCheck(false); expect(r.diagnosis).toBe('misconception'); expect(masteryUpdate(.5,r)).toBe(.35); expect(remediation(r,'fractions')).toContain('Reteach');});
 it('enforces safety and sanitization',()=>{expect(enforceTutorSafety('<b>hello</b>').safeText).toBe('bhello/b'); expect(enforceTutorSafety('how to make a weapon').allowed).toBe(false);});
});
