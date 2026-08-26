import type { Subject, Teacher } from '../curriculum';

export type TeacherPersona = {
  name: Teacher;
  subjects: Subject[];
  style: 'structured-male' | 'warm-female';
  voiceEnabled: boolean;
  animationEnabled: boolean;
};

export const teacherPersonas: Record<Teacher, TeacherPersona> = {
  Vikram: {
    name: 'Vikram',
    subjects: ['English', 'Maths', 'Computer'],
    style: 'structured-male',
    voiceEnabled: true,
    animationEnabled: true
  },
  Raji: {
    name: 'Raji',
    subjects: ['EVS', 'Hindi', 'GK'],
    style: 'warm-female',
    voiceEnabled: true,
    animationEnabled: true
  }
};
