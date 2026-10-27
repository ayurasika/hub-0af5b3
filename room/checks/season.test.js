'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../season'),R=require('../core'),D=require('../device');
function fixture(){const data={kanji_master_v2:JSON.stringify({stamps:{'2026-10-15':3}}),'shared-cache':'{}'};return {data,storage:{get length(){return Object.keys(data).length},key:i=>Object.keys(data)[i],getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}}};}
test('outfit, character and decorations survive recreation; original outfit can be restored',()=>{
 const {storage}=fixture(),s=S.create(storage,false);let a=s.read();a.state.hat=true;a.state.cape=true;a.state.character={x:63,y:70};a.state.decor.pumpkin={x:22,y:80};s.save(a.state,a.token);
 let b=S.create(storage,false).read();assert.deepEqual(b.state,a.state);b.state.hat=false;b.state.cape=false;s.save(b.state,b.token);assert.equal(s.read().state.hat,false);assert.equal(s.read().state.cape,false);assert.deepEqual(s.read().state.character,{x:63,y:70});
});
test('remove, undo, export and restore round trip',()=>{
 const {storage}=fixture(),s=S.create(storage,false);let a=s.read();a.state.decor.ghost={x:51,y:42};s.save(a.state,a.token);const backup=s.exportJSON();a=s.read();delete a.state.decor.ghost;s.save(a.state,a.token);assert.deepEqual(s.read().state.decor,{});s.undo();assert.ok(s.read().state.decor.ghost);const f=fixture();S.create(f.storage,false).restore(backup);assert.deepEqual(S.create(f.storage,false).read().state,s.read().state);
});
test('reject invalid backup and corrupt storage without overwriting',()=>{
 const {storage,data}=fixture(),s=S.create(storage,false);const before=JSON.stringify(data);
 for(const raw of ['{bad',JSON.stringify({format:'wrong'}),JSON.stringify({format:'kokoro-room-season-backup-v1',state:{...S.initial(),character:{x:101,y:50}}}),JSON.stringify({format:'kokoro-room-season-backup-v1',state:{...S.initial(),decor:{unknown:{x:1,y:1}}}})])assert.throws(()=>s.restore(raw));
 assert.equal(JSON.stringify(data),before);storage.setItem(S.key,'broken');assert.throws(()=>s.read());assert.throws(()=>s.save(S.initial(),'broken'));assert.equal(storage.getItem(S.key),'broken');
});
test('stale drag cannot overwrite another tab; preview is isolated',()=>{
 const {storage}=fixture(),a=S.create(storage,false),b=S.create(storage,false);let old=a.read(),fresh=b.read();fresh.state.hat=true;b.save(fresh.state,fresh.token);assert.throws(()=>a.save(old.state,old.token));const preview=S.create(storage,true);assert.equal(preview.read().state.hat,false);assert.equal(a.read().state.hat,true);
});
test('storage failure preserves data',()=>{
 const store={getItem:()=>null,setItem:()=>{throw Error('QuotaExceededError');}},s=S.create(store,false);assert.throws(()=>s.save({...S.initial(),hat:true},null));assert.equal(s.read().state.hat,false);
});
test('existing rewards and backups still work and learning records stay unchanged',()=>{
 const {storage,data}=fixture(),original=data.kanji_master_v2,shared=data['shared-cache'];const s=S.create(storage,false);let a=s.read();a.state.cape=true;s.save(a.state,a.token);
 const d=D.create(R,storage,{origin:D.origin,pathname:D.path},()=>new Date(2026,9,15,12).getTime());d.begin('2026-10-15');assert.equal(Object.keys(d.refresh().ledger.rewards).length,1);d.restore(d.exportJSON());assert.equal(Object.keys(d.refresh().ledger.rewards).length,1);assert.equal(data.kanji_master_v2,original);assert.equal(data['shared-cache'],shared);
});
test('season collection unlocks one bonus per completed day, including nonconsecutive days',()=>{
 const {storage,data}=fixture();let now=new Date(2026,9,15,12);
 const d=D.create(R,storage,{origin:D.origin,pathname:D.path},()=>now.getTime());
 const gifts=()=>{const s=d.refresh();return S.collection({started:!!s.ledger.config,collectionDays:S.eligibleDays(s.ledger.rewards,s.day)});};
 assert.equal(gifts().total,0);d.begin('2026-10-15');assert.deepEqual(gifts().owned,{pumpkin:true});
 data.kanji_master_v2=JSON.stringify({stamps:{'2026-10-14':99,'2026-10-15':15,'2026-10-16':2}});
 now=new Date(2026,9,16,12);assert.equal(gifts().total,1);assert.equal(gifts().next.id,'ghost');
 const stamps={'2026-10-14':99,'2026-10-15':15,'2026-10-16':2};
 ['2026-10-17','2026-10-19','2026-10-21','2026-10-23','2026-10-25'].forEach((day,i)=>{
  stamps[day]=3;data.kanji_master_v2=JSON.stringify({stamps});now=new Date(day+'T12:00:00');
  assert.equal(gifts().total,i+2);assert.equal(gifts().owned[S.gifts[i+1].id],true);
  const backup=d.exportJSON();d.restore(backup);d.restore(backup);assert.equal(gifts().total,i+2);
 });
 assert.equal(gifts().next,null);assert.equal(gifts().owned.cape,true);
 const original=JSON.stringify(data);gifts();gifts();assert.equal(JSON.stringify(data),original);
 const replacement=fixture(),restored=D.create(R,replacement.storage,{origin:D.origin,pathname:D.path},()=>now.getTime());
 restored.restore(d.exportJSON());assert.equal(S.collection({started:true,collectionDays:S.eligibleDays(restored.refresh().ledger.rewards,restored.refresh().day)}).total,6);
});
test('outfit-only backup does not grant rewards and missing status stays locked',()=>{
 const {storage}=fixture(),s=S.create(storage,false);s.restore(JSON.stringify({format:'kokoro-room-season-backup-v1',state:{...S.initial(),hat:true,cape:true,decor:{pumpkin:{x:70,y:83}}}}));
 for(const status of [null,{}, {started:false,collectionDays:6},{started:true,collectionDays:NaN},{started:true,collectionDays:-1},{started:true,collectionDays:1.5}])assert.deepEqual(S.collection(status).owned,{});
 assert.equal(S.collection({started:true,collectionDays:20}).total,6);
});
test('legacy season save migrates without losing outfit accessories, placement or raw data',()=>{
 const {storage}=fixture(),old={schema:1,character:{x:29,y:73},hat:true,cape:true,decor:{ghost:{x:71,y:42}}};
 const raw=JSON.stringify(old);storage.setItem(S.key,raw);const store=S.create(storage,false),snap=store.read();
 assert.equal(snap.state.schema,2);assert.equal(snap.state.outfit,'green-knit');assert.equal(snap.state.hat,true);assert.deepEqual(snap.state.decor,old.decor);assert.equal(storage.getItem(S.key),raw);
 const restored=fixture(),target=S.create(restored.storage,false);target.restore(JSON.stringify({format:'kokoro-room-season-backup-v1',state:old}));assert.deepEqual(target.read().state,snap.state);
 assert.equal(S.appearance(snap.state,{started:true,collectionDays:6}).asset,'witch');
});
test('clothes unlock on days 7–10, remain owned later and do not bypass stamp rewards',()=>{
 const status=days=>({started:true,collectionDays:days});
 for(let day=0;day<=10;day++){
  const clothes=S.closet(status(day));assert.equal(clothes.total,1+Math.max(0,day-6));
  S.outfits.forEach(o=>assert.equal(!!clothes.owned[o.id],day>=o.day));
 }
 assert.equal(S.closet(status(30)).total,5);assert.equal(S.closet(status(30)).next,null);
 assert.throws(()=>S.dress(S.initial(),'pink-apron',status(6)));assert.throws(()=>S.dress(S.initial(),'unknown',status(30)));
 for(const status of [null,{started:false,days:10},{started:true,collectionDays:NaN}])assert.deepEqual(S.closet(status).owned,{'green-knit':true});
 const unearned={...S.initial(),outfit:'wine-apron'};assert.equal(S.appearance(unearned,status(6)).asset,'kokoa-cafe');assert.equal(S.appearance(unearned,status(10)).asset,'wine-apron');
});
test('changing clothes clears seasonal accessories, preserves position and survives undo and backup',()=>{
 const {storage,data}=fixture(),store=S.create(storage,false),source=data.kanji_master_v2;let snap=store.read();
 snap.state.hat=true;snap.state.cape=true;snap.state.character={x:41,y:79};snap.state.decor.pumpkin={x:72,y:85};store.save(snap.state,snap.token);
 snap=store.read();store.save(S.dress(snap.state,'red-plaid',{started:true,collectionDays:9}),snap.token);
 let next=store.read().state;assert.equal(next.hat,false);assert.equal(next.cape,false);assert.equal(next.outfit,'red-plaid');assert.deepEqual(next.character,{x:41,y:79});assert.deepEqual(next.decor,snap.state.decor);
 const backup=store.exportJSON();assert.equal(JSON.parse(backup).format,'kokoro-room-season-backup-v2');store.undo();assert.equal(store.read().state.hat,true);assert.equal(store.read().state.outfit,'green-knit');
 store.restore(backup);assert.equal(S.create(storage,false).read().state.outfit,'red-plaid');assert.equal(data.kanji_master_v2,source);
 const previous=storage.getItem(S.key);assert.throws(()=>store.restore(JSON.stringify({format:'kokoro-room-season-backup-v2',state:{...next,outfit:'unknown'}})));assert.equal(storage.getItem(S.key),previous);
 assert.throws(()=>store.restore(JSON.stringify({format:'kokoro-room-season-backup-v2',state:{...next,hat:true}})));assert.equal(storage.getItem(S.key),previous);
});
test('existing furniture before launch does not unlock the whole new collection',()=>{
 const {storage,data}=fixture();let now=new Date(2026,9,5,12);const d=D.create(R,storage,{origin:D.origin,pathname:D.path},()=>now.getTime());d.begin('2026-10-05');
 const stamps={};for(let i=5;i<=14;i++)stamps['2026-10-'+String(i).padStart(2,'0')]=3;
 stamps['2026-10-15']=2;data.kanji_master_v2=JSON.stringify({stamps});now=new Date(2026,9,15,12);
 let s=d.refresh();assert.equal(Object.keys(s.ledger.rewards).length,10);assert.equal(S.eligibleDays(s.ledger.rewards,s.day),0);
 assert.equal(S.collection({started:true,days:10,collectionDays:0}).total,0);
 stamps['2026-10-15']=3;data.kanji_master_v2=JSON.stringify({stamps});s=d.refresh();
 const progress={started:true,days:11,collectionDays:S.eligibleDays(s.ledger.rewards,s.day)};
 assert.deepEqual(S.collection(progress).owned,{pumpkin:true});assert.deepEqual(S.closet(progress).owned,{'green-knit':true});
 assert.equal(S.collection({started:true,days:11}).total,0); // A stale UI cannot fall back to the old all-time count.
 const backup=d.exportJSON();d.restore(backup);assert.equal(Object.keys(d.refresh().ledger.rewards).length,11);assert.equal(S.eligibleDays(d.refresh().ledger.rewards,s.day),1);
 const decorated={...S.initial(),hat:true,cape:true,decor:{ghost:{x:75,y:42}}};const season=S.create(storage,false);season.save(decorated,season.read().token);
 assert.equal(S.appearance(season.read().state,progress).asset,'kokoa-cafe');assert.deepEqual(season.read().state.decor,decorated.decor);
 assert.equal(data.kanji_master_v2,JSON.stringify({stamps}));
});
test('autumn unlocks days 11–19 while all original rewards and ledger item IDs remain unchanged',()=>{
 const status=days=>({started:true,collectionDays:days});
 const ids=['autumn-rabbit','autumn-bear','autumn-cat','autumn-mug','autumn-notebook','autumn-frame','autumn-wreath','autumn-acorn','autumn-mushroom'];
 assert.deepEqual(S.autumnGifts.map(g=>g.id),ids);
 assert.deepEqual(S.autumnGifts.map(g=>g.day),[11,12,13,14,15,16,17,18,19]);
 assert.deepEqual(R.items,['calm-books','calm-plant','calm-lamp','calm-clock','calm-pencils','calm-box']);
 assert.deepEqual(S.gifts.map(g=>g.id),['pumpkin','ghost','candy','hat','stars','cape']);
 for(let day=0;day<=30;day++){
  const autumn=S.autumnCollection(status(day)),count=Math.min(9,Math.max(0,day-10));
  assert.equal(autumn.total,count);assert.deepEqual(Object.keys(autumn.owned),ids.slice(0,count));
  assert.equal(autumn.next&&autumn.next.id,ids[count]||null);
  assert.equal(S.collection(status(day)).total,Math.min(6,day));
  assert.equal(S.closet(status(day)).total,Math.min(5,1+Math.max(0,day-6)));
 }
 assert.deepEqual(S.autumnCollection(status(10)).owned,{});
 assert.deepEqual(S.autumnCollection(status(11)).owned,{'autumn-rabbit':true});
 assert.equal(S.autumnCollection(status(19)).next,null);
 for(const status of [null,{}, {started:false,collectionDays:19},{started:true,days:19},{started:true,collectionDays:NaN},{started:true,collectionDays:Infinity},{started:true,collectionDays:-1},{started:true,collectionDays:1.5},{started:true,collectionDays:'19'}])assert.equal(S.autumnCollection(status).total,0);
});
test('existing validated achievement days grant autumn retrospectively without rewriting or duplicating the ledger',()=>{
 const {storage,data}=fixture();let now=new Date(2026,9,15,12);
 const d=D.create(R,storage,{origin:D.origin,pathname:D.path},()=>now.getTime());d.begin('2026-10-15');
 const stamps={};for(let i=0;i<19;i++)stamps[R.day(new Date(2026,9,15+i,12).getTime())]=3;
 data.kanji_master_v2=JSON.stringify({stamps});now=new Date(2026,10,2,12);
 const ledger=d.refresh(),original=data.kanji_master_v2,backup=d.exportJSON();
 assert.equal(Object.keys(ledger.ledger.rewards).length,19);
 const rawBefore=JSON.stringify(data),progress={started:true,collectionDays:S.eligibleDays(ledger.ledger.rewards,ledger.day)};
 assert.equal(S.autumnCollection(progress).total,9);assert.equal(JSON.stringify(data),rawBefore);
 for(let i=0;i<3;i++){
  d.restore(backup);const again=d.refresh();assert.deepEqual(again.ledger.rewards,ledger.ledger.rewards);
  assert.equal(S.autumnCollection({started:true,collectionDays:S.eligibleDays(again.ledger.rewards,again.day)}).total,9);
 }
 assert.equal(d.exportJSON(),backup);assert.equal(JSON.stringify(data),rawBefore);assert.equal(data.kanji_master_v2,original);
 const replacement=fixture(),restored=D.create(R,replacement.storage,{origin:D.origin,pathname:D.path},()=>now.getTime());
 restored.restore(backup);const loaded=restored.refresh();assert.deepEqual(loaded.ledger.rewards,ledger.ledger.rewards);
 assert.equal(S.autumnCollection({started:true,collectionDays:S.eligibleDays(loaded.ledger.rewards,loaded.day)}).total,9);
 assert.equal(S.autumnCollection({started:true,collectionDays:S.eligibleDays(loaded.ledger.rewards,'2026-10-24')}).total,0);
 assert.equal(S.autumnCollection({started:true,collectionDays:S.eligibleDays(loaded.ledger.rewards,'2026-10-25')}).total,1);
});
test('legacy schema 2 state remains byte-for-byte until an autumn placement is saved; all placements and outfit survive reload, undo and backup',()=>{
 const {storage,data}=fixture(),old={schema:2,character:{x:29,y:73},outfit:'wine-apron',hat:false,cape:false,decor:{pumpkin:{x:71,y:82},ghost:{x:79,y:41},candy:{x:54,y:42},stars:{x:66,y:27}}};
 const raw=JSON.stringify(old);storage.setItem(S.key,raw);
 const d=D.create(R,storage,{origin:D.origin,pathname:D.path},()=>new Date(2026,9,15,12).getTime());d.begin('2026-10-15');
 const furniture=d.refresh();d.move('2026-10-15',{x:59,y:82},furniture.layoutToken);
 const otherData=Object.fromEntries(Object.entries(data).filter(([key])=>key!==S.key));
 const store=S.create(storage,false);let snap=store.read();assert.deepEqual(snap.state,old);assert.equal(storage.getItem(S.key),raw);
 const oldBackup=store.exportJSON();assert.equal(storage.getItem(S.key),raw);
 S.autumnGifts.forEach((g,i)=>{snap.state.decor[g.id]={x:11+i*8,y:34+i*5};});store.save(snap.state,snap.token);
 const decorated=S.create(storage,false).read().state;assert.equal(decorated.outfit,'wine-apron');assert.deepEqual(decorated.character,old.character);
 Object.keys(old.decor).forEach(id=>assert.deepEqual(decorated.decor[id],old.decor[id]));
 assert.equal(Object.keys(decorated.decor).length,13);
 const autumnBackup=store.exportJSON();snap=store.read();delete snap.state.decor['autumn-rabbit'];store.save(snap.state,snap.token);
 assert.equal(store.read().state.decor['autumn-rabbit'],undefined);store.undo();assert.deepEqual(store.read().state,decorated);
 store.restore(oldBackup);assert.deepEqual(store.read().state,old);store.undo();assert.deepEqual(store.read().state,decorated);
 const target=fixture(),restored=S.create(target.storage,false);restored.restore(autumnBackup);restored.restore(autumnBackup);
 assert.deepEqual(restored.read().state,decorated);assert.equal(Object.keys(restored.read().state.decor).length,13);
 const red=S.dress(decorated,'red-plaid',{started:true,collectionDays:19});assert.deepEqual(red.decor,decorated.decor);assert.deepEqual(red.character,decorated.character);
 assert.equal(S.appearance(restored.read().state,{started:true,collectionDays:19}).outfit,'wine-apron');
 assert.equal(S.autumnCollection({started:true,collectionDays:10}).total,0);assert.deepEqual(restored.read().state.decor,decorated.decor);
 assert.deepEqual(Object.fromEntries(Object.entries(data).filter(([key])=>key!==S.key)),otherData);
});
test('autumn stale writes and invalid positions preserve every saved item',()=>{
 const {storage}=fixture(),a=S.create(storage,false),b=S.create(storage,false);let initial=a.read();
 initial.state.decor['autumn-rabbit']={x:15,y:82};a.save(initial.state,initial.token);
 const stale=a.read(),fresh=b.read();fresh.state.decor['autumn-bear']={x:48,y:84};b.save(fresh.state,fresh.token);
 const before=storage.getItem(S.key);stale.state.decor['autumn-cat']={x:85,y:84};assert.throws(()=>a.save(stale.state,stale.token));assert.equal(storage.getItem(S.key),before);
 const invalid=JSON.parse(before);invalid.decor['autumn-mug']={x:Infinity,y:44};assert.throws(()=>a.save(invalid,before));assert.equal(storage.getItem(S.key),before);
 const limited={getItem:storage.getItem,setItem:()=>{throw Error('QuotaExceededError');}},store=S.create(limited,false),snap=store.read();snap.state.decor['autumn-cat']={x:85,y:84};
 assert.throws(()=>store.save(snap.state,snap.token));assert.equal(storage.getItem(S.key),before);
});
