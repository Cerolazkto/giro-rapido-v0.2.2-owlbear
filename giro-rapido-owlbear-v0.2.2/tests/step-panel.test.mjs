import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseStepAngle, stepFromMetadata } from '../src/angle.js';

function harness() {
  const events = new Map();
  class Element {
    constructor(id = '', dataset = {}) {
      this.id = id;
      this.value = '';
      this.disabled = false;
      this.textContent = '';
      this.style = {};
      this.dataset = dataset;
      this.attributes = {};
    }
    addEventListener(type, cb) { events.set(`${this.id}-${type}`, cb); }
    setAttribute(k, v) { this.attributes[k] = v; }
    focus() {}
  }
  const field = new Element('angle');
  const status = new Element('status');
  const less = new Element('less');
  const more = new Element('more');
  const preset = [5, 10, 15, 30, 45, 90].map(n => new Element('preset' + n, {step: String(n)}));
  const elements = { '#angle':field,'#status':status,'#less':less,'#more':more };
  const doc = {
    querySelector(sel) { return elements[sel]; },
    querySelectorAll(sel) {
      if (sel === '[data-step]') return preset;
      if (sel === 'button') return [...preset, less, more];
      throw new Error(sel);
    },
  };
  const writes = [];
  const OBR = {
    isAvailable: true,
    onReady(cb) { void cb(); },
    tool: {
      async getMetadata() { return {angle:15}; },
      async setMetadata(id, meta) { writes.push({id,meta}); },
    },
  };
  const code = readFileSync(new URL('../src/step-panel.js',import.meta.url),'utf8')
    .replace(/^import OBR.*\n/m,'')
    .replace(/^import \{ TOOL_ID \}.*\n/m,'')
    .replace(/^import \{ parseStepAngle, stepFromMetadata \}.*\n/m,'');
  runInNewContext(code, {document:doc, OBR, parseStepAngle,stepFromMetadata,TOOL_ID:'br.dev.girorapido/tool', console});
  return { field,status,preset,events,writes,less,more };
}
const tick = () => new Promise(resolve=>setImmediate(resolve));

test('Painel carrega 15° e mantém destaque do preset', async () => {
  const f=harness();
  await tick();
  assert.equal(f.field.value,'15');
  assert.equal(f.preset[2].attributes['aria-pressed'],'true');
});
test('Painel salva valor manual decimal e volta a refletir no controle',async()=>{
  const f=harness();await tick();
  f.field.value='22,5';
  f.events.get('angle-change')();
  await tick();
  assert.equal(f.writes.at(-1).meta.angle,22.5);
  assert.equal(f.field.value,'22,5');
  assert.equal(f.status.textContent,'Salvo');
});
test('Painel permite seleção de preset e botão +',async()=>{
  const f=harness();await tick();
  f.events.get('preset30-click')();await tick();
  assert.equal(f.writes.at(-1).meta.angle,30);
  f.events.get('more-click')();await tick();
  assert.equal(f.writes.at(-1).meta.angle,31);
});
test('Painel rejeita grau fora do intervalo sem escrever no Owlbear',async()=>{
  const f=harness();await tick();
  f.field.value='500';f.events.get('angle-change')();await tick();
  assert.equal(f.writes.length,0);
  assert.match(f.status.textContent,/0,1° a 360°/);
});
