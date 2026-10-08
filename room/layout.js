(function(root){
'use strict';
var SLOTS=[
 {id:'shelf-left',name:'棚・左',x:51,y:31.5},{id:'shelf-middle',name:'棚・中央',x:65,y:31.5},{id:'shelf-right',name:'棚・右',x:77,y:31.5},
 {id:'desk-left',name:'机・左',x:51,y:43.5},{id:'desk-middle',name:'机・中央',x:65,y:43.5},{id:'desk-right',name:'机・右',x:77,y:43.5},
 {id:'floor-left',name:'床・中央',x:58,y:82.5},{id:'floor-right',name:'床・右',x:76,y:82.5}
];
function active(rewards){return Object.keys(rewards).sort().slice(-6);}
function point(value){
 if(typeof value==='string'){var slot=SLOTS.filter(function(s){return s.id===value;})[0];if(!slot)throw Error('置き場所が不正です');return {x:slot.x,y:slot.y};}
 if(!value||typeof value.x!=='number'||typeof value.y!=='number'||!isFinite(value.x)||!isFinite(value.y)||value.x<0||value.x>100||value.y<0||value.y>100)throw Error('位置が不正です');
 return {x:Math.round(value.x*100)/100,y:Math.round(value.y*100)/100};
}
function normalize(rewards,preferred,secondary){
 var out={},days=active(rewards);[preferred||{},secondary||{}].forEach(function(map){days.forEach(function(d){if(!out[d]&&Object.prototype.hasOwnProperty.call(map,d))out[d]=point(map[d]);});});
 days.forEach(function(d){if(!out[d]){var free=SLOTS.filter(function(s){return !Object.keys(out).some(function(k){return Math.abs(out[k].x-s.x)<1&&Math.abs(out[k].y-s.y)<1;});})[0]||SLOTS[0];out[d]={x:free.x,y:free.y};}});
 return out;
}
function valid(map,rewards,allowOld){
 if(!map||typeof map!=='object'||Array.isArray(map))throw Error('配置の形式が不正です');
 var days=allowOld?Object.keys(rewards):active(rewards);Object.keys(map).forEach(function(d){if(days.indexOf(d)<0)throw Error('獲得していない小物の配置です');point(map[d]);});
}
function move(map,day,position){
 if(!Object.prototype.hasOwnProperty.call(map,day))throw Error('小物が変わりました。選び直してください');
 var out={};Object.keys(map).forEach(function(d){out[d]=point(map[d]);});out[day]=point(position);return out;
}
var api={slots:SLOTS,active:active,point:point,normalize:normalize,valid:valid,move:move};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomLayout=api;
})(this);
