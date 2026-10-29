'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../pets'),S=require('../season'),R=require('../core'),D=require('../device');
function fixture(seed){
 const data={...(seed||{})},writes=[];
 const storage={get length(){return Object.keys(data).length;},key:i=>Object.keys(data)[i]||null,getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null,setItem:(key,value)=>{writes.push({key,value});data[key]=value;}};
 return {data,writes,storage};
}
function backup(state){return JSON.stringify({format:'kokoro-room-pets-backup-v1',state});}
function visible(daifuku,littleMan,quiet){return {schema:1,visible:{daifuku:daifuku,'little-man':littleMan},quiet:quiet};}

test('pet ownership unlocks at 20 and 27 achievement days and stays independent of mutable public data',()=>{
 const gifts=[{id:'daifuku',name:'大福',day:20},{id:'little-man',name:'ちっこいおっさん',day:27}];
 assert.deepEqual(P.gifts,gifts);
 for(const [days,owned,next] of [[19,{},gifts[0]],[20,{daifuku:true},gifts[1]],[26,{daifuku:true},gifts[1]],[27,{daifuku:true,'little-man':true},null],[40,{daifuku:true,'little-man':true},null]]){
  const status=Object.freeze({started:true,days:100,collectionDays:days});
  assert.deepEqual(P.collection(status),{days,owned,total:Object.keys(owned).length,next});
 }
 const status={started:true,collectionDays:19},first=P.collection(status);first.owned['little-man']=true;first.next.day=0;first.next.id='unknown';status.collectionDays=40;
 assert.deepEqual(P.collection({started:true,collectionDays:19}),{days:19,owned:{},total:0,next:gifts[0]});
 const original=P.gifts.map(gift=>({...gift}));
 try{
  P.gifts[0].day=0;P.gifts[0].id='unknown';P.gifts.push({id:'extra',name:'extra',day:0});
  assert.deepEqual(P.collection({started:true,collectionDays:19}),{days:19,owned:{},total:0,next:gifts[0]});
  assert.deepEqual(P.collection({started:true,collectionDays:27}).owned,{daifuku:true,'little-man':true});
 }finally{P.gifts.splice(0,P.gifts.length,...original);}
});

test('pet ownership fails closed for missing, invalid and legacy all-time reward status',()=>{
 const invalid=[undefined,null,false,[],{}, {collectionDays:40},{started:false,collectionDays:40},{started:1,collectionDays:40},{started:'true',collectionDays:40},
  {started:true,days:40},{started:true,collectionDays:undefined},{started:true,collectionDays:null},{started:true,collectionDays:'27'},
  {started:true,collectionDays:NaN},{started:true,collectionDays:Infinity},{started:true,collectionDays:-1},{started:true,collectionDays:26.5}];
 invalid.forEach(status=>assert.deepEqual(P.collection(status),{days:0,owned:{},total:0,next:P.gifts[0]}));
 assert.deepEqual(P.collection({started:true,days:40,collectionDays:19}).owned,{});
});

test('actual sparse validated achievement days unlock pets retroactively without changing seasonal rewards, ledger IDs or saved data',()=>{
 const stamps={'2026-09-30':3},remote={},eligible=[];
 [1,3,5,7,9,11,13].forEach(day=>{stamps['2026-10-'+String(day).padStart(2,'0')]=3;});
 for(let i=0;i<40;i++){
  const day=R.day(new Date(2026,9,15+i*2,12).getTime()),gap=R.day(new Date(2026,9,16+i*2,12).getTime());eligible.push(day);
  stamps[day]=i%3===0?1:3;if(i%3===0)remote['kD_'+day]={v:[3]};stamps[gap]=2;
 }
 const future=R.day(new Date(2026,9,95,12).getTime());stamps[future]=3;
 const oldSeason={schema:1,character:{x:29,y:73},hat:true,cape:true,decor:{ghost:{x:79,y:41}}};
 const petRaw=JSON.stringify(visible(true,true,true)),seasonRaw=JSON.stringify(oldSeason);
 const learning={kanji_master_v2:JSON.stringify({stamps}),'shared-cache':JSON.stringify(remote)};
 const f=fixture({...learning,[P.key]:petRaw,[S.key]:seasonRaw});let now=new Date(2026,9,1,12);
 const furniture=D.create(R,f.storage,{origin:D.origin,pathname:D.path},()=>now.getTime());furniture.begin('2026-10-01');
 assert.deepEqual(R.items,['calm-books','calm-plant','calm-lamp','calm-clock','calm-pencils','calm-box']);
 for(const count of [19,20,26,27,40]){
  now=new Date(eligible[count-1]+'T12:00:00');const room=furniture.refresh();
  assert.equal(Object.keys(room.ledger.rewards).length,count+7);assert.equal(room.ledger.rewards['2026-09-30'],undefined);assert.equal(room.ledger.rewards[future],undefined);
  assert.equal(room.ledger.rewards['2026-10-16'],undefined); // Two stamps in the gaps never count.
  const status={started:!!room.ledger.config,days:Object.keys(room.ledger.rewards).length,collectionDays:S.eligibleDays(room.ledger.rewards,room.day)};
  assert.equal(status.collectionDays,count);const before=JSON.stringify(f.data),writes=f.writes.length;
  const owned=count<20?{}:count<27?{daifuku:true}:{daifuku:true,'little-man':true};
  assert.deepEqual(P.collection(status).owned,owned);assert.deepEqual(P.collection(status).owned,owned);
  assert.equal(S.collection(status).total,6);assert.equal(S.closet(status).total,5);assert.equal(S.autumnCollection(status).total,9);
  assert.equal(S.appearance(S.create(f.storage,false).read().state,status).asset,'witch');
  assert.equal(JSON.stringify(f.data),before);assert.equal(f.writes.length,writes);
  const saved=furniture.exportJSON();furniture.restore(saved);furniture.restore(saved);
  assert.equal(furniture.exportJSON(),saved);assert.equal(JSON.stringify(f.data),before);
  assert.equal(f.data[P.key],petRaw);assert.equal(f.data[S.key],seasonRaw);Object.keys(learning).forEach(key=>assert.equal(f.data[key],learning[key]));
 }
 const saved=furniture.exportJSON(),restoredFixture=fixture({kanji_master_v2:'{"stamps":{}}','shared-cache':'{}',[P.key]:petRaw});
 const restored=D.create(R,restoredFixture.storage,{origin:D.origin,pathname:D.path},()=>now.getTime());restored.restore(saved);
 const room=restored.refresh();assert.equal(S.eligibleDays(room.ledger.rewards,room.day),40);
 assert.deepEqual(P.collection({started:true,collectionDays:S.eligibleDays(room.ledger.rewards,room.day)}).owned,{daifuku:true,'little-man':true});
 assert.equal(restoredFixture.data[P.key],petRaw);
});

test('restoring both visible pet preferences cannot grant ownership or modify the achievement ledger',()=>{
 const f=fixture({kanji_master_v2:'{"stamps":{"2026-10-15":3}}','shared-cache':'{}'});
 const furniture=D.create(R,f.storage,{origin:D.origin,pathname:D.path},()=>new Date(2026,9,15,12).getTime());furniture.begin('2026-10-15');
 const room=furniture.refresh(),status={started:true,collectionDays:S.eligibleDays(room.ledger.rewards,room.day)},before=JSON.stringify(f.data),store=P.create(f.storage,false);
 store.restore(backup(visible(true,true,true)));assert.deepEqual(store.read().state,visible(true,true,true));assert.deepEqual(P.collection(status).owned,{});
 assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.data).filter(([key])=>key!==P.key))),before);
 store.undo();assert.deepEqual(P.collection(status).owned,{});store.restore(backup(visible(true,true,true)));
 assert.deepEqual(P.collection(null).owned,{});assert.deepEqual(store.read().state,visible(true,true,true));
 assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.data).filter(([key])=>key!==P.key))),before);
});

test('absent settings read as hidden companions without writing or sharing mutable state',()=>{
 const f=fixture(),store=P.create(f.storage,false),first=store.read();
 assert.deepEqual(first,{state:visible(false,false,false),token:null,canUndo:false});
 first.state.visible.daifuku=true;first.state.quiet=true;
 assert.deepEqual(store.read().state,visible(false,false,false));assert.deepEqual(P.initial(),visible(false,false,false));
 store.exportJSON();assert.equal(f.writes.length,0);assert.deepEqual(f.data,{});assert.throws(()=>store.undo());
});

test('both companions and quiet preference save independently and survive recreation',()=>{
 const f=fixture(),store=P.create(f.storage,false);let snap=store.read();
 snap.state.visible.daifuku=true;snap=store.save(snap.state,snap.token);
 assert.equal(snap.canUndo,true);assert.deepEqual(snap.state,visible(true,false,false));
 snap.state.visible['little-man']=true;snap.state.quiet=true;snap=store.save(snap.state,snap.token);
 assert.deepEqual(P.create(f.storage,false).read().state,visible(true,true,true));
 snap.state.visible.daifuku=false;snap=store.save(snap.state,snap.token);
 assert.deepEqual(snap.state,visible(false,true,true));assert.deepEqual(P.create(f.storage,false).read().state,snap.state);
 assert.ok(f.writes.every(write=>write.key===P.key));
});

test('reading an existing record preserves its exact bytes and returns independent copies',()=>{
 const raw='{"quiet": true, "visible": {"little-man": true, "daifuku": false}, "schema": 1}';
 const f=fixture({[P.key]:raw}),store=P.create(f.storage,false),snap=store.read();
 assert.equal(snap.token,raw);assert.deepEqual(snap.state,visible(false,true,true));snap.state.visible.daifuku=true;
 assert.deepEqual(store.read().state,visible(false,true,true));assert.equal(f.data[P.key],raw);assert.equal(f.writes.length,0);
});

test('one-step undo restores the preceding preferences and no-op saves retain undo',()=>{
 const f=fixture(),store=P.create(f.storage,false);
 store.save(visible(true,false,false),null);const second=store.save(visible(true,true,true),store.read().token),count=f.writes.length;
 assert.deepEqual(store.save(second.state,second.token),second);assert.equal(f.writes.length,count);
 second.state.visible.daifuku=false;const undone=store.undo();
 assert.deepEqual(undone.state,visible(true,false,false));assert.equal(undone.canUndo,false);assert.throws(()=>store.undo());
 assert.equal(P.create(f.storage,false).read().canUndo,false);
});

test('pet backup round-trips all settings, excludes other data and restore can be undone',()=>{
 const f=fixture({'kanji_master_v2':'fictional learning data',[S.key]:'fictional season data'}),store=P.create(f.storage,false);
 store.save(visible(true,true,true),null);const raw=store.exportJSON(),parsed=JSON.parse(raw);
 assert.deepEqual(parsed,{format:'kokoro-room-pets-backup-v1',state:visible(true,true,true)});
 assert.ok(!raw.includes('learning'));assert.ok(!raw.includes('season'));
 const replacement=fixture(),restored=P.create(replacement.storage,false);restored.restore(raw);
 assert.deepEqual(restored.read().state,parsed.state);const count=replacement.writes.length;
 restored.restore(raw);assert.equal(replacement.writes.length,count);assert.equal(restored.read().canUndo,true);
 restored.undo();assert.deepEqual(restored.read().state,P.initial());
 assert.deepEqual(f.data.kanji_master_v2,'fictional learning data');assert.equal(f.data[S.key],'fictional season data');
});

test('strict state validation rejects unknown IDs, unknown fields, missing fields and incorrect types before writing',()=>{
 const f=fixture(),store=P.create(f.storage,false);store.save(visible(true,false,true),null);
 const before=f.data[P.key],writeCount=f.writes.length;
 const invalid=[null,[],{},'settings', {...P.initial(),schema:2}, {...P.initial(),schema:'1'}, {...P.initial(),quiet:0}, {...P.initial(),quiet:'false'},
  {schema:1,visible:{daifuku:false,'little-man':false}}, {...P.initial(),visible:null}, {...P.initial(),visible:[]},
  {...P.initial(),visible:{daifuku:false}}, {...P.initial(),visible:{daifuku:false,'little-man':'true'}},
  {...P.initial(),visible:{daifuku:false,'little-man':false,unknown:false}}, {...P.initial(),outfit:'green-knit'},
  {...P.initial(),rewards:{}}, {...P.initial(),learning:{}}, JSON.parse('{"schema":1,"visible":{"daifuku":false,"little-man":false,"__proto__":true},"quiet":false}'),
  JSON.parse('{"schema":1,"visible":{"daifuku":false,"little-man":false},"quiet":false,"__proto__":{}}')];
 invalid.forEach(state=>{assert.throws(()=>P.valid(state));assert.throws(()=>store.save(state,before));assert.equal(f.data[P.key],before);});
 assert.equal(f.writes.length,writeCount);assert.equal(store.read().canUndo,true);
});

test('invalid or foreign backups cannot replace valid settings',()=>{
 const f=fixture(),store=P.create(f.storage,false);store.save(visible(true,false,false),null);
 const before=JSON.stringify(f.data),count=f.writes.length;
 const invalid=['{bad','null','[]', '{}',JSON.stringify({format:'kokoro-room-season-backup-v2',state:P.initial()}),
  JSON.stringify({format:'kokoro-room-pets-backup-v2',state:P.initial()}),JSON.stringify({format:'kokoro-room-pets-backup-v1'}),
  JSON.stringify({format:'kokoro-room-pets-backup-v1',state:P.initial(),rewards:{}}),
  JSON.stringify({format:'kokoro-room-pets-backup-v1',state:P.initial(),learning:{}}),
  backup({...P.initial(),visible:{daifuku:true,'little-man':false,extra:true}}),backup({...P.initial(),quiet:null})];
 invalid.forEach(raw=>{assert.throws(()=>store.restore(raw));assert.equal(JSON.stringify(f.data),before);});
 assert.equal(f.writes.length,count);assert.equal(store.read().canUndo,true);
});

test('corrupt stored data is never replaced by save, undo or restore',()=>{
 for(const corrupt of ['broken','null',JSON.stringify({...P.initial(),visible:{daifuku:true,'little-man':false,unknown:true}})]){
  const f=fixture({[P.key]:corrupt}),store=P.create(f.storage,false);
  assert.throws(()=>store.read());assert.throws(()=>store.save(P.initial(),corrupt));assert.throws(()=>store.undo());
  assert.throws(()=>store.exportJSON());assert.throws(()=>store.restore(backup(P.initial())));
  assert.equal(f.data[P.key],corrupt);assert.equal(f.writes.length,0);
 }
});

test('another tab invalidates stale saves and undo without changing its newer settings',()=>{
 const f=fixture(),first=P.create(f.storage,false),second=P.create(f.storage,false),original=first.read();
 first.save(visible(true,false,false),original.token);const stale=first.read();second.save(visible(false,true,true),second.read().token);
 const newer=f.data[P.key],count=f.writes.length;
 assert.throws(()=>first.save(visible(true,true,true),stale.token));assert.throws(()=>first.save(P.initial(),original.token));
 assert.equal(first.read().canUndo,false);assert.throws(()=>first.undo());assert.equal(f.data[P.key],newer);assert.equal(f.writes.length,count);
});

test('restore detects a concurrent change between reading and saving',()=>{
 const old=JSON.stringify(visible(true,false,false)),newer=JSON.stringify(visible(false,true,true));let reads=0,writes=0;
 const store=P.create({getItem:()=>++reads===1?old:newer,setItem:()=>{writes++;}},false);
 assert.throws(()=>store.restore(backup(P.initial())),/別の画面/);assert.equal(writes,0);
});

test('storage read errors refuse every operation before any write',()=>{
 let writes=0;const store=P.create({getItem:()=>{throw Error('SecurityError');},setItem:()=>{writes++;}},false);
 [()=>store.read(),()=>store.save(P.initial(),null),()=>store.undo(),()=>store.exportJSON(),()=>store.restore(backup(P.initial()))].forEach(run=>assert.throws(run,/SecurityError/));
 assert.equal(writes,0);
});

test('failed save, restore and undo keep existing bytes and the usable undo history',()=>{
 const f=fixture();let fail=false;
 const store=P.create({getItem:f.storage.getItem,setItem:(key,value)=>{if(fail)throw Error('QuotaExceededError');f.storage.setItem(key,value);}},false);
 fail=true;assert.throws(()=>store.save(visible(true,false,false),null),/Quota/);assert.equal(store.read().token,null);assert.equal(store.read().canUndo,false);
 fail=false;store.save(visible(true,false,false),null);const before=store.read();fail=true;
 assert.throws(()=>store.save(visible(true,true,true),before.token),/Quota/);assert.throws(()=>store.restore(backup(visible(false,true,true))),/Quota/);assert.throws(()=>store.undo(),/Quota/);
 assert.deepEqual(store.read(),before);assert.equal(f.writes.length,1);
 fail=false;assert.deepEqual(store.undo().state,P.initial());assert.equal(store.read().canUndo,false);
});

test('production and preview settings remain isolated through save, restore and undo',()=>{
 const f=fixture(),main=P.create(f.storage,false),preview=P.create(f.storage,true);
 main.save(visible(true,false,false),null);assert.deepEqual(preview.read().state,P.initial());
 preview.restore(backup(visible(false,true,true)));const mainRaw=f.data[P.key];
 assert.deepEqual(main.read().state,visible(true,false,false));assert.deepEqual(preview.read().state,visible(false,true,true));
 preview.undo();assert.equal(f.data[P.key],mainRaw);assert.deepEqual(preview.read().state,P.initial());
 const previewRaw=f.data[P.previewKey];main.undo();assert.equal(f.data[P.previewKey],previewRaw);
 assert.deepEqual(new Set(f.writes.map(write=>write.key)),new Set([P.key,P.previewKey]));
});

test('all pet operations preserve legacy season saves, learning records, furniture ledger and other room settings',()=>{
 for(const schema of [1,2]){
  const season={schema,character:{x:29,y:73},hat:false,cape:false,decor:{pumpkin:{x:71,y:82}}};if(schema===2)season.outfit='wine-apron';
  const seed={kanji_master_v2:'{"stamps":{"2026-10-15":3}}','shared-cache':'{"fixture":true}',
   [S.key]:JSON.stringify(season),'kokoro-room-device-v1:config':'{"fixture":"existing config"}',
   'kokoro-room-device-v1:reward:daily-three-v1:2026-10-15:2026-10-15':'{"fixture":"existing reward"}',
   'kokoro-room-device-v1:layout-v2':'{"fixture":"existing furniture placement"}','kokoro-room-roam-v1':'false'};
  const f=fixture(seed),store=P.create(f.storage,false),before=S.create(f.storage,false).read().state;
  store.read();store.save(visible(true,true,true),null);const saved=store.exportJSON();store.save(P.initial(),store.read().token);store.undo();store.restore(saved);
  Object.keys(seed).forEach(key=>assert.equal(f.data[key],seed[key]));assert.ok(f.writes.every(write=>write.key===P.key));
  assert.deepEqual(S.create(f.storage,false).read().state,before);
 }
});

test('season backups, clothing undo and actual furniture round-trips coexist with pet restore and undo in the same storage',()=>{
 for(const schema of [1,2]){
  const stamps={};for(let i=15;i<=24;i++)stamps['2026-10-'+i]=3;
  const learning={kanji_master_v2:JSON.stringify({stamps}),'shared-cache':'{"kD_2026-10-24":{"v":[4]},"fixture":{"v":"unchanged"}}','math-progress-fixture':'{"completed":["fixture-unit"]}'};
  const oldSeason={schema,character:{x:29,y:73},hat:schema===1,cape:schema===1,decor:{pumpkin:{x:71,y:82},ghost:{x:79,y:41}}};
  if(schema===2){oldSeason.outfit='wine-apron';oldSeason.decor['autumn-rabbit']={x:16,y:82};}
  const petRaw='{ "quiet": true, "schema": 1, "visible": { "little-man": true, "daifuku": true } }';
  const f=fixture({...learning,[P.key]:petRaw,[S.key]:JSON.stringify(oldSeason,null,2),'kokoro-room-roam-v1':'false'});
  const pets=P.create(f.storage,false),season=S.create(f.storage,false);let now=new Date(2026,9,15,12);
  const furniture=D.create(R,f.storage,{origin:D.origin,pathname:D.path},()=>now.getTime());
  function unchangedPetsAndLearning(){
   assert.equal(f.data[P.key],petRaw);assert.deepEqual(pets.read().state,visible(true,true,true));
   Object.keys(learning).forEach(key=>assert.equal(f.data[key],learning[key]));
  }
  function roomAction(action){const result=action();unchangedPetsAndLearning();return result;}
  assert.deepEqual(roomAction(()=>season.read()).state,S.valid(oldSeason));
  const legacyBackup=JSON.stringify({format:'kokoro-room-season-backup-v'+schema,state:oldSeason});
  const originalSeason=roomAction(()=>season.restore(legacyBackup)).state;
  roomAction(()=>season.save(S.dress(season.read().state,'red-plaid',{started:true,collectionDays:10}),season.read().token));
  assert.equal(season.read().state.outfit,'red-plaid');assert.deepEqual(roomAction(()=>season.undo()).state,originalSeason);
  const seasonBackup=roomAction(()=>season.exportJSON());
  roomAction(()=>season.save(S.dress(season.read().state,'black-dress',{started:true,collectionDays:10}),season.read().token));
  const changedSeason=season.read().state;
  assert.deepEqual(roomAction(()=>season.restore(seasonBackup)).state,originalSeason);
  assert.deepEqual(roomAction(()=>season.undo()).state,changedSeason);
  assert.deepEqual(roomAction(()=>season.restore(seasonBackup)).state,originalSeason);

  roomAction(()=>furniture.begin('2026-10-15'));now=new Date(2026,9,24,12);
  const earned=roomAction(()=>furniture.refresh());assert.equal(Object.keys(earned.ledger.rewards).length,10);
  assert.equal(S.eligibleDays(earned.ledger.rewards,earned.day),10);
  roomAction(()=>furniture.move('2026-10-24',{x:59,y:82},earned.layoutToken));
  const furnitureBackup=roomAction(()=>furniture.exportJSON()),savedFurniture=JSON.parse(furnitureBackup);
  assert.equal(savedFurniture.format,'kokoro-room-device-backup-v3');assert.deepEqual(savedFurniture.layout['2026-10-24'],{x:59,y:82});
  roomAction(()=>furniture.move('2026-10-24',{x:22,y:70},furniture.refresh().layoutToken));
  assert.deepEqual(roomAction(()=>furniture.undo()).layout,savedFurniture.layout);
  roomAction(()=>furniture.move('2026-10-24',{x:26,y:74},furniture.refresh().layoutToken));
  const restoredFurniture=roomAction(()=>furniture.restore(furnitureBackup));
  assert.deepEqual(restoredFurniture.ledger,{config:savedFurniture.config,rewards:savedFurniture.rewards});
  assert.deepEqual(restoredFurniture.layout,savedFurniture.layout);assert.equal(roomAction(()=>furniture.exportJSON()),furnitureBackup);

  const otherRaw=()=>Object.fromEntries(Object.entries(f.data).filter(([key])=>key!==P.key));
  const beforePets=otherRaw();
  function petAction(action){const result=action();assert.deepEqual(otherRaw(),beforePets);return result;}
  const petsBackup=petAction(()=>pets.exportJSON());
  petAction(()=>pets.save(P.initial(),pets.read().token));assert.deepEqual(pets.read().state,P.initial());
  assert.deepEqual(petAction(()=>pets.restore(petsBackup)).state,visible(true,true,true));
  assert.deepEqual(petAction(()=>pets.undo()).state,P.initial());
  assert.deepEqual(petAction(()=>pets.restore(petsBackup)).state,visible(true,true,true));
  assert.deepEqual(S.create(f.storage,false).read().state,originalSeason);
  assert.equal(D.create(R,f.storage,{origin:D.origin,pathname:D.path},()=>now.getTime()).exportJSON(),furnitureBackup);
  assert.deepEqual(otherRaw(),beforePets);
 }
});

test('script exposes RoomPets in a browser without CommonJS or writes',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),context={};
 vm.runInNewContext(fs.readFileSync(require.resolve('../pets'),'utf8'),context);
 assert.equal(context.RoomPets.key,P.key);assert.deepEqual(JSON.parse(JSON.stringify(context.RoomPets.initial())),P.initial());
 const f=fixture();assert.equal(context.RoomPets.create(f.storage,false).read().token,null);assert.equal(f.writes.length,0);
});
