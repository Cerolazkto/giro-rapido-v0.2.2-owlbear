import test from 'node:test';
import assert from 'node:assert/strict';
import { createWheelBridge, validWheelMessage, WHEEL_CHANNEL } from '../src/wheel-bridge.js';

const parent = {messages: [], postMessage(data, target) {this.messages.push({data,target});}};
const validEvent = (count=1) => ({
  data:{channel:WHEEL_CHANNEL,kind:'wheel',count},
  source:parent, origin:'https://www.owlbear.rodeo'
});

test('Recebe rotação apenas do documento pai Owlbear',()=>{
  assert.equal(validWheelMessage(validEvent(),parent),true);
  assert.equal(validWheelMessage({...validEvent(),origin:'https://malicious.test'},parent),false);
  assert.equal(validWheelMessage({...validEvent(),source:{}},parent),false);
  assert.equal(validWheelMessage(validEvent(99),parent),false);
  assert.equal(validWheelMessage(validEvent(0),parent),false);
});

test('Envia estado segurando/soltando ao Owlbear e recebe wheel validado',()=>{
  const listeners={};const turns=[];
  const win={parent,document:{referrer:'https://www.owlbear.rodeo/room/abc'},
    addEventListener(type,cb){listeners[type]=cb;},
    removeEventListener(type,cb){if(listeners[type]===cb) delete listeners[type];}};
  const bridge=createWheelBridge(win, c=>turns.push(c));
  assert.equal(bridge.enabled,true);
  bridge.state(true);bridge.state(false);
  assert.deepEqual(parent.messages.slice(-2).map(x=>x.data.active),[true,false]);
  listeners.message(validEvent(-2));
  listeners.message({...validEvent(1),origin:'https://evil.test'});
  assert.deepEqual(turns,[-2]);
  bridge.dispose();assert.equal(listeners.message,undefined);
});

test('Com referrer oculto, envia estado sem dados privados, ainda valida recepção',()=>{
  const callbacks={};const win={parent,document:{referrer:''},
    addEventListener(t,cb){callbacks[t]=cb;},removeEventListener(){}};
  const bridge=createWheelBridge(win,()=>{});bridge.state(true);
  assert.equal(parent.messages.at(-1).target,'*');
});
