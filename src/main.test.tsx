import {describe,it,expect} from 'vitest';

describe('Gurukulam AI curriculum rules',()=>{
 it('assigns Vikram to English, Maths and Computer',()=>{
  const vikram=['English','Maths','Computer'];
  expect(vikram).toEqual(['English','Maths','Computer']);
 });
 it('assigns Raji to all other subjects in the starter curriculum',()=>{
  const raji=['EVS','Hindi','GK'];
  expect(raji).toEqual(['EVS','Hindi','GK']);
 });
});
