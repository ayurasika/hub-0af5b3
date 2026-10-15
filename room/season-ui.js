(function(){
'use strict';
var host=document.getElementById('study-room');if(!host)return;
var scene=host.querySelector('.sr-scene'),panel=document.getElementById('sr-season'),layer=document.getElementById('sr-season-layer'),S=RoomSeason,store,snap,drag=null,frame=0,nodes={},selected=null;
var preview=host.getAttribute('data-room-preview')==='true',gifts,clothes;
function el(id){return document.getElementById('ss-'+id);}
function safe(fn){try{fn();el('error').textContent='';}catch(e){el('error').textContent=e.message;}}
function bound(p,node){var r=scene.getBoundingClientRect(),w=node.offsetWidth/r.width*50,h=node.offsetHeight/r.height*50;return {x:Math.max(w,Math.min(100-w,p.x)),y:Math.max(h,Math.min(100-h,p.y))};}
function place(node,p){p=bound(p,node);node.style.left=p.x+'%';node.style.top=p.y+'%';}
function position(id){return id==='character'?snap.state.character:gifts.owned[id]&&snap.state.decor[id];}
function select(id){selected=id;Object.keys(nodes).forEach(function(k){nodes[k].classList.toggle('ss-selected',k===id);nodes[k].style.zIndex=k===id?'4':k==='character'?'2':'1';});el('selected').textContent=id==='character'?'ここあ':S.decor.filter(function(d){return d.id===id;})[0].name;el('move').hidden=false;}
function render(){
 snap=store.read();
 var status=window.RoomRewardStatus;gifts=S.collection(status);clothes=S.closet(status);
 el('rewards').textContent=!status?'ごほうびの記録を確認できません。部屋のエラー表示を確認してください。':!status.started?'「今日から部屋をはじめる」を押すと、1日にハンコ3個でごほうびが増えます。':gifts.next?'ハロウィンのごほうび '+gifts.total+' / 6。つぎは「'+gifts.next.name+'」'+(status.received?'。次にハンコ3個を集めた日にもらえます。':'。今日はあとハンコ'+Math.max(0,3-status.count)+'個！'):'ハロウィンのごほうびを6つ集めたよ！ 好きな飾りと服を選んでね。';
 S.gifts.forEach(function(g,i){var button=el(g.id==='hat'||g.id==='cape'?g.id:'toggle-'+g.id),owned=!!gifts.owned[g.id];button.disabled=!owned;button.setAttribute('aria-label',g.name+(owned?'（もらったよ）':'（ハンコ3個の日を'+(i+1)+'日で獲得）'));button.querySelector('.ss-earned').textContent=owned?'もらったよ':'3個の日 × '+(i+1)+'日';});
 Object.keys(nodes).forEach(function(id){var p=position(id);nodes[id].hidden=!p;if(p)place(nodes[id],p);});
 var wearing=S.appearance(snap.state,status);
 var sprite=el('character-image'),src='room/assets/character-'+wearing.asset+'.png';
 if(sprite.getAttribute('src')!==src)sprite.src=src;
 sprite.alt=wearing.name+'を着たここあ';
 el('wearing').textContent='いまは「'+wearing.name+'」';
 el('closet-progress').textContent=!status?'ごほうびの記録を確認しています。':clothes.next?'服 '+clothes.total+' / '+S.outfits.length+'着。つぎの服は、ハンコ3個の日をあと'+(clothes.next.day-clothes.days)+'日で、もらえるよ。':'服をぜんぶ集めたよ！ 季節が変わっても、好きなときに着られます。';
 S.outfits.forEach(function(o){
  var b=el('dress-'+o.id),owned=!!clothes.owned[o.id],chosen=wearing.outfit===o.id&&!wearing.hat&&!wearing.cape,preview=b.querySelector('.ss-dress-preview');
  b.disabled=!owned;b.classList.toggle('ss-locked',!owned);b.setAttribute('aria-pressed',String(chosen));
  b.setAttribute('aria-label',owned?o.name+(chosen?'（着ているよ）':'に着替える'):'ひみつの服（ハンコ3個の日を'+o.day+'日で獲得）');
  b.querySelector('.ss-dress-name').textContent=owned?o.name:'ひみつの服';
  if(owned&&!preview.querySelector('img')){preview.textContent='';var img=document.createElement('img');img.src='room/assets/character-'+o.asset+'-thumb.png';img.alt='';img.width=112;img.height=112;img.draggable=false;preview.appendChild(img);}
  if(!owned&&!preview.querySelector('.ss-mystery')){preview.textContent='';var question=document.createElement('span');question.className='ss-mystery';question.textContent='？';preview.appendChild(question);}
  b.querySelector('.ss-earned').textContent=chosen?'着ているよ':owned?'もらったよ':'あと'+(o.day-clothes.days)+'日';
 });
 ['hat','cape'].forEach(function(id){el(id).setAttribute('aria-pressed',String(wearing[id]));});
 S.decor.forEach(function(d){el('toggle-'+d.id).setAttribute('aria-pressed',String(!!position(d.id)));});
 el('undo').disabled=!snap.canUndo;
 if(selected&&!position(selected)){selected=null;el('move').hidden=true;}
}
function cancel(){if(!drag)return;var old=drag;drag=null;if(frame){cancelAnimationFrame(frame);frame=0;}if(old.node.hasPointerCapture&&old.node.hasPointerCapture(old.id))old.node.releasePointerCapture(old.id);safe(render);}
function start(e,id,node,touch){
 if(drag||e.isPrimary===false||(!touch&&e.button!==undefined&&e.button!==0))return;
 var p=touch||e,r=scene.getBoundingClientRect();safe(function(){render();select(id);var actual=bound(position(id),node);drag={id:e.pointerId,day:id,node:node,token:snap.token,x:p.clientX,y:p.clientY,offsetX:(p.clientX-r.left)/r.width*100-actual.x,offsetY:(p.clientY-r.top)/r.height*100-actual.y,point:actual,moved:false};});
 if(drag){e.preventDefault();if(node.setPointerCapture&&e.pointerId!==undefined)node.setPointerCapture(e.pointerId);}
}
function update(e,touch){if(!drag||(e.pointerId!==undefined&&e.pointerId!==drag.id))return;var p=touch||e,r=scene.getBoundingClientRect();e.preventDefault();if(Math.abs(p.clientX-drag.x)+Math.abs(p.clientY-drag.y)>3)drag.moved=true;drag.point=bound({x:(p.clientX-r.left)/r.width*100-drag.offsetX,y:(p.clientY-r.top)/r.height*100-drag.offsetY},drag.node);if(!frame)frame=requestAnimationFrame(function(){frame=0;if(drag)place(drag.node,drag.point);});}
function finish(e,touch){if(!drag||(e.pointerId!==undefined&&e.pointerId!==drag.id))return;update(e,touch);var done=drag;drag=null;if(frame){cancelAnimationFrame(frame);frame=0;}if(done.node.hasPointerCapture&&done.node.hasPointerCapture(done.id))done.node.releasePointerCapture(done.id);safe(function(){if(done.moved){var next=snap.state;if(done.day==='character')next.character=done.point;else next.decor[done.day]=done.point;store.save(next,done.token);el('note').textContent='位置を保存しました。';}render();});if(position(done.day))place(done.node,position(done.day));}
function move(dx,dy){cancel();safe(function(){render();if(!selected||!position(selected))return;var p=position(selected),next=bound({x:p.x+dx,y:p.y+dy},nodes[selected]);if(selected==='character')snap.state.character=next;else snap.state.decor[selected]=next;store.save(snap.state,snap.token);render();});}
function wire(node,id){
 nodes[id]=node;node.ondragstart=function(e){e.preventDefault();};node.onclick=function(){select(id);};
 if(window.PointerEvent){node.onpointerdown=function(e){start(e,id,node);};node.onpointermove=update;node.onpointerup=finish;node.onpointercancel=cancel;node.onlostpointercapture=function(){if(drag)cancel();};}
 else {node.addEventListener('touchstart',function(e){if(e.touches.length===1)start(e,id,node,e.touches[0]);},{passive:false});node.addEventListener('touchmove',function(e){if(e.touches.length===1)update(e,e.touches[0]);else cancel();},{passive:false});node.addEventListener('touchend',function(e){if(e.changedTouches.length)finish(e,e.changedTouches[0]);},{passive:false});node.addEventListener('touchcancel',cancel);node.onmousedown=function(e){start(e,id,node);};}
 node.onkeydown=function(e){if(e.key==='Escape'){cancel();return;}var d={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-3],ArrowDown:[0,3]}[e.key];if(d){e.preventDefault();select(id);move(d[0],d[1]);}};
}
safe(function(){
 store=S.create(window.localStorage,preview);snap=store.read();
 var character=el('character');wire(character,'character');
 S.outfits.forEach(function(o){var b=document.createElement('button');b.id='ss-dress-'+o.id;b.type='button';b.className='ss-dress';b.setAttribute('aria-pressed','false');var preview=document.createElement('div');preview.className='ss-dress-preview';preview.setAttribute('aria-hidden','true');b.appendChild(preview);var name=document.createElement('span');name.className='ss-dress-name';b.appendChild(name);var badge=document.createElement('small');badge.className='ss-earned';b.appendChild(badge);b.onclick=function(){cancel();safe(function(){render();store.save(S.dress(snap.state,o.id,window.RoomRewardStatus),snap.token);render();el('note').textContent=o.name+'に着替えました。';});};el('clothes').appendChild(b);});
 S.decor.forEach(function(d){var node=document.createElement('button');node.type='button';node.className='ss-object ss-decor ss-'+d.id;node.setAttribute('aria-label',d.name+'を動かす');var img=document.createElement('img');img.src='room/assets/halloween-'+d.id+'.png';img.alt='';img.draggable=false;node.appendChild(img);layer.appendChild(node);wire(node,d.id);
 var pick=document.createElement('button');pick.type='button';pick.id='ss-toggle-'+d.id;pick.setAttribute('aria-pressed','false');var icon=img.cloneNode();pick.appendChild(icon);pick.appendChild(document.createTextNode({pumpkin:'かぼちゃ',ghost:'おばけ',candy:'お菓子かご',stars:'月と星'}[d.id]));var badge=document.createElement('small');badge.className='ss-earned';pick.appendChild(badge);pick.setAttribute('aria-label',d.name);pick.onclick=function(){cancel();safe(function(){render();if(!gifts.owned[d.id])return;if(snap.state.decor[d.id])delete snap.state.decor[d.id];else snap.state.decor[d.id]={x:d.x,y:d.y};store.save(snap.state,snap.token);render();});};el('decor').appendChild(pick);});
 ['hat','cape'].forEach(function(id){var badge=document.createElement('small');badge.className='ss-earned';el(id).appendChild(badge);el(id).onclick=function(){cancel();safe(function(){render();if(!gifts.owned[id])return;snap.state.outfit='green-knit';snap.state[id]=!snap.state[id];store.save(snap.state,snap.token);render();});};});
 el('original').onclick=function(){cancel();safe(function(){render();store.save(S.dress(snap.state,'green-knit',window.RoomRewardStatus),snap.token);render();});};
 el('reset').onclick=function(){cancel();safe(function(){render();snap.state.character=S.initial().character;S.decor.forEach(function(d){if(snap.state.decor[d.id])snap.state.decor[d.id]={x:d.x,y:d.y};});store.save(snap.state,snap.token);render();});};
 el('undo').onclick=function(){cancel();safe(function(){store.undo();render();});};
 [['left',-3,0],['right',3,0],['up',0,-3],['down',0,3]].forEach(function(d){el(d[0]).onclick=function(){move(d[1],d[2]);};});
 el('export').onclick=function(){safe(function(){var url=URL.createObjectURL(new Blob([store.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='room-season.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);});};
 el('import').onchange=function(){var input=this,file=input.files[0];if(!file)return;if(file.size>16384){el('error').textContent='ファイルが大きすぎます';input.value='';return;}var reader=new FileReader();reader.onload=function(){cancel();safe(function(){store.restore(reader.result);render();});input.value='';};reader.onerror=function(){el('error').textContent='ファイルを読み取れません';input.value='';};reader.readAsText(file);};
 window.addEventListener('room-rewards-change',function(){cancel();safe(render);});
 window.addEventListener('storage',function(e){if(e.key===null||e.key===(preview?S.previewKey:S.key)){cancel();safe(render);}});
 window.addEventListener('resize',function(){cancel();safe(render);});window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',function(){if(document.hidden)cancel();});
 if(!window.PointerEvent){window.addEventListener('mousemove',update);window.addEventListener('mouseup',finish);}
 panel.hidden=false;render();
});
})();
