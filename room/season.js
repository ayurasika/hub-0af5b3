(function(root){
'use strict';
var KEY='kokoro-room-season-v1',PREVIEW='kokoro-room-season-preview-v1',START='2026-10-15',WINTER_START='2026-11-14';
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
var WINTER_GIFTS=[
 {id:'winter-snowman',name:'雪だるまのぬいぐるみ',day:1,asset:'winter-snowman',x:68,y:80},
 {id:'winter-cocoa',name:'マシュマロココア',day:2,asset:'winter-cocoa',x:30,y:37},
 {id:'winter-tree',name:'フェルトのツリー',day:3,asset:'winter-tree',x:88,y:68},
 {id:'winter-lantern',name:'金色のランタン',day:4,asset:'winter-lantern',x:22,y:57},
 {id:'winter-globe',name:'雪のスノードーム',day:5,asset:'winter-globe',x:51,y:33},
 {id:'winter-cookie-house',name:'ジンジャーブレッドのおうち',day:6,asset:'winter-cookie-house',x:64,y:51}
];
WINTER_GIFTS=WINTER_GIFTS.concat([
 {id:'winter-mittens',name:'赤いひもつきミトン',day:8,asset:'winter-mittens',x:20,y:48},
 {id:'winter-skates',name:'青いスケート靴',day:9,asset:'winter-skates',x:46,y:38},
 {id:'winter-fir-wreath',name:'赤いリボンのリース',day:10,asset:'winter-fir-wreath',x:61,y:26},
 {id:'winter-stocking',name:'毛糸のくつした',day:11,asset:'winter-stocking',x:80,y:52},
 {id:'winter-firewood',name:'まきの束',day:12,asset:'winter-firewood',x:35,y:78},
 {id:'winter-sleigh',name:'木のそり',day:13,asset:'winter-sleigh',x:84,y:78},
 {id:'winter-pinecone',name:'松ぼっくりのバケツ',day:15,asset:'winter-pinecone',x:61,y:39},
 {id:'winter-snowflake-plate',name:'雪の結晶のお皿',day:16,asset:'winter-snowflake-plate',x:50,y:60},
 {id:'winter-handbell',name:'銀色のハンドベル',day:17,asset:'winter-handbell',x:20,y:48},
 {id:'winter-thermos',name:'赤い水とう',day:18,asset:'winter-thermos',x:46,y:38},
 {id:'winter-beeswax-candle',name:'みつろうのろうそく',day:19,asset:'winter-beeswax-candle',x:61,y:26},
 {id:'winter-felt-mountain',name:'フェルトの雪山',day:20,asset:'winter-felt-mountain',x:80,y:52},
 {id:'winter-honey',name:'はちみつのびん',day:22,asset:'winter-honey',x:35,y:78},
 {id:'winter-polar-bear',name:'しろくまのぬいぐるみ',day:23,asset:'winter-polar-bear',x:84,y:78},
 {id:'winter-mailbox',name:'小屋のポスト',day:24,asset:'winter-mailbox',x:61,y:39},
 {id:'winter-blanket',name:'白い毛糸のひざかけ',day:25,asset:'winter-blanket',x:50,y:60},
 {id:'winter-gift-box',name:'ピンクのリボンのプレゼント',day:26,asset:'winter-gift-box',x:20,y:48},
 {id:'winter-moon-ornament',name:'三日月のオーナメント',day:27,asset:'winter-moon-ornament',x:46,y:38},
 {id:'winter-cookie-tin',name:'バタークッキーの缶',day:29,asset:'winter-cookie-tin',x:61,y:26},
 {id:'winter-reindeer',name:'白いトナカイ',day:30,asset:'winter-reindeer',x:80,y:52},
 {id:'winter-berry-tart',name:'木いちごのタルト',day:31,asset:'winter-berry-tart',x:35,y:78},
 {id:'winter-nutcracker',name:'くるみ割り人形',day:32,asset:'winter-nutcracker',x:84,y:78},
 {id:'winter-toy-train',name:'おもちゃの汽車',day:33,asset:'winter-toy-train',x:61,y:39},
 {id:'winter-music-box',name:'金色のオルゴール',day:34,asset:'winter-music-box',x:50,y:60},
 {id:'winter-pudding',name:'ひいらぎのプディング',day:36,asset:'winter-pudding',x:20,y:48},
 {id:'winter-star-card',name:'星のカード',day:37,asset:'winter-star-card',x:46,y:38},
 {id:'winter-fir-garland',name:'もみの木のガーランド',day:38,asset:'winter-fir-garland',x:61,y:26},
 {id:'winter-candy-cane',name:'しましまキャンディ',day:39,asset:'winter-candy-cane',x:80,y:52},
 {id:'winter-brush-tree',name:'リボンの小さなツリー',day:40,asset:'winter-brush-tree',x:35,y:78},
 {id:'winter-amaryllis',name:'赤いアマリリス',day:41,asset:'winter-amaryllis',x:84,y:78},
 {id:'winter-lace',name:'レースの敷きもの',day:43,asset:'winter-lace',x:61,y:39},
 {id:'winter-jingle-bells',name:'リボンの鈴',day:44,asset:'winter-jingle-bells',x:50,y:60},
 {id:'winter-mochi',name:'小さな鏡もち',day:45,asset:'winter-mochi',x:20,y:48},
 {id:'winter-plum-vase',name:'梅の花の一輪ざし',day:46,asset:'winter-plum-vase',x:46,y:38},
 {id:'winter-lucky-cat',name:'まねきねこ',day:47,asset:'winter-lucky-cat',x:61,y:26},
 {id:'winter-daruma',name:'赤いだるま',day:48,asset:'winter-daruma',x:80,y:52},
 {id:'winter-paper-crane',name:'折りづるの飾り',day:50,asset:'winter-paper-crane',x:35,y:78},
 {id:'winter-teapot',name:'若草色の急須',day:51,asset:'winter-teapot',x:84,y:78},
 {id:'winter-mandarins',name:'みかんのお皿',day:52,asset:'winter-mandarins',x:61,y:39},
 {id:'winter-cedar-box',name:'金のリボンの木箱',day:53,asset:'winter-cedar-box',x:50,y:60},
 {id:'winter-camellia',name:'つばきの花びん',day:54,asset:'winter-camellia',x:20,y:48},
 {id:'winter-telescope',name:'金色の望遠鏡',day:55,asset:'winter-telescope',x:46,y:38},
 {id:'winter-penguin',name:'青いペンギンのぬいぐるみ',day:57,asset:'winter-penguin',x:61,y:26},
 {id:'winter-moon-pillow',name:'三日月のクッション',day:58,asset:'winter-moon-pillow',x:80,y:52},
 {id:'winter-pouch',name:'むらさきのきんちゃく',day:59,asset:'winter-pouch',x:35,y:78},
 {id:'winter-owl',name:'白いふくろうの置物',day:60,asset:'winter-owl',x:84,y:78},
 {id:'winter-star-books',name:'星のかざりと青い本',day:61,asset:'winter-star-books',x:61,y:39},
 {id:'winter-table-lamp',name:'ひだのあるテーブルランプ',day:62,asset:'winter-table-lamp',x:50,y:60}
]);
var WINTER_OUTFITS=[
 {id:'winter-scarf-knit',name:'白いニットと赤いマフラー',day:7,asset:'winter-scarf-knit',outfit:true},
 {id:'winter-duffle',name:'水色のダッフルコート',day:14,asset:'winter-duffle',outfit:true},
 {id:'winter-velvet',name:'すみれ色のワンピース',day:21,asset:'winter-velvet',outfit:true},
 {id:'winter-quilted',name:'ピンクのキルティングベスト',day:28,asset:'winter-quilted',outfit:true},
 {id:'winter-earmuffs',name:'緑のコートと耳あて',day:35,asset:'winter-earmuffs',outfit:true},
 {id:'winter-star-pajamas',name:'星柄のパジャマ',day:42,asset:'winter-star-pajamas',outfit:true},
 {id:'winter-cardigan',name:'れんが色のカーディガン',day:49,asset:'winter-cardigan',outfit:true},
 {id:'winter-beret-coat',name:'赤いベレー帽と白いコート',day:56,asset:'winter-beret-coat',outfit:true},
 {id:'winter-lavender-cape',name:'ラベンダー色のケープ',day:63,asset:'winter-lavender-cape',outfit:true}
];
var ALL_OUTFITS=OUTFITS.concat(WINTER_OUTFITS);
var WINTER_REWARDS=WINTER_GIFTS.concat(WINTER_OUTFITS).sort(function(a,b){return a.day-b.day;});
DECOR=DECOR.concat(AUTUMN_GIFTS,WINTER_GIFTS);
function countDays(rewards,today,start){return Object.keys(rewards||{}).filter(function(d){return d>=start&&d<=today;}).length;}
function eligibleDays(rewards,today){return countDays(rewards,today,START);}
function winterEligibleDays(rewards,today){return countDays(rewards,today,WINTER_START);}
function earnedDays(status,key){var days=status&&status[key];return status&&status.started&&typeof days==='number'&&isFinite(days)&&days>=0&&Math.floor(days)===days?days:0;}
function collection(status){
 var days=earnedDays(status,'collectionDays');
 var owned={};GIFTS.forEach(function(g,i){if(days>i)owned[g.id]=true;});
 return {days:days,owned:owned,total:Math.min(days,GIFTS.length),next:GIFTS[days]||null};
}
// Derived from already validated achievement days: existing progress unlocks immediately, without a new ledger or writes.
function collectionByDay(days,items){var owned={},total=0,next=null;items.forEach(function(item){if(days>=item.day){owned[item.id]=true;total++;}else if(!next)next=item;});return {days:days,owned:owned,total:total,next:next};}
function autumnCollection(status){return collectionByDay(earnedDays(status,'collectionDays'),AUTUMN_GIFTS);}
function winterCollection(status){return collectionByDay(earnedDays(status,'winterDays'),WINTER_REWARDS);}
function closet(status){return collectionByDay(earnedDays(status,'collectionDays'),OUTFITS);}
function dress(state,id,status){if(!closet(status).owned[id]&&!(WINTER_OUTFITS.some(function(o){return o.id===id;})&&winterCollection(status).owned[id]))throw Error('この服は、まだもらっていません');var next=valid(state);next.outfit=id;next.hat=false;next.cape=false;return next;}
function appearance(state,status){
 var clothes=closet(status),winter=winterCollection(status);
 var outfit=ALL_OUTFITS.filter(function(o){return o.id===state.outfit&&(clothes.owned[o.id]||winter.owned[o.id]);})[0]||OUTFITS[0],gifts=collection(status);
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
 if(!ALL_OUTFITS.some(function(o){return o.id===outfit;})||(outfit!=='green-knit'&&(s.hat||s.cape)))throw Error('服の組み合わせを読み取れません。上書きせず停止しました');
 var next={schema:2,character:point(s.character),outfit:outfit,hat:s.hat,cape:s.cape,decor:{}};
 Object.keys(s.decor).forEach(function(id){if(!DECOR.some(function(d){return d.id===id;}))throw Error('知らない飾りが含まれています');next.decor[id]=point(s.decor[id]);});return next;
}
function create(storage,preview){
 var key=preview?PREVIEW:KEY,undo=null;
 function read(){var raw=storage.getItem(key),state;try{state=raw===null?initial():valid(JSON.parse(raw));}catch(e){throw Error('着せ替えの保存を読み取れません。上書きせず停止しました');}return {state:state,token:raw,canUndo:!!undo&&undo.after===raw};}
 function save(next,expected){var before=read();if(before.token!==expected)throw Error('別の画面で配置が変わりました。もう一度選んでください');var raw=JSON.stringify(valid(next));if(raw===before.token)return before;storage.setItem(key,raw);undo={before:copy(before.state),after:raw};return read();}
 return {read:read,save:save,undo:function(){var s=read();if(!s.canUndo)throw Error('戻せる変更がありません');storage.setItem(key,JSON.stringify(undo.before));undo=null;return read();},exportJSON:function(){return JSON.stringify({format:'kokoro-room-season-backup-v2',state:read().state},null,2);},restore:function(raw){var obj;try{obj=JSON.parse(raw);}catch(e){throw Error('バックアップを読み取れません');}if(!obj||(obj.format!=='kokoro-room-season-backup-v1'&&obj.format!=='kokoro-room-season-backup-v2'))throw Error('飾りと着せ替えのバックアップではありません');return save(valid(obj.state),read().token);}};
}
var api={key:KEY,previewKey:PREVIEW,decor:DECOR,gifts:GIFTS,outfits:OUTFITS,autumnGifts:AUTUMN_GIFTS,winterGifts:WINTER_GIFTS,winterOutfits:WINTER_OUTFITS,winterRewards:WINTER_REWARDS,startDate:START,eligibleDays:eligibleDays,winterEligibleDays:winterEligibleDays,collection:collection,autumnCollection:autumnCollection,winterCollection:winterCollection,closet:closet,dress:dress,appearance:appearance,initial:initial,valid:valid,create:create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomSeason=api;
})(this);
