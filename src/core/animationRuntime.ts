import type { AnimationCue, TeacherAnimationState } from './animation';
import type { Teacher } from '../curriculum';

export function cueForTurn(teacher: Teacher, turn: 'idle' | 'listen' | 'think' | 'teach' | 'celebrate' | 'encourage'): AnimationCue {
  const states: Record<typeof turn, TeacherAnimationState> = {
    idle: 'idle', listen: 'listening', think: 'thinking', teach: 'teaching', celebrate: 'celebrating', encourage: 'encouraging'
  };
  const state = states[turn];
  const intensity: AnimationCue['intensity'] = state === 'celebrating' || state === 'encouraging' ? 2 : state === 'idle' ? 0 : 1;
  return { teacher, state, intensity };
}
