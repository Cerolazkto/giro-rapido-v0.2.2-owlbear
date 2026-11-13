import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ANGLE, QUICK_ANGLES, parseStepAngle, stepFromMetadata } from '../src/angle.js';

test('Passo padrão de 15° para usuário novo ou metadado inválido', () => {
  assert.equal(DEFAULT_ANGLE,15);
  assert.equal(stepFromMetadata({}),15);
  assert.equal(stepFromMetadata(null),15);
  assert.equal(stepFromMetadata({angle:-1}),15);
  assert.equal(stepFromMetadata({angle:0}),15);
});
test('Aceita ângulos individuais com vírgula, ponto e decimais', () => {
  assert.equal(parseStepAngle('22,5'),22.5);
  assert.equal(parseStepAngle(' 12.75 '),12.75);
  assert.equal(stepFromMetadata({angle:22.5}),22.5);
  assert.equal(parseStepAngle('0,1'),0.1);
  assert.equal(parseStepAngle('360'),360);
});
test('Rejeita ângulos impróprios e entrada vazia',()=>{
  for(const x of ['',null,undefined,false,0,'-20','361','abc','Infinity']){
    assert.equal(parseStepAngle(x),null);
  }
});
test('Presets rápidos incluem 15° e valores desejados', () => {
  assert.deepEqual(QUICK_ANGLES,[5,10,15,30,45,90]);
});
