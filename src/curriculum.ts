export type Teacher = 'Vikram' | 'Raji';
export type Subject = 'English' | 'Maths' | 'Computer' | 'EVS' | 'Hindi' | 'GK';

export type Chapter = { id: string; title: string; teacher: Teacher; sourceStatus: 'needs_verification' | 'approved' | 'parent_uploaded'; pages: number[] };

export const teacherFor = (subject: Subject): Teacher =>
  ['English', 'Maths', 'Computer'].includes(subject) ? 'Vikram' : 'Raji';

export const starterCurriculum: Record<Subject, Chapter[]> = {
  English: [
    { id: 'eng-01', title: 'Sounds & Letters', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-02', title: 'Reading', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-03', title: 'Vocabulary', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-04', title: 'Grammar', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] }
  ],
  Maths: [
    { id: 'mat-01', title: 'Numbers', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-02', title: 'Addition', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-03', title: 'Subtraction', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-04', title: 'Shapes', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] }
  ],
  Computer: [
    { id: 'com-01', title: 'Computer Basics', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'com-02', title: 'Parts of a Computer', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] },
    { id: 'com-03', title: 'Digital Safety', teacher: 'Vikram', sourceStatus: 'needs_verification', pages: [] }
  ],
  EVS: [
    { id: 'evs-01', title: 'My Family', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-02', title: 'Plants Around Us', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-03', title: 'Animals', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-04', title: 'Our Neighbourhood', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] }
  ],
  Hindi: [
    { id: 'hin-01', title: 'वर्णमाला', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-02', title: 'शब्द', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-03', title: 'पठन', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-04', title: 'लेखन', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] }
  ],
  GK: [
    { id: 'gk-01', title: 'My World', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-02', title: 'Nature', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-03', title: 'People & Places', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-04', title: 'Fun Facts', teacher: 'Raji', sourceStatus: 'needs_verification', pages: [] }
  ]
};
