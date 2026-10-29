(function(root){
'use strict';
var KEY='kokoro-room-pets-v1',PREVIEW='kokoro-room-pets-preview-v1',FORMAT='kokoro-room-pets-backup-v1';
var IDS=['daifuku','little-man'];
var GIFTS=[{id:'daifuku',name:'大福',day:20},{id:'little-man',name:'ちっこいおっさん',day:27}];
function giftCopy(gift){return {id:gift.id,name:gift.name,day:gift.day};}
// Ownership comes only from the same validated achievement count as the seasonal rewards; preferences never grant it.
function collection(status){
 var days=status&&status.collectionDays;
 days=status&&status.started===true&&typeof days==='number'&&isFinite(days)&&days>=0&&Math.floor(days)===days?days:0;
 var owned={},total=0,next=null;
 GIFTS.forEach(function(gift){if(days>=gift.day){owned[gift.id]=true;total++;}else if(!next)next=giftCopy(gift);});
 return {days:days,owned:owned,total:total,next:next};
}
// Companion preferences are independent of rewards, clothes and room placement.
function initial(){return {schema:1,visible:{daifuku:false,'little-man':false},quiet:false};}
function keys(value,names){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(function(name){return Object.prototype.hasOwnProperty.call(value,name);});}
function valid(state){
 if(!keys(state,['schema','visible','quiet'])||state.schema!==1||!keys(state.visible,IDS)||typeof state.quiet!=='boolean'||!IDS.every(function(id){return typeof state.visible[id]==='boolean';}))throw Error('ペットの保存を読み取れません。上書きせず停止しました');
 return {schema:1,visible:{daifuku:state.visible.daifuku,'little-man':state.visible['little-man']},quiet:state.quiet};
}
function create(storage,preview){
 var key=preview?PREVIEW:KEY,undo=null;
 function snapshot(state,token){return {state:valid(state),token:token,canUndo:!!undo&&undo.after===token};}
 function read(){
  var raw=storage.getItem(key),state;
  try{state=raw===null?initial():valid(JSON.parse(raw));}catch(e){throw Error('ペットの保存を読み取れません。上書きせず停止しました');}
  return snapshot(state,raw);
 }
 function save(next,expected){
  var before=read();if(before.token!==expected)throw Error('別の画面でペットの設定が変わりました。もう一度選んでください');
  var state=valid(next),raw=JSON.stringify(state);if(raw===before.token)return before;
  storage.setItem(key,raw);undo={before:before.state,after:raw};
  return snapshot(state,raw);
 }
 return {
  read:read,
  save:save,
  undo:function(){
   var current=read();if(!current.canUndo)throw Error('戻せる変更がありません');
   var state=valid(undo.before),raw=JSON.stringify(state);storage.setItem(key,raw);undo=null;return snapshot(state,raw);
  },
  exportJSON:function(){return JSON.stringify({format:FORMAT,state:read().state},null,2);},
  restore:function(raw){
   var backup;try{backup=JSON.parse(raw);}catch(e){throw Error('バックアップを読み取れません');}
   if(!keys(backup,['format','state'])||backup.format!==FORMAT)throw Error('ペット設定のバックアップではありません');
   var state=valid(backup.state);return save(state,read().token);
  }
 };
}
var api={key:KEY,previewKey:PREVIEW,ids:IDS.slice(),gifts:GIFTS.map(giftCopy),collection:collection,initial:initial,valid:valid,create:create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomPets=api;
})(this);
