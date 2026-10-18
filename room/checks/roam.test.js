'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../roam');
function fixture(reduced=false){
 let now=0,id=0,top=100;const jobs=new Map(),winEvents={},docEvents={},classes=new Set(),style={};
 const timer=(fn,delay)=>{jobs.set(++id,{fn,at:now+delay});return id;};
 const motion={matches:reduced,addEventListener:(k,fn)=>motion.change=fn,removeEventListener:()=>{}};
 const win={innerWidth:800,innerHeight:700,setTimeout:timer,clearTimeout:id=>jobs.delete(id),requestAnimationFrame:fn=>timer(fn,16),cancelAnimationFrame:id=>jobs.delete(id),matchMedia:()=>motion,addEventListener:(k,fn)=>winEvents[k]=fn,removeEventListener:k=>delete winEvents[k]};
 const doc={hidden:false,addEventListener:(k,fn)=>docEvents[k]=fn,removeEventListener:k=>delete docEvents[k]};
 const scene={getBoundingClientRect:()=>({width:600,height:400,left:0,right:600,top,bottom:top+400})};
 const node={style,offsetWidth:180,offsetHeight:164,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},getBoundingClientRect:()=>({})},facing={style:{}};
 const roam=M.create({win,doc,node,scene,facing,anchor:{x:32,y:70},clock:()=>now,random:()=>0.75,enabled:true});
 return {roam,jobs,classes,node,facing,winEvents,docEvents,doc,motion,setTop:y=>top=y,advance(ms){const end=now+ms;let steps=0;while(true){const next=[...jobs].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;assert.ok(++steps<200);now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;}};
}
test('native walking uses one transition and freezes at its current position when held',()=>{
 const f=fixture();f.advance(1300);assert.ok(f.classes.has('ss-walking'));assert.match(f.node.style.transition,/transform .*ms linear/);
 assert.equal(f.jobs.size,1); // Only the arrival timer, no JS frame loop.
 f.advance(2000);const current=f.roam.hold();assert.ok(current.x>32&&current.x<66);assert.equal(f.jobs.size,0);assert.equal(f.classes.has('ss-walking'),false);
 f.advance(60000);assert.deepEqual(f.roam.position(),current);f.roam.release();f.advance(2600);assert.ok(f.classes.has('ss-walking'));
 f.roam.setEnabled(false);const stopped=f.roam.position();f.advance(60000);assert.deepEqual(f.roam.position(),stopped);assert.equal(f.jobs.size,0);
});
test('offscreen, hidden and blurred rooms stop scheduling, and resume when visible',()=>{
 const f=fixture();f.advance(1300);f.setTop(-500);f.winEvents.scroll();assert.equal(f.jobs.size,0);assert.equal(f.classes.has('ss-walking'),false);
 f.setTop(100);f.winEvents.scroll();f.advance(1300);assert.ok(f.classes.has('ss-walking'));
 f.doc.hidden=true;f.docEvents.visibilitychange();assert.equal(f.jobs.size,0);f.doc.hidden=false;f.docEvents.visibilitychange();f.advance(1300);assert.ok(f.classes.has('ss-walking'));
 f.winEvents.blur();assert.equal(f.jobs.size,0);f.winEvents.focus();f.advance(1300);assert.ok(f.classes.has('ss-walking'));
 f.roam.destroy();assert.equal(f.jobs.size,0);assert.deepEqual(Object.keys(f.winEvents),[]);assert.deepEqual(Object.keys(f.docEvents),[]);
});
test('saved anchor is stable during unrelated renders, and manual moves replace it safely',()=>{
 const f=fixture();f.advance(3000);const before=f.node.style.transform;f.roam.setAnchor({x:32,y:70});assert.equal(f.node.style.transform,before);assert.ok(f.classes.has('ss-walking'));
 f.roam.hold();f.roam.setAnchor({x:44,y:74});assert.deepEqual(f.roam.position(),{x:44,y:74});assert.equal(f.jobs.size,0);f.roam.release();f.advance(3000);assert.ok(f.classes.has('ss-walking'));
 f.roam.setAnchor({x:44,y:74},true);assert.deepEqual(f.roam.position(),{x:44,y:74});
});
test('floor targets stay inside the room and reduced motion defaults to stopped',()=>{
 const b=M.floorBounds({width:360,height:240,characterWidth:108,characterHeight:98.4});
 for(const n of [0,0.25,0.5,0.75,1]){const p=M.target({x:50,y:72},b,()=>n);assert.ok(p.x>=b.left&&p.x<=b.right);assert.ok(p.y>=b.top&&p.y<=b.bottom);assert.ok(p.y+20.5<=97);}
 assert.deepEqual(M.onFloor({x:-10,y:5},b),{x:b.left,y:b.top});
 const f=fixture(true);assert.equal(f.roam.isEnabled(),false);assert.equal(f.jobs.size,0);f.roam.setEnabled(true);f.advance(1300);assert.ok(f.classes.has('ss-walking'));f.motion.change({matches:true});assert.equal(f.jobs.size,0);assert.equal(f.roam.isEnabled(),false);
});

test('keyboard focus keeps walking paused after a separate interaction finishes',()=>{
 const f=fixture();f.advance(1500);f.roam.hold('focus');f.roam.hold();f.roam.release();f.advance(60000);assert.equal(f.jobs.size,0);assert.equal(f.classes.has('ss-walking'),false);f.roam.release('focus');f.advance(2600);assert.ok(f.classes.has('ss-walking'));
});
