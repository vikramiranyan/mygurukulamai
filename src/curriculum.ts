export type Teacher = string;
export type Subject = string;
export type Chapter = { id: string; title: string; sourceStatus: 'needs_verification' | 'approved' | 'parent_uploaded'; pages: number[] };

/**
 * Static chapter fixtures used by curriculum-domain tests and tooling only.
 * Runtime child subjects and teacher assignments come from the child workspace.
 */
export const starterCurriculum: Record<string, Chapter[]> = {
  English: [
    { id: 'eng-01', title: 'Sounds & Letters', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-02', title: 'Reading', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-03', title: 'Vocabulary', sourceStatus: 'needs_verification', pages: [] },
    { id: 'eng-04', title: 'Grammar', sourceStatus: 'needs_verification', pages: [] }
  ],
  Maths: [
    { id: 'mat-01', title: 'Numbers', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-02', title: 'Addition', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-03', title: 'Subtraction', sourceStatus: 'needs_verification', pages: [] },
    { id: 'mat-04', title: 'Shapes', sourceStatus: 'needs_verification', pages: [] }
  ],
  Computer: [
    { id: 'com-01', title: 'Computer Basics', sourceStatus: 'needs_verification', pages: [] },
    { id: 'com-02', title: 'Parts of a Computer', sourceStatus: 'needs_verification', pages: [] },
    { id: 'com-03', title: 'Digital Safety', sourceStatus: 'needs_verification', pages: [] }
  ],
  EVS: [
    { id: 'evs-01', title: 'My Family', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-02', title: 'Plants Around Us', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-03', title: 'Animals', sourceStatus: 'needs_verification', pages: [] },
    { id: 'evs-04', title: 'Our Neighbourhood', sourceStatus: 'needs_verification', pages: [] }
  ],
  Hindi: [
    { id: 'hin-01', title: 'वर्णमाला', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-02', title: 'शब्द', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-03', title: 'पठन', sourceStatus: 'needs_verification', pages: [] },
    { id: 'hin-04', title: 'लेखन', sourceStatus: 'needs_verification', pages: [] }
  ],
  GK: [
    { id: 'gk-01', title: 'My World', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-02', title: 'Nature', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-03', title: 'People & Places', sourceStatus: 'needs_verification', pages: [] },
    { id: 'gk-04', title: 'Fun Facts', sourceStatus: 'needs_verification', pages: [] }
  ]
};
