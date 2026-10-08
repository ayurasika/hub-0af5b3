(function(root){
'use strict';
var ORIGIN='https://ayurasika.github.io',PATH='/hub-0af5b3/',PREFIX='kokoro-room-device-v1:';
function create(R,storage,loc,clock){
 if(loc.origin!==ORIGIN||(loc.pathname!==PATH&&loc.pathname!==PATH+'index.html'))throw Error('家具保存は指定の公開ハブでのみ有効です');
 var old=R.prefix+'device-main:';
 function map(k){if(k.indexOf(old)!==0)throw Error('家具以外への書き込みを拒否しました');return PREFIX+k.slice(old.length);}
 var scoped={get length(){return storage.length;},key:function(i){var k=storage.key(i);return k&&k.indexOf(PREFIX)===0?old+k.slice(PREFIX.length):'unrelated';},getItem:function(k){return storage.getItem(map(k));},setItem:function(k,v){storage.setItem(map(k),v);}};
 var ledger=R.makeLedger(scoped,'device-main');
 var source=R.existingReader(function(k){return storage.getItem(k);});
 var controller=R.makeController({kind:'device',read:source.read},ledger,clock);
 return {refresh:controller.refresh,begin:function(start){ledger.begin(start,R.day(clock()));return controller.refresh();},exportJSON:function(){return ledger.exportJSON().replace('study-room-ledger-fixture','kokoro-room-device-backup-v1');},restore:function(raw){var obj;try{obj=JSON.parse(raw);}catch(e){throw Error('バックアップを読み取れません');}if(obj.format!=='kokoro-room-device-backup-v1')throw Error('家具バックアップではありません');obj.format='study-room-ledger-fixture';ledger.mergeJSON(JSON.stringify(obj),R.day(clock()));return controller.refresh();}};
}
var api={create:create,origin:ORIGIN,path:PATH,prefix:PREFIX};if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomDevice=api;
})(this);
