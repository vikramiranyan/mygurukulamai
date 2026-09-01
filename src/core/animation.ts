export type TeacherAnimationState = 'idle' | 'listening' | 'thinking' | 'teaching' | 'celebrating' | 'encouraging';

export type AnimationCue = {
  teacher: string;
  state: TeacherAnimationState;
  intensity: 0 | 1 | 2;
};

export interface TeacherAvatarEngine {
  setState(cue: AnimationCue): void;
  preload(teacher: string): Promise<void>;
  dispose(): void;
}
