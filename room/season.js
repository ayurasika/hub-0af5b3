(function(root){
'use strict';
var KEY='kokoro-room-season-v1',PREVIEW='kokoro-room-season-preview-v1',START='2026-10-15';
var DECOR=[{id:'pumpkin',name:'かぼちゃランタン',x:70,y:83},{id:'ghost',name:'おばけのぬいぐるみ',x:78,y:42},{id:'candy',name:'お菓子かご',x:53,y:43},{id:'stars',name:'月と星のガーランド',x:65,y:26}];
// Bonus collection uses the existing validated daily ledger. Never change old reward IDs.
var GIFTS=[{id:'pumpkin',name:'かぼちゃランタン'},{id:'ghost',name:'おばけのぬいぐるみ'},{id:'candy',name:'お菓子かご'},{id:'hat',name:'魔女の帽子'},{id:'stars',name:'月と星のガーランド'},{id:'cape',name:'星の刺繍のマント'}];
var OUTFITS=[{id:'green-knit',name:'緑のニット',day:0,asset:'kokoa-cafe'},{id:'pink-apron',name:'ピンクのエプロン',day:7,asset:'pink-apron'},{id:'black-dress',name:'黒いワンピース',day:8,asset:'black-dress'},{id:'red-plaid',name:'赤チェックとベレー帽',day:9,asset:'red-plaid'},{id:'wine-apron',name:'ワイン色のエプロン',day:10,asset:'wine-apron'}];
// These are additional unlocks, not daily ledger items. Keep the original six gifts and clothes unchanged.
var AUTUMN_GIFTS=[
 {id:'autumn-rabbit',name:'うさぎのぬいぐるみ',day:11,asset:'autumn-rabbit',x:15,y:82},
 {id:'autumn-bear',name:'くまのぬいぐるみ',day:12,asset:'autumn-bear',x:48,y:84},
 {id:'autumn-cat',name:'ねこのぬいぐるみ',day:13,asset:'autumn-cat',x:85,y:84},
 {id:'autumn-mug',name:'葉っぱのマグ',day:14,asset:'autumn-mug',x:25,y:44},
 {id:'autumn-notebook',name:'どんぐりのノート',day:15,asset:'autumn-notebook',x:35,y:44},
 {id:'autumn-frame',name:'秋の写真立て',day:16,asset:'autumn-frame',x:44,y:44},
 {id:'autumn-wreath',name:'紅葉リース',day:17,asset:'autumn-wreath',x:61,y:22},
 {id:'autumn-acorn',name:'どんぐりの置物',day:18,asset:'autumn-acorn',x:42,y:33},
 {id:'autumn-mushroom',name:'きのこのランプ',day:19,asset:'autumn-mushroom',x:88,y:23}
];
DECOR=DECOR.concat(AUTUMN_GIFTS);
function eligibleDays(rewards,today){return Object.keys(rewards||{}).filter(function(d){return d>=START&&d<=today;}).length;}
function earnedDays(status){var days=status&&status.collectionDays;return status&&status.started&&typeof days==='number'&&isFinite(days)&&days>=0&&Math.floor(days)===days?days:0;}
function collection(status){
 var days=earnedDays(status);
 var owned={};GIFTS.forEach(function(g,i){if(days>i)owned[g.id]=true;});
 return {days:days,owned:owned,total:Math.min(days,GIFTS.length),next:GIFTS[days]||null};
}
// Derived from already validated achievement days: existing progress unlocks immediately, without a new ledger or writes.
function autumnCollection(status){var days=earnedDays(status),owned={},total=0,next=null;AUTUMN_GIFTS.forEach(function(g){if(days>=g.day){owned[g.id]=true;total++;}else if(!next)next=g;});return {days:days,owned:owned,total:total,next:next};}
function closet(status){var days=earnedDays(status),owned={},total=0,next=null;OUTFITS.forEach(function(o){if(days>=o.day){owned[o.id]=true;total++;}else if(!next)next=o;});return {days:days,owned:owned,total:total,next:next};}
function dress(state,id,status){if(!closet(status).owned[id])throw Error('この服は、まだもらっていません');var next=valid(state);next.outfit=id;next.hat=false;next.cape=false;return next;}
function appearance(state,status){
 var clothes=closet(status),outfit=OUTFITS.filter(function(o){return o.id===state.outfit&&clothes.owned[o.id];})[0]||OUTFITS[0],gifts=collection(status);
 var hat=outfit.id==='green-knit'&&!!gifts.owned.hat&&state.hat,cape=outfit.id==='green-knit'&&!!gifts.owned.cape&&state.cape;
 var asset=hat?(cape?'witch':'hat'):(cape?'cape':outfit.asset);
 return {outfit:outfit.id,hat:!!hat,cape:!!cape,asset:asset,name:hat||cape?(hat?'魔女の帽子':'')+(hat&&cape?'と':'')+(cape?'星の刺繍のマント':''):outfit.name};
}
function copy(x){return JSON.parse(JSON.stringify(x));}
function initial(){return {schema:2,character:{x:32,y:70},outfit:'green-knit',hat:false,cape:false,decor:{}};}
function point(p){if(!p||typeof p.x!=='number'||typeof p.y!=='number'||!isFinite(p.x)||!isFinite(p.y)||p.x<0||p.x>100||p.y<0||p.y>100)throw Error('位置を読み取れません');return {x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};}
function valid(s){
 if(!s||(s.schema!==1&&s.schema!==2)||typeof s.hat!=='boolean'||typeof s.cape!=='boolean'||!s.decor||typeof s.decor!=='object'||Array.isArray(s.decor))throw Error('着せ替えの保存を読み取れません。上書きせず停止しました');
 var outfit=s.schema===1?'green-knit':s.outfit;
 if(!OUTFITS.some(function(o){return o.id===outfit;})||(outfit!=='green-knit'&&(s.hat||s.cape)))throw Error('服の組み合わせを読み取れません。上書きせず停止しました');
 var next={schema:2,character:point(s.character),outfit:outfit,hat:s.hat,cape:s.cape,decor:{}};
 Object.keys(s.decor).forEach(function(id){if(!DECOR.some(function(d){return d.id===id;}))throw Error('知らない飾りが含まれています');next.decor[id]=point(s.decor[id]);});return next;
}
function create(storage,preview){
 var key=preview?PREVIEW:KEY,undo=null;
 function read(){var raw=storage.getItem(key),state;try{state=raw===null?initial():valid(JSON.parse(raw));}catch(e){throw Error('着せ替えの保存を読み取れません。上書きせず停止しました');}return {state:state,token:raw,canUndo:!!undo&&undo.after===raw};}
 function save(next,expected){var before=read();if(before.token!==expected)throw Error('別の画面で配置が変わりました。もう一度選んでください');var raw=JSON.stringify(valid(next));if(raw===before.token)return before;storage.setItem(key,raw);undo={before:copy(before.state),after:raw};return read();}
 return {read:read,save:save,undo:function(){var s=read();if(!s.canUndo)throw Error('戻せる変更がありません');storage.setItem(key,JSON.stringify(undo.before));undo=null;return read();},exportJSON:function(){return JSON.stringify({format:'kokoro-room-season-backup-v2',state:read().state},null,2);},restore:function(raw){var obj;try{obj=JSON.parse(raw);}catch(e){throw Error('バックアップを読み取れません');}if(!obj||(obj.format!=='kokoro-room-season-backup-v1'&&obj.format!=='kokoro-room-season-backup-v2'))throw Error('飾りと着せ替えのバックアップではありません');return save(valid(obj.state),read().token);}};
}
var api={key:KEY,previewKey:PREVIEW,decor:DECOR,gifts:GIFTS,outfits:OUTFITS,autumnGifts:AUTUMN_GIFTS,startDate:START,eligibleDays:eligibleDays,collection:collection,autumnCollection:autumnCollection,closet:closet,dress:dress,appearance:appearance,initial:initial,valid:valid,create:create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomSeason=api;
})(this);
