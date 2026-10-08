(function(root){
'use strict';
var RULE='daily-three-v1', PREFIX='study-room-candidate-v2:', ITEMS=['calm-books','calm-plant','calm-lamp','calm-clock','calm-pencils','calm-box'];
function fail(message){throw new Error(message);}
function validDay(s){if(typeof s!=='string'||!/^20\d\d-\d\d-\d\d$/.test(s))return false;var p=s.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);return d.getFullYear()===+p[0]&&d.getMonth()===+p[1]-1&&d.getDate()===+p[2];}
function day(ms){var d=new Date(ms);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function count(n){return typeof n==='number'&&isFinite(n)&&n>=0&&n<=100000&&Math.floor(n)===n;}
function parse(raw,label){try{return raw===null?null:JSON.parse(raw);}catch(e){fail(label+'を読み取れません。上書きせず停止しました。');}}
function dict(x){return x&&typeof x==='object'&&!Array.isArray(x);}
function stampsFrom(local,shared){var out={};function add(k,n){if(validDay(k)&&count(n))out[k]=Math.max(out[k]||0,n);}
 if(dict(local)&&dict(local.stamps))Object.keys(local.stamps).forEach(function(k){add(k,local.stamps[k]);});
 if(dict(shared))Object.keys(shared).forEach(function(k){var v=shared[k]&&shared[k].v;if(k.slice(0,3)==='kD_'&&Array.isArray(v))add(k.slice(3),v[0]);});return out;
}
// The source capability exposes getItem only, never setItem. No network or source mutation.
function existingReader(getItem){return {kind:'existing-readonly',read:function(){return stampsFrom(parse(getItem('kanji_master_v2'),'漢字記録'),parse(getItem('shared-cache'),'同期キャッシュ'));}};}
function fixtureReader(readFixture){return {kind:'fixture',read:function(){var f=readFixture();return stampsFrom(f.local,f.remote);}};}
function config(startDate){return {schema:2,rule:RULE,startDate:startDate,campaign:RULE+':'+startDate,dayBoundary:'device-local-midnight'};}
function validConfig(c){if(!dict(c)||!validDay(c.startDate))return false;var expected=config(c.startDate);return Object.keys(expected).every(function(k){return c[k]===expected[k];})&&Object.keys(c).length===Object.keys(expected).length;}
function reward(c,d){var p=d.split('-'),ordinal=Math.floor(Date.UTC(+p[0],+p[1]-1,+p[2])/86400000);return {id:c.campaign+':'+d,day:d,item:ITEMS[ordinal%ITEMS.length]};}
function same(a,b){return a.id===b.id&&a.day===b.day&&a.item===b.item;}
function makeLedger(storage,namespace){
 if(!/^fixture-[a-z0-9-]+$/.test(namespace)&&namespace!=='device-main')fail('この候補版は架空データ専用です');
 var base=PREFIX+namespace+':',cfgKey=base+'config';
 function getConfig(){var c=parse(storage.getItem(cfgKey),'部屋の設定');if(c!==null&&!validConfig(c))fail('部屋の設定が不正です');return c;}
 function key(c,d){return base+'reward:'+c.campaign+':'+d;}
 function entries(c){var out={};if(!c)return out;var prefix=base+'reward:'+c.campaign+':';for(var i=0;i<storage.length;i++){var k=storage.key(i);if(k&&k.indexOf(prefix)===0){var d=k.slice(prefix.length),v=parse(storage.getItem(k),'家具台帳');if(!validDay(d)||d<c.startDate||!dict(v)||!same(v,reward(c,d)))fail('家具台帳が不正です');out[d]=v;}}return out;}
 function put(c,d){var expected=reward(c,d),old=parse(storage.getItem(key(c,d)),'家具台帳');if(old!==null){if(!dict(old)||!same(old,expected))fail('同日の家具が競合しています');return false;}storage.setItem(key(c,d),JSON.stringify(expected));return true;}
 return {
  begin:function(start,today){if(!validDay(today)||!validDay(start)||start<today)fail('開始日は今日以降を指定してください');var c=getConfig();if(c){if(c.startDate!==start)fail('開始日は設定済みです');return c;}c=config(start);storage.setItem(cfgKey,JSON.stringify(c));return c;},
  snapshot:function(){var c=getConfig();return {config:c,rewards:entries(c)};},
  reconcile:function(stamps,today,kind){if(kind!=='fixture'&&kind!=='device')fail('実記録からの報酬書き込みは禁止しています');if(!validDay(today))fail('日付が不正です');var c=getConfig(),added=[];if(!c)return added;Object.keys(stamps).sort().forEach(function(d){if(validDay(d)&&d>=c.startDate&&d<=today&&count(stamps[d])&&stamps[d]>=3){if(put(c,d))added.push(d);}});return added;},
  exportJSON:function(){var c=getConfig();if(!c)fail('開始日を設定してください');return JSON.stringify({format:'study-room-ledger-fixture',config:c,rewards:entries(c)},null,2);},
  mergeJSON:function(raw,today){var incoming=parse(raw,'家具バックアップ');if(!incoming||incoming.format!=='study-room-ledger-fixture'||!validConfig(incoming.config)||!dict(incoming.rewards)||!validDay(today))fail('家具バックアップの形式が不正です');var c=getConfig();if(c&&JSON.stringify(c)!==JSON.stringify(incoming.config))fail('開始日またはルールが異なるため合流できません');var ic=incoming.config;var days=Object.keys(incoming.rewards);days.forEach(function(d){if(!validDay(d)||d<ic.startDate||d>today||!dict(incoming.rewards[d])||!same(incoming.rewards[d],reward(ic,d)))fail('家具バックアップの内容が不正です');});if(!c){storage.setItem(cfgKey,JSON.stringify(ic));c=ic;}days.forEach(function(d){put(c,d);});return this.snapshot();}
 };
}
function makeController(reader,ledger,clock){return {refresh:function(){var now=day(clock()),stamps=reader.read(),added=[];if((reader.kind==='fixture'||reader.kind==='device'))added=ledger.reconcile(stamps,now,reader.kind);return {day:now,count:stamps[now]||0,added:added,readonly:reader.kind!=='fixture'&&reader.kind!=='device',ledger:ledger.snapshot()};}};}
function watch(win,doc,refresh){function visible(){if(!doc.hidden)refresh();}function storage(e){if(!e.key||e.key==='kanji_master_v2'||e.key==='shared-cache'||e.key.indexOf(PREFIX)===0)refresh();}win.addEventListener('pageshow',refresh);win.addEventListener('focus',visible);win.addEventListener('storage',storage);doc.addEventListener('visibilitychange',visible);var timer=win.setInterval(visible,60000);return function(){win.removeEventListener('pageshow',refresh);win.removeEventListener('focus',visible);win.removeEventListener('storage',storage);doc.removeEventListener('visibilitychange',visible);win.clearInterval(timer);};}
var api={rule:RULE,prefix:PREFIX,items:ITEMS,validDay:validDay,day:day,stampsFrom:stampsFrom,existingReader:existingReader,fixtureReader:fixtureReader,makeLedger:makeLedger,makeController:makeController,watch:watch};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomIntegration=api;
})(this);
