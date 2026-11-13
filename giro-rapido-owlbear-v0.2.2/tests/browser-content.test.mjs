import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code=readFileSync(new URL('../../giro-rapido-browser-v0.2.2/content.js',import.meta.url),'utf8');
const CHANNEL='br.dev.girorapido/wheel-v1';
function mock(){
 const listeners={}; const sent=[];
 const frameWindow={postMessage(data,origin){sent.push([data,origin]);}};
 const frame={src:'http://localhost:5173/background.html?giroBridge=1',contentWindow:frameWindow,isConnected:true};
 const page={addEventListener(type,cb,opts){(listeners[type]||=[]).push([cb,opts]);}};
 const doc={baseURI:'https://www.owlbear.rodeo/room/abc',querySelectorAll:()=>[frame]};
 runInNewContext(code,{window:page,document:doc,URL,Date,Math});
 function fire(type,object={}){
   const event={...object};
   for (const [cb] of listeners[type]||[]) cb(event);
   return event;
 }
 function wheel(deltaY){
   let blocked=false;
   const event=fire('wheel',{deltaY,deltaMode:0,ctrlKey:false,cancelable:true,
     preventDefault(){blocked=true;},stopImmediatePropagation(){}});
   return {blocked,event};
 }
 function start(){
   fire('pointerdown',{button:0});
   fire('message',{origin:'http://localhost:5173',source:frameWindow,
     data:{channel:CHANNEL,kind:'state',active:true}});
 }
 return {sent,start,fire,wheel,listeners,frame};
}

test('Scroll normal não é interceptado sem token pressionado',()=>{
 const f=mock();assert.equal(f.wheel(-100).blocked,false);assert.equal(f.sent.length,0);
});
test('Scroll com token pressionado bloqueia zoom e avisa iframe',()=>{
 const f=mock();f.start();const w=f.wheel(-100);
 assert.equal(w.blocked,true);
 assert.deepEqual(Array.from(f.sent.at(-1)[0] && [f.sent.at(-1)[0].kind,f.sent.at(-1)[0].count]),['wheel',1]);
 assert.equal(f.sent.at(-1)[1],'http://localhost:5173');
});
test('Soltar token restaura scroll normal',()=>{
 const f=mock();f.start();f.wheel(100);f.fire('pointerup',{button:0});
 assert.equal(f.wheel(100).blocked,false);assert.equal(f.sent.length,1);
});
test('Não aceita mensagens de iframe sem a marca do Giro Rápido',()=>{
 const f=mock();f.fire('pointerdown',{button:0});
 f.frame.src='http://localhost:5173/background.html';
 f.fire('message',{source:f.frame.contentWindow,origin:'http://localhost:5173',data:{channel:CHANNEL,kind:'state',active:true}});
 assert.equal(f.wheel(-100).blocked,false);
});
test('Scroll usa listener não-passivo no modo captura',()=>{
 const f=mock();const [,opts]=f.listeners.wheel[0];
 assert.equal(opts.passive,false);assert.equal(opts.capture,true);
});
