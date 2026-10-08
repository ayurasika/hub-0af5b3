(function(root) {
'use strict';
var SLOTS=[
 {id:'shelf-left',name:'棚・左',x:47,y:38},
 {id:'shelf-middle',name:'棚・中央',x:61,y:38},
 {id:'shelf-right',name:'棚・右',x:73,y:38},
 {id:'desk-left',name:'机・左',x:47,y:50},
 {id:'desk-middle',name:'机・中央',x:61,y:50},
 {id:'desk-right',name:'机・右',x:73,y:50},
 {id:'floor-left',name:'床・中央',x:54,y:89},
 {id:'floor-right',name:'床・右',x:72,y:89}
];
function active(rewards){return Object.keys(rewards).sort().slice(-6);}
function known(slot){return SLOTS.some(function(s){return s.id===slot;});}
function normalize(rewards,preferred,secondary){
 var days=active(rewards),out={},used={};
 [preferred||{},secondary||{}].forEach(function(map){
  days.forEach(function(d){var s=map[d];if(!out[d]&&known(s)&&!used[s]){out[d]=s;used[s]=true;}});
 });
 days.forEach(function(d){if(!out[d])SLOTS.some(function(s){if(used[s.id])return false;out[d]=s.id;used[s.id]=true;return true;});});
 return out;
}
function valid(map,rewards){
 if(!map||typeof map!=='object'||Array.isArray(map))throw Error('配置の形式が不正です');
 var days=active(rewards),seen={};
 Object.keys(map).forEach(function(d){if(days.indexOf(d)<0||!known(map[d])||seen[map[d]])throw Error('配置に重複または不正な置き場所があります');seen[map[d]]=true;});
}
function move(map,day,slot){
 if(!Object.prototype.hasOwnProperty.call(map,day)||!known(slot))throw Error('小物または置き場所が変わりました。選び直してください');
 var out={},old=map[day];Object.keys(map).forEach(function(d){out[d]=map[d]===slot?old:map[d];});out[day]=slot;return out;
}
var api={slots:SLOTS,active:active,normalize:normalize,valid:valid,move:move};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomLayout=api;
})(this);
