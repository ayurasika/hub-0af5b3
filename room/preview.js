/* Standalone preview only. Never included by the real hub. */
(function(){
'use strict';
var create=RoomDevice.create;
var sample=/[?&]days=([1-9]|1[0-9]|2[0-5])(?:&|$)/.exec(window.location.search);
if(sample){var reviewDate=new Date(2026,9,15+Number(sample[1])-1,12).getTime();Date.now=function(){return reviewDate;};}
RoomDevice.create=function(R,unused,loc,clock){
 var data={},store={get length(){return Object.keys(data).length;},key:function(i){return Object.keys(data)[i]||null;},getItem:function(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null;},setItem:function(k,v){data[k]=v;}};
 var stamps={};stamps[R.day(clock())]=3;store.setItem('kanji_master_v2',JSON.stringify({stamps:stamps}));
 // Local review fixture: ?days=10, 11, 19 or 25 uses fictional earned days.
 var match=/[?&]days=([1-9]|1[0-9]|2[0-5])(?:&|$)/.exec(window.location.search);
 if(match){var old=/[?&]past=(10)(?:&|$)/.exec(window.location.search),past=old?Number(old[1]):0;var start=new Date(clock());start.setDate(start.getDate()-Number(match[1])+1-past);var first=start.getTime();
  for(var i=0;i<Number(match[1])+past;i++){stamps[R.day(start.getTime())]=3;start.setDate(start.getDate()+1);}
  store.setItem('kanji_master_v2',JSON.stringify({stamps:stamps}));
  create(R,store,{origin:RoomDevice.origin,pathname:RoomDevice.path},function(){return first;}).begin(R.day(first));
 }
 return create(R,store,{origin:RoomDevice.origin,pathname:RoomDevice.path},clock);
};
})();
