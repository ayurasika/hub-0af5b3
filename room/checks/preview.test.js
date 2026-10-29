'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const scripts={};['core','layout','device','preview','season','pets'].forEach(name=>{scripts[name]=fs.readFileSync(path.join(__dirname,'../'+name+'.js'),'utf8');});
function boot(search){
 const accesses=[],unused={};
 ['getItem','setItem','removeItem','clear','key'].forEach(method=>{unused[method]=()=>{accesses.push(method);throw Error('Preview must not access real storage');};});
 Object.defineProperty(unused,'length',{get:()=>{accesses.push('length');throw Error('Preview must not enumerate real storage');}});
 const context=vm.createContext({window:{location:{search},localStorage:unused},unused});
 vm.runInContext('Date.now=function(){return new Date(2026,9,29,12).getTime();};',context);
 const unmodifiedNow=vm.runInContext('Date.now()',context);
 ['core','layout','device','preview','season','pets'].forEach(name=>vm.runInContext(scripts[name],context,{filename:name+'.js'}));
 vm.runInContext('var controller=RoomDevice.create(RoomIntegration,unused,window.location,function(){return Date.now();});',context);
 const result=JSON.parse(vm.runInContext('JSON.stringify((function(){var room=controller.refresh(),status={started:!!room.ledger.config,days:Object.keys(room.ledger.rewards).length,collectionDays:RoomSeason.eligibleDays(room.ledger.rewards,room.day)};return {room:room,status:status,pets:RoomPets.collection(status),now:Date.now()};})())',context));
 return {context,result,accesses,unmodifiedNow};
}

test('preview accepts every day 1–60 and supplies the real collection counts across pet boundaries',()=>{
 for(let days=1;days<=60;days++){
  const f=boot('?days='+days),{room,status,pets}=f.result;
  assert.equal(status.started,true);assert.equal(status.days,days);assert.equal(status.collectionDays,days);
  assert.equal(room.ledger.config.startDate,'2026-10-15');assert.equal(Object.keys(room.ledger.rewards).length,days);
  assert.equal(f.result.now,new Date(2026,9,15+days-1,12).getTime());
  const owned=days<20?{}:days<27?{daifuku:true}:{daifuku:true,'little-man':true};assert.deepEqual(pets.owned,owned);
  assert.deepEqual(f.accesses,[]);
 }
});

test('preview past furniture remains excluded from seasonal and pet achievement counts',()=>{
 for(const days of [1,19,20,26,27,40,60]){
  const f=boot('?past=10&days='+days),{room,status,pets}=f.result;
  assert.equal(room.ledger.config.startDate,'2026-10-05');assert.equal(status.days,days+10);assert.equal(status.collectionDays,days);
  assert.deepEqual(pets.owned,days<20?{}:days<27?{daifuku:true}:{daifuku:true,'little-man':true});
  const before=JSON.stringify(f.result.room.ledger.rewards);
  const after=vm.runInContext('JSON.stringify(controller.refresh().ledger.rewards)',f.context);
  assert.equal(after,before);assert.deepEqual(f.accesses,[]);
 }
});

test('out-of-range or malformed preview days never fabricate progress or change the review clock',()=>{
 for(const search of ['', '?days=0','?days=61','?days=999','?days=01','?days=-1','?days=1.5','?days=20x','?days=abc']){
  const f=boot(search);
  assert.equal(f.result.now,f.unmodifiedNow);assert.equal(f.result.room.ledger.config,null);
  assert.deepEqual(f.result.room.ledger.rewards,{});assert.deepEqual(f.result.status,{started:false,days:0,collectionDays:0});
  assert.deepEqual(f.result.pets.owned,{});assert.deepEqual(f.accesses,[]);
 }
});
