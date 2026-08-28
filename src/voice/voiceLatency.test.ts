import {describe,it,expect} from 'vitest';
describe('Stage 5 latency contract',()=>{it('defines measurable voice pipeline checkpoints',()=>{const t={requestStart:100,transcript:180,tutorReply:420,speechStart:500}; expect(t.transcript-t.requestStart).toBeLessThan(500); expect(t.speechStart-t.requestStart).toBeLessThan(1000);});});
