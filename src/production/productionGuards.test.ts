import {describe,expect,it} from 'vitest';
import {canStartTeaching,scopedStorageKey,PRODUCTION_RULES} from './productionGuards';
describe('production guards',()=>{
 it('requires authentication and approval',()=>{expect(canStartTeaching(true,true)).toBe(true);expect(canStartTeaching(false,true)).toBe(false);expect(canStartTeaching(true,false)).toBe(false)});
 it('scopes child storage to parent and child',()=>{expect(scopedStorageKey('u/1','c 1','progress')).toBe('gurukulam:u%2F1:c%201:progress')});
 it('keeps critical release rules enabled',()=>{expect(PRODUCTION_RULES.requireGoogleSession).toBe(true);expect(PRODUCTION_RULES.isolateChildDataByUser).toBe(true);expect(PRODUCTION_RULES.requireParentApprovalForTeaching).toBe(true);expect(PRODUCTION_RULES.viewChapterInBrowserOnly).toBe(true);expect(PRODUCTION_RULES.noLocalChapterDownload).toBe(true);expect(PRODUCTION_RULES.voiceFailureMustRecover).toBe(true)});
});
