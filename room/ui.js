(function(){
'use strict';
var R=RoomIntegration,L=RoomLayout,device,last='',selected=null,selectionToken='',state;
var names={'calm-books':'本','calm-plant':'観葉植物','calm-lamp':'ランプ','calm-clock':'時計','calm-pencils':'ペンスタンド','calm-box':'小物入れ'};
function el(x){return document.getElementById('sr-'+x);}
function safe(fn){try{fn();el('error').textContent='';}catch(e){el('error').textContent=e.message;}}
function slot(id){return L.slots.filter(function(s){return s.id===id;})[0];}
function label(day){return names[state.ledger.rewards[day].item]+'（'+day+'）';}
function showSelection(){
 el('places').hidden=!selected;
 el('cancel').hidden=!selected;
 el('undo').disabled=!state.canUndo;
 el('arrange-note').textContent=selected?label(selected)+'を選択中。置き場所を選んでください。使用中なら入れ替えます。':'小物を選ぶと置き場所を変えられます。棚・机・床から選べます。';
 var buttons=el('choices').querySelectorAll('button');
 for(var i=0;i<buttons.length;i++)buttons[i].setAttribute('aria-pressed',buttons[i].getAttribute('data-day')===selected?'true':'false');
 var images=el('furniture').querySelectorAll('img');
 for(var j=0;j<images.length;j++)images[j].className='sr-item'+(images[j].getAttribute('data-day')===selected?' sr-selected':'');
}
function choose(day){
 selected=selected===day?null:day;selectionToken=state.layoutToken;
 drawPlaces();showSelection();
}
function drawPlaces(){
 el('places').innerHTML='';
 L.slots.forEach(function(s,i){
  var occupied=null;Object.keys(state.layout).forEach(function(d){if(state.layout[d]===s.id)occupied=d;});
  var b=document.createElement('button');b.type='button';
  b.textContent=(i+1)+' '+s.name+(occupied?'・'+names[state.ledger.rewards[occupied].item]:'・空き');
  b.disabled=occupied===selected;
  b.onclick=function(){safe(function(){
   var focusedDay=selected;device.move(selected,s.id,selectionToken);selected=null;render();
   el('arrange-note').textContent=s.name+'に置きました。「ひとつ戻す」で戻せます。';
   var nodes=el('choices').querySelectorAll('button');
   for(var n=0;n<nodes.length;n++)if(nodes[n].getAttribute('data-day')===focusedDay)nodes[n].focus();
  });};
  el('places').appendChild(b);
 });
}
function render(){
 state=device.refresh();var days=L.active(state.ledger.rewards),cfg=state.ledger.config;
 el('start').hidden=!!cfg;
 el('progress').textContent='今日の判子 '+state.count+'個 ／ あつめた小物 '+Object.keys(state.ledger.rewards).length+'個';
 el('message').textContent=!cfg?'今日から開始すると、今日の判子を含めて3個以上の日に小物が1つ増えます。昨日以前は対象外です。':state.ledger.rewards[state.day]?'今日の小物を受け取りました。1日1つずつ増えます。':'開始日 '+cfg.startDate+' ／ あと'+Math.max(0,3-state.count)+'個で小物がひとつ。';
 if(selected&&(days.indexOf(selected)<0||selectionToken!==state.layoutToken)){selected=null;el('arrange-note').textContent='小物や配置が更新されました。選び直してください。';}
 el('arrange').hidden=days.length===0;
 var signature=JSON.stringify({rewards:state.ledger.rewards,layout:state.layout});
 if(last!==signature){
  last=signature;el('furniture').innerHTML='';el('choices').innerHTML='';
  days.forEach(function(d){
   var item=state.ledger.rewards[d].item,s=slot(state.layout[d]),img=document.createElement('img');
   img.src='room/assets/'+item+'.png';img.alt=label(d)+' '+s.name;img.className='sr-item';img.setAttribute('data-day',d);
   img.style.left=s.x+'%';img.style.bottom=(100-s.y)+'%';el('furniture').appendChild(img);
   var b=document.createElement('button');b.type='button';b.setAttribute('data-day',d);b.setAttribute('aria-pressed','false');
   var icon=document.createElement('img');icon.src=img.src;icon.alt='';b.appendChild(icon);
   var text=document.createElement('span');text.textContent=names[item]+' ／ '+s.name;b.appendChild(text);
   b.setAttribute('aria-label',label(d)+'、現在 '+s.name);b.onclick=function(){choose(d);};el('choices').appendChild(b);
  });
  drawPlaces();
 }
 showSelection();
}
safe(function(){
 device=RoomDevice.create(R,window.localStorage,window.location,function(){return Date.now();});
 el('start').onclick=function(){safe(function(){device.begin(R.day(Date.now()));render();});};
 el('cancel').onclick=function(){selected=null;showSelection();};
 el('undo').onclick=function(){safe(function(){device.undo();selected=null;render();el('arrange-note').textContent='ひとつ前の配置に戻しました。';});};
 el('export').onclick=function(){safe(function(){
  var blob=new Blob([device.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='study-room-furniture-'+R.day(Date.now())+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},60000);
 });};
 el('import').onchange=function(){
  var input=this,f=input.files[0];if(!f)return;
  if(f.size>1048576){el('error').textContent='ファイルが大きすぎます';input.value='';return;}
  var reader=new FileReader();
  reader.onload=function(){safe(function(){device.restore(reader.result);selected=null;render();});input.value='';};
  reader.onerror=function(){el('error').textContent='ファイルを読み取れません';input.value='';};reader.readAsText(f);
 };
 R.watch(window,document,function(){safe(render);});
 setInterval(function(){if(!document.hidden)safe(render);},3000);
 render();
});
})();
