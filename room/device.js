(function(root){
'use strict';
var ORIGIN='https://ayurasika.github.io',PATH='/hub-0af5b3/',PREFIX='kokoro-room-device-v1:';
var L=typeof module==='object'&&module.exports?require('./layout'):root.RoomLayout;
function create(R,storage,loc,clock){
 if(loc.origin!==ORIGIN||(loc.pathname!==PATH&&loc.pathname!==PATH+'index.html'))throw Error('家具保存は指定の公開ハブでのみ有効です');
 var old=R.prefix+'device-main:',layoutKey=PREFIX+'layout-v1',undoState=null;
 function map(k){if(k.indexOf(old)!==0)throw Error('家具以外への書き込みを拒否しました');return PREFIX+k.slice(old.length);}
 function scope(target){return {get length(){return target.length;},key:function(i){var k=target.key(i);return k&&k.indexOf(PREFIX)===0?old+k.slice(PREFIX.length):'unrelated';},getItem:function(k){return target.getItem(map(k));},setItem:function(k,v){target.setItem(map(k),v);}};}
 var ledger=R.makeLedger(scope(storage),'device-main');
 // Reuse parsed stamp data when the unchanged cache is checked on an older iPad.
 var cachedLocal,cachedShared,cachedStamps;
 var source={kind:'device',read:function(){
  var local=storage.getItem('kanji_master_v2'),shared=storage.getItem('shared-cache');
  if(local!==cachedLocal||shared!==cachedShared||!cachedStamps){
   var reader=R.existingReader(function(k){return k==='kanji_master_v2'?local:shared;});
   var next=reader.read();cachedLocal=local;cachedShared=shared;cachedStamps=next;
  }
  return cachedStamps;
 }};
 var controller=R.makeController(source,ledger,clock);
 function record(s,positions){return {schema:1,campaign:s.config.campaign,positions:positions};}
 function readLayout(s){
  var raw=storage.getItem(layoutKey),saved=null;
  if(raw!==null){try{saved=JSON.parse(raw);}catch(e){throw Error('配置を読み取れません。上書きせず停止しました');}
   if(!saved||saved.schema!==1||saved.campaign!==s.config.campaign||!saved.positions||typeof saved.positions!=='object'||Array.isArray(saved.positions))throw Error('配置の設定が不正です');
   var occupied={};Object.keys(saved.positions).forEach(function(d){
    if(!R.validDay(d)||!s.rewards[d]||!L.slots.some(function(x){return x.id===saved.positions[d];})||occupied[saved.positions[d]])throw Error('配置の設定が不正です');
    occupied[saved.positions[d]]=true;
   });
  }
  var normalized=record(s,L.normalize(s.rewards,saved&&saved.positions));
  var value=JSON.stringify(normalized);
  if(raw!==value)storage.setItem(layoutKey,value);
  return normalized.positions;
 }
 function refresh(){
  var s=controller.refresh();s.layout=s.ledger.config?readLayout(s.ledger):{};
  s.layoutToken=JSON.stringify({days:L.active(s.ledger.rewards),layout:s.layout});
  s.canUndo=!!undoState&&undoState.after===s.layoutToken;
  if(undoState&&!s.canUndo)undoState=null;
  return s;
 }
 function writeLayout(s,positions){storage.setItem(layoutKey,JSON.stringify(record(s.ledger,positions)));}
 function stagingStore(){
  var data={};for(var i=0;i<storage.length;i++){var k=storage.key(i);if(k&&k.indexOf(PREFIX)===0)data[k]=storage.getItem(k);}
  return {get length(){return Object.keys(data).length;},key:function(i){return Object.keys(data)[i]||null;},getItem:function(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null;},setItem:function(k,v){data[k]=v;}};
 }
 return {
  refresh:refresh,
  begin:function(start){ledger.begin(start,R.day(clock()));return refresh();},
  move:function(day,slot,expected){
   var s=refresh();if(expected!==s.layoutToken)throw Error('配置や小物が変わりました。もう一度選んでください');
   var positions=L.move(s.layout,day,slot);if(JSON.stringify(positions)===JSON.stringify(s.layout))return s;
   writeLayout(s,positions);
   undoState={before:s.layout,after:JSON.stringify({days:L.active(s.ledger.rewards),layout:positions})};
   return refresh();
  },
  undo:function(){
   var s=refresh();if(!s.canUndo)throw Error('戻せる配置変更がありません');
   writeLayout(s,undoState.before);undoState=null;return refresh();
  },
  exportJSON:function(){
   var s=refresh();if(!s.ledger.config)throw Error('開始日を設定してください');
   return JSON.stringify({format:'kokoro-room-device-backup-v2',config:s.ledger.config,rewards:s.ledger.rewards,layout:s.layout},null,2);
  },
  restore:function(raw){
   var obj;try{obj=JSON.parse(raw);}catch(e){throw Error('バックアップを読み取れません');}
   if(!obj||(obj.format!=='kokoro-room-device-backup-v1'&&obj.format!=='kokoro-room-device-backup-v2'))throw Error('家具バックアップではありません');
   if(obj.format==='kokoro-room-device-backup-v2')L.valid(obj.layout,obj.rewards||{});
   var incoming={format:'study-room-ledger-fixture',config:obj.config,rewards:obj.rewards};
   var stage=R.makeLedger(scope(stagingStore()),'device-main');
   var merged=stage.mergeJSON(JSON.stringify(incoming),R.day(clock())); // Full validation before real writes.
   var current=ledger.snapshot(),prior=current.config?readLayout(current):{};
   var positions=L.normalize(merged.rewards,obj.format==='kokoro-room-device-backup-v2'?obj.layout:prior,prior);
   ledger.mergeJSON(JSON.stringify(incoming),R.day(clock()));
   try{storage.setItem(layoutKey,JSON.stringify(record(merged,positions)));}
   catch(e){undoState=null;throw Error('家具は復元しましたが配置の保存に失敗しました。同じバックアップで再試行してください');}
   undoState=null;return refresh();
  }
 };
}
var api={create:create,origin:ORIGIN,path:PATH,prefix:PREFIX};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomDevice=api;
})(this);
