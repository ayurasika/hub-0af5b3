(function(){
'use strict';
var host=document.getElementById('study-room');if(!host)return;
var scene=host.querySelector('.sr-scene'),canvas=document.getElementById('sp-canvas'),ctx=canvas.getContext('2d');
var P=RoomPets,A=RoomPetActions,ids=['daifuku','little-man'],names={'daifuku':'大福','little-man':'ちっこいおっさん'};
var preview=host.getAttribute('data-room-preview')==='true',store,snap,failed=false,frame=0,last=null,paused=false,visible=true,blurred=false,arranging=false;
var media=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
var size={width:0,height:0},pets={'daifuku':{ready:false,stop:0,elapsed:null},'little-man':{ready:false,stop:2,elapsed:null}};
var man=new Image(),assetErrors={};
function el(id){return document.getElementById('sp-'+id);}
function error(message){el('error').textContent=message||'';}
function owns(id){return !!P.collection(window.RoomRewardStatus).owned[id];}
function reduced(){return !!media.matches||!!(snap&&snap.state.quiet);}
function hasAction(){return ids.some(function(id){return pets[id].elapsed!==null&&snap&&snap.state.visible[id]&&pets[id].ready&&owns(id);});}
function active(){return !failed&&hasAction()&&!paused&&!reduced()&&visible&&!blurred&&!arranging&&!document.hidden;}
function clearActions(){ids.forEach(function(id){pets[id].elapsed=null;});paused=false;}
function cancelLockedActions(){var changed=false;ids.forEach(function(id){if(!owns(id)&&pets[id].elapsed!==null){pets[id].elapsed=null;changed=true;}});if(!hasAction())paused=false;return changed;}
function read(){try{snap=store.read();failed=false;return true;}catch(e){failed=true;clearActions();error(e.message);return false;}}
function controls(){
 var collection=P.collection(window.RoomRewardStatus),status=window.RoomRewardStatus;
 el('progress').textContent=!status?'ごほうびの記録を確認できません。部屋のエラー表示を確認してください。':status.started!==true?'部屋をはじめると、ペットのごほうびも集められます。':collection.next?'おへやのなかま '+collection.total+' / 2。つぎは、スタンプ3個以上の日をあと'+(collection.next.day-collection.days)+'日。':'おへやのなかまがふたりになったよ！ 好きな子を呼んでね。';
 ids.forEach(function(id){var earned=!!collection.owned[id],gift=P.gifts.filter(function(g){return g.id===id;})[0],remaining=Math.max(0,gift.day-collection.days),selected=!!(earned&&snap&&snap.state.visible[id]),p=pets[id],show=el('show-'+id),action=el('action-'+id);
  show.disabled=failed||!earned;show.setAttribute('aria-pressed',String(selected));show.textContent=!earned?'あと'+remaining+'日':selected?'おへやから隠す':'おへやに呼ぶ';show.setAttribute('aria-label',names[id]+(!earned?'（スタンプ3個以上の日をあと'+remaining+'日で獲得）':selected?'を非表示にする':'をおへやに呼ぶ'));
  el('earned-'+id).textContent=earned?gift.day+'日目にもらったよ':gift.day+'日目のごほうび';
  action.disabled=failed||!selected||!p.ready||reduced()||paused||p.elapsed!==null;
  el('hit-'+id).disabled=action.disabled;
 });
 el('quiet').checked=reduced();el('quiet').disabled=failed||media.matches;
 el('pause').disabled=failed||!hasAction()||reduced();el('pause').textContent=paused?'動きをつづける':'動きをとめる';
 el('undo').disabled=failed||!snap||!snap.canUndo;el('export').disabled=failed;el('import').disabled=failed;
 el('note').textContent=media.matches?'端末の「動きを減らす」設定に合わせて、静かにひと休み。':reduced()?'静かにひと休み。「動きをひかえめに」を外すと、タップで動きます。':paused?'ひと休み中。「動きをつづける」で、つづきから。':hasAction()?'ちょっとおさんぽ。終わったら、またひと休み。':'普段は静かにひと休み。部屋の子か「ぱたぱたして」「ぴょーんして」をタップしてね。';
 var errors=Object.keys(assetErrors).map(function(id){return names[id]+'の画像を読み込めませんでした。';});
 if(errors.length&&!failed)error(errors.join(' '));
}
function pose(id){return A.sample(id,pets[id].stop,pets[id].elapsed,size.width,size.height);}
function shadow(x,y,r,opacity){ctx.save();ctx.fillStyle='rgba(65,49,29,'+opacity+')';ctx.beginPath();ctx.ellipse(x,y,r,r*.18,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function draw(){
 if(!size.width||!size.height)return;ctx.clearRect(0,0,size.width,size.height);
 ids.forEach(function(id){var p=pets[id],hit=el('hit-'+id),shown=!failed&&snap&&snap.state.visible[id]&&p.ready&&owns(id);hit.hidden=!shown;
  if(!shown)return;var v=pose(id),width,height;
  if(id==='daifuku'){shadow(v.x,size.height*.72,v.size*.20,.10);Daifuku.draw(ctx,{x:v.x,y:v.y,size:v.size,time:reduced()?0:v.time,flight:reduced()?0:v.flight,heading:v.heading});width=Math.max(44,v.size*.36);height=Math.max(44,v.size*.58);}
  else{var w=v.size,h=w*man.naturalHeight/man.naturalWidth;shadow(v.x,v.groundY-v.size*.13,v.size*.30,.16);ctx.save();ctx.translate(v.x,v.y);ctx.rotate(v.rotation||0);ctx.scale(v.scaleX,v.scaleY);ctx.drawImage(man,-w/2,-h/2,w,h);ctx.restore();width=Math.max(44,w);height=Math.max(44,h);}
  width=Math.min(size.width,width);height=Math.min(size.height,height);
  hit.style.width=width+'px';hit.style.height=height+'px';hit.style.left=Math.max(width/2,Math.min(size.width-width/2,v.x))+'px';hit.style.top=Math.max(height/2,Math.min(size.height-height/2,v.y))+'px';
  hit.dataset.phase=p.elapsed===null?'rest':v.phase;hit.dataset.x=v.x.toFixed(2);hit.dataset.y=v.y.toFixed(2);hit.dataset.elapsed=p.elapsed===null?'':p.elapsed.toFixed(4);
 });
 canvas.dataset.running=String(active());canvas.dataset.paused=String(paused);canvas.dataset.reduced=String(reduced());
}
function tick(now){
 frame=0;if(cancelLockedActions())controls();if(!active()){last=null;draw();return;}
 var dt=last===null?0:Math.min(Math.max((now-last)/1000,0),.05);last=now;var completed=false;
 ids.forEach(function(id){var p=pets[id];if(p.elapsed===null||!snap.state.visible[id]||!p.ready||!owns(id))return;p.elapsed+=dt;if(p.elapsed>=A.duration(id)){p.stop=(p.stop+1)%4;p.elapsed=null;completed=true;}});
 if(completed)controls();draw();if(active())frame=requestAnimationFrame(tick);else last=null;
}
function sync(){if(frame)cancelAnimationFrame(frame);frame=0;last=null;cancelLockedActions();controls();draw();if(active())frame=requestAnimationFrame(tick);}
function resize(){var r=scene.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);size={width:r.width,height:r.height};canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
function change(mutator){
 if(failed)return;try{if(!read()){sync();return;}var next=JSON.parse(JSON.stringify(snap.state));mutator(next);snap=store.save(next,snap.token);error('');ids.forEach(function(id){if(!snap.state.visible[id])pets[id].elapsed=null;});if(reduced())clearActions();}
 catch(e){error(e.message);}sync();
}
function act(id){
 if(!read()){sync();return;}var p=pets[id];if(!owns(id)||!snap.state.visible[id]||!p.ready||p.elapsed!==null||reduced()||paused)return;
 p.elapsed=0;paused=false;sync();
}
try{store=P.create(window.localStorage,preview);read();}catch(e){failed=true;error(e.message);}
ids.forEach(function(id){el('show-'+id).addEventListener('click',function(){if(!owns(id)){sync();return;}change(function(next){next.visible[id]=!next.visible[id];});});el('action-'+id).addEventListener('click',function(){if(!owns(id)){sync();return;}scene.scrollIntoView({block:'start',behavior:'auto'});act(id);});el('hit-'+id).addEventListener('click',function(){act(id);});});
el('quiet').addEventListener('change',function(){var checked=this.checked;change(function(next){next.quiet=checked;});});
el('pause').addEventListener('click',function(){paused=!paused;sync();});
el('undo').addEventListener('click',function(){try{snap=store.undo();clearActions();error('');}catch(e){error(e.message);}sync();});
el('export').addEventListener('click',function(){try{var raw=store.exportJSON(),url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='room-pets.json';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);error('');}catch(e){error(e.message);}});
el('import').addEventListener('change',function(){var input=this,file=input.files[0];if(!file)return;if(file.size>16384){error('ファイルが大きすぎます');input.value='';return;}var token=snap&&snap.token,reader=new FileReader();reader.onload=function(){try{if(store.read().token!==token)throw Error('読み込み中に別の画面で設定が変わりました。もう一度選んでください');snap=store.restore(reader.result);clearActions();error('');}catch(e){error(e.message);}input.value='';sync();};reader.onerror=function(){error('ファイルを読み取れません');input.value='';};reader.readAsText(file);});
function mediaChange(){if(reduced())clearActions();sync();}
if(media.addEventListener)media.addEventListener('change',mediaChange);else if(media.addListener)media.addListener(mediaChange);
document.addEventListener('visibilitychange',sync);
window.addEventListener('blur',function(){blurred=true;sync();});window.addEventListener('focus',function(){blurred=false;sync();});
window.addEventListener('pagehide',function(){if(frame)cancelAnimationFrame(frame);frame=0;last=null;});window.addEventListener('pageshow',sync);
window.addEventListener('room-rewards-change',sync);
window.addEventListener('storage',function(e){if(e.key===null||e.key===(preview?P.previewKey:P.key)){read();clearActions();sync();}});
// A pet never captures a furniture drag. Pause while any room object is being arranged.
host.addEventListener('pointerdown',function(e){if(e.target.closest&&e.target.closest('.ss-object,.sr-drag')){arranging=true;sync();}},true);
window.addEventListener('pointerup',function(){if(arranging){arranging=false;sync();}});window.addEventListener('pointercancel',function(){arranging=false;sync();});
if(window.ResizeObserver)new ResizeObserver(resize).observe(scene);else window.addEventListener('resize',resize);
if(window.IntersectionObserver)new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(scene);
man.onload=function(){pets['little-man'].ready=true;delete assetErrors['little-man'];resize();sync();};man.onerror=function(){assetErrors['little-man']=true;sync();};man.src='room/assets/pet-little-man.png';
Daifuku.load('assets/coordinator-budgie-atlas-v2.png').then(function(ok){pets.daifuku.ready=ok;if(ok){var portrait=el('daifuku-portrait'),c=portrait.getContext('2d');c.setTransform(2,0,0,2,0,0);Daifuku.draw(c,{x:48,y:48,size:140,time:0,flight:0,heading:1});delete assetErrors.daifuku;}else assetErrors.daifuku=true;sync();});
resize();sync();
})();
