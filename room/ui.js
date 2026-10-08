(function(){
'use strict';
var R=RoomIntegration,L=RoomLayout,device,last='',selected=null,state,drag=null,frame=0;
var names={'calm-books':'本','calm-plant':'観葉植物','calm-lamp':'ランプ','calm-clock':'時計','calm-pencils':'ペンスタンド','calm-box':'小物入れ'};
function el(x){return document.getElementById('sr-'+x);}
function safe(fn){try{fn();el('error').textContent='';}catch(e){el('error').textContent=e.message;}}
function scene(){return el('furniture').parentNode;}
function label(day){return names[state.ledger.rewards[day].item]+'（'+day+'）';}
function bounded(point,node){
 var r=scene().getBoundingClientRect(),w=node.offsetWidth/r.width*50,h=node.offsetHeight/r.height*50;
 return {x:Math.max(w,Math.min(100-w,point.x)),y:Math.max(h,Math.min(100-h,point.y))};
}
function place(node,point){var p=bounded(point,node);node.style.left=p.x+'%';node.style.top=p.y+'%';}
function showSelection(){
 el('undo').disabled=!state.canUndo;
 var buttons=el('choices').querySelectorAll('button');
 for(var i=0;i<buttons.length;i++)buttons[i].setAttribute('aria-pressed',buttons[i].getAttribute('data-day')===selected?'true':'false');
 var nodes=el('furniture').querySelectorAll('.sr-drag');
 for(var j=0;j<nodes.length;j++){var chosen=nodes[j].getAttribute('data-day')===selected;nodes[j].className='sr-drag'+(chosen?' sr-selected':'');nodes[j].style.zIndex=chosen?'2':'1';}
}
function cancelDrag(){
 if(!drag)return;
 var previous=drag;drag=null;
 if(frame){cancelAnimationFrame(frame);frame=0;}
 if(previous.node.hasPointerCapture(previous.id))previous.node.releasePointerCapture(previous.id);
 if(state.layout[previous.day])place(previous.node,state.layout[previous.day]);
}
function choose(day){selected=selected===day?null:day;showSelection();}
function beginDrag(e,day,node){
 if(e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0)||drag)return;
 e.preventDefault();selected=day;showSelection();
 var r=scene().getBoundingClientRect(),actual=bounded(state.layout[day],node);
 drag={id:e.pointerId,day:day,node:node,token:state.layoutToken,startX:e.clientX,startY:e.clientY,offsetX:(e.clientX-r.left)/r.width*100-actual.x,offsetY:(e.clientY-r.top)/r.height*100-actual.y,point:actual,moved:false};
 node.setPointerCapture(e.pointerId);
}
function updateDrag(e){
 if(!drag||e.pointerId!==drag.id)return;
 var r=scene().getBoundingClientRect();
 if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>3)drag.moved=true;
 drag.point=bounded({x:(e.clientX-r.left)/r.width*100-drag.offsetX,y:(e.clientY-r.top)/r.height*100-drag.offsetY},drag.node);
 if(!frame)frame=requestAnimationFrame(function(){frame=0;if(drag)place(drag.node,drag.point);});
}
function finishDrag(e){
 if(!drag||e.pointerId!==drag.id)return;
 updateDrag(e);var done=drag;drag=null;
 if(frame){cancelAnimationFrame(frame);frame=0;}
 if(done.node.hasPointerCapture(done.id))done.node.releasePointerCapture(done.id);
 if(done.moved){
  safe(function(){device.move(done.day,done.point,done.token);render();el('arrange-note').textContent='配置を保存しました。「ひとつ戻す」で戻せます。';});
 }
 if(state.layout[done.day])place(done.node,state.layout[done.day]);
}
function render(){
 if(drag)return;
 state=device.refresh();var days=L.active(state.ledger.rewards),cfg=state.ledger.config;
 el('start').hidden=!!cfg;
 el('progress').textContent='今日の判子 '+state.count+'個 ／ あつめた小物 '+Object.keys(state.ledger.rewards).length+'個';
 el('message').textContent=!cfg?'今日から開始すると、今日の判子を含めて3個以上の日に小物が1つ増えます。昨日以前は対象外です。':state.ledger.rewards[state.day]?'今日の小物を受け取りました。1日1つずつ増えます。':'開始日 '+cfg.startDate+' ／ あと'+Math.max(0,3-state.count)+'個で小物がひとつ。';
 if(selected&&days.indexOf(selected)<0)selected=null;
 el('arrange').hidden=days.length===0;
 var signature=JSON.stringify({rewards:state.ledger.rewards,layout:state.layout});
 if(last!==signature){
  last=signature;el('furniture').innerHTML='';el('choices').innerHTML='';
  days.forEach(function(d){
   var item=state.ledger.rewards[d].item,b=document.createElement('button'),img=document.createElement('img');
   b.type='button';b.className='sr-drag';b.setAttribute('data-day',d);b.setAttribute('aria-label',label(d)+'。ドラッグで移動、矢印キーでも動かせます');
   img.src='room/assets/'+item+'.png';img.alt='';img.draggable=false;b.appendChild(img);el('furniture').appendChild(b);place(b,state.layout[d]);
   b.onpointerdown=function(e){beginDrag(e,d,b);};b.onpointermove=updateDrag;b.onpointerup=finishDrag;
   b.onpointercancel=cancelDrag;b.onlostpointercapture=function(){if(drag&&drag.node===b)cancelDrag();};
   b.ondragstart=function(e){e.preventDefault();};
   b.onkeydown=function(e){
    if(e.key==='Escape'){cancelDrag();selected=null;showSelection();return;}
    var delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;
    e.preventDefault();safe(function(){var p=state.layout[d],step=e.shiftKey?1:3;device.move(d,bounded({x:p.x+delta[0]*step,y:p.y+delta[1]*step},b),state.layoutToken);render();var nodes=el('furniture').querySelectorAll('button');for(var n=0;n<nodes.length;n++)if(nodes[n].getAttribute('data-day')===d)nodes[n].focus();});
   };
   var pick=document.createElement('button');pick.type='button';pick.setAttribute('data-day',d);pick.setAttribute('aria-pressed','false');
   var icon=document.createElement('img');icon.src=img.src;icon.alt='';pick.appendChild(icon);
   var text=document.createElement('span');text.textContent=names[item];pick.appendChild(text);
   pick.setAttribute('aria-label',label(d)+'を手前に表示');pick.onclick=function(){choose(d);};el('choices').appendChild(pick);
  });
 }
 var nodes=el('furniture').querySelectorAll('button');for(var i=0;i<nodes.length;i++)place(nodes[i],state.layout[nodes[i].getAttribute('data-day')]);
 showSelection();
}
safe(function(){
 device=RoomDevice.create(R,window.localStorage,window.location,function(){return Date.now();});
 el('start').onclick=function(){safe(function(){device.begin(R.day(Date.now()));render();});};
 el('undo').onclick=function(){cancelDrag();safe(function(){device.undo();render();el('arrange-note').textContent='ひとつ前の配置に戻しました。';});};
 el('reset').onclick=function(){cancelDrag();safe(function(){device.reset();render();el('arrange-note').textContent='元の配置に戻しました。「ひとつ戻す」で取り消せます。';});};
 el('export').onclick=function(){safe(function(){var blob=new Blob([device.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='study-room-furniture-'+R.day(Date.now())+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},60000);});};
 el('import').onchange=function(){
  var input=this,f=input.files[0];if(!f)return;if(f.size>1048576){el('error').textContent='ファイルが大きすぎます';input.value='';return;}
  var reader=new FileReader();reader.onload=function(){cancelDrag();safe(function(){device.restore(reader.result);render();});input.value='';};reader.onerror=function(){el('error').textContent='ファイルを読み取れません';input.value='';};reader.readAsText(f);
 };
 window.addEventListener('resize',function(){cancelDrag();safe(render);});
 window.addEventListener('blur',cancelDrag);
 document.addEventListener('visibilitychange',function(){if(document.hidden)cancelDrag();});
 R.watch(window,document,function(){safe(render);});setInterval(function(){if(!document.hidden)safe(render);},3000);render();
});
})();
