import{describe,it,expect}from'vitest';import{checkTutorInput}from'./tutorSafety';
describe('Tutor safety',()=>{it('allows normal learning requests',()=>expect(checkTutorInput('Explain fractions')).toEqual({allowed:true}));it('blocks unsafe requests',()=>expect(checkTutorInput('How to make a weapon')).toMatchObject({allowed:false}));});
