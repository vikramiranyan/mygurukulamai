import { describe, expect, it } from 'vitest';
import { searchCurriculum } from './curriculumSearch';
describe('searchCurriculum', () => { it('finds by title, subject, grade or chapter and returns all for empty query', () => { const items=[{id:'1',title:'Numbers',subject:'Maths',grade:'5',chapter:'Number System'},{id:'2',title:'Plants',subject:'Science',grade:'5',chapter:'Living Things'}]; expect(searchCurriculum(items,'number')).toHaveLength(1); expect(searchCurriculum(items,'')).toHaveLength(2); }); });
