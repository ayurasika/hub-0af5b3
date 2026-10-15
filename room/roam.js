(function(root){
'use strict';
function copy(p){return {x:p.x,y:p.y};}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function floorBounds(size){
 var halfW=size.characterWidth/size.width*50,halfH=size.characterHeight/size.height*50;
 var left=Math.min(50,Math.max(18,halfW+2)),right=Math.max(50,Math.min(82,98-halfW));
 var top=Math.min(78,Math.max(67,halfH+2)),bottom=Math.max(top,Math.min(78,97-halfH));
 return {left:left,right:right,top:top,bottom:bottom};
}
function onFloor(p,b){return {x:clamp(p.x,b.left,b.right),y:clamp(p.y,b.top,b.bottom)};}
function target(p,b,random){
 var x=b.left+random()*(b.right-b.left);
 if(Math.abs(x-p.x)<14)x=p.x<(b.left+b.right)/2?b.right:b.left;
 return {x:x,y:b.top+random()*(b.bottom-b.top)};
}
function create(options){
 var win=options.win,doc=options.doc,node=options.node,scene=options.scene,facing=options.facing;
 var random=options.random||Math.random,clock=options.clock||function(){return win.performance&&win.performance.now?win.performance.now():Date.now();};
 var current=copy(options.anchor),anchorKey='',phase=null,timer=0,frame=0,holds={},enabled=false,focused=true,destroyed=false,observer=null;
 var motion=win.matchMedia?win.matchMedia('(prefers-reduced-motion: reduce)'):null;
 function size(){var r=scene.getBoundingClientRect();return {width:r.width,height:r.height,characterWidth:node.offsetWidth,characterHeight:node.offsetHeight};}
 function visible(){var r=scene.getBoundingClientRect();return !doc.hidden&&focused&&r.width>0&&r.height>0&&r.bottom>0&&r.top<win.innerHeight&&r.right>0&&r.left<win.innerWidth;}
 function allowed(){return enabled&&Object.keys(holds).length===0&&!destroyed&&visible();}
 function position(){if(!phase)return copy(current);var t=clamp((clock()-phase.start)/phase.duration,0,1);return {x:phase.from.x+(phase.to.x-phase.from.x)*t,y:phase.from.y+(phase.to.y-phase.from.y)*t};}
 function paint(){node.style.transition='none';node.style.transform='translate(-50%,-50%)';node.style.left=current.x+'%';node.style.top=current.y+'%';}
 function freeze(){
  current=position();phase=null;
  if(timer){win.clearTimeout(timer);timer=0;}if(frame){win.cancelAnimationFrame(frame);frame=0;}
  node.classList.remove('ss-walking');paint();
 }
 function schedule(delay){if(!allowed()||phase||timer||frame)return;timer=win.setTimeout(function(){timer=0;begin();},delay);}
 function begin(){
  if(!allowed())return;
  var dimensions=size(),bounds=floorBounds(dimensions);current=onFloor(current,bounds);paint();
  var next=target(current,bounds,random),dx=(next.x-current.x)*dimensions.width/100,dy=(next.y-current.y)*dimensions.height/100;
  var duration=clamp(Math.sqrt(dx*dx+dy*dy)/(dimensions.width*0.045)*1000,2800,14000);
  facing.style.transform=dx<0?'scaleX(-1)':'scaleX(1)';
  // One compositor transition per journey; there is no JavaScript frame loop or storage write.
  node.getBoundingClientRect();
  frame=win.requestAnimationFrame(function(){
   frame=0;if(!allowed())return;
   phase={from:copy(current),to:next,start:clock(),duration:duration};
   node.classList.add('ss-walking');node.style.transition='transform '+duration+'ms linear';
   node.style.transform='translate(-50%,-50%) translate3d('+dx+'px,'+dy+'px,0)';
   timer=win.setTimeout(function(){timer=0;current=copy(next);phase=null;node.classList.remove('ss-walking');paint();schedule(2200+random()*2600);},duration);
  });
 }
 function environment(){if(!allowed())freeze();else schedule(1200);}
 function blur(){focused=false;freeze();}
 function focus(){focused=true;environment();}
 function resize(){freeze();environment();}
 function reduced(e){if(e.matches)setEnabled(false);}
 function setEnabled(value){enabled=!!value;freeze();if(options.onState)options.onState(enabled);environment();}
 function setAnchor(p,force){var key=p.x+':'+p.y;if(anchorKey===key&&!force)return;anchorKey=key;freeze();current=copy(p);paint();environment();}
 win.addEventListener('scroll',environment,{passive:true});win.addEventListener('resize',resize);win.addEventListener('blur',blur);win.addEventListener('focus',focus);
 win.addEventListener('pagehide',blur);win.addEventListener('pageshow',focus);doc.addEventListener('visibilitychange',environment);
 if(win.IntersectionObserver){observer=new win.IntersectionObserver(environment);observer.observe(scene);}
 if(motion){if(motion.addEventListener)motion.addEventListener('change',reduced);else if(motion.addListener)motion.addListener(reduced);}
 setAnchor(options.anchor);setEnabled(options.enabled!==false&&!(motion&&motion.matches));
 return {position:position,setAnchor:setAnchor,setEnabled:setEnabled,isEnabled:function(){return enabled;},hold:function(reason){holds[reason||'interaction']=true;freeze();return position();},release:function(reason){delete holds[reason||'interaction'];schedule(2500);},destroy:function(){
  destroyed=true;freeze();if(observer)observer.disconnect();
  win.removeEventListener('scroll',environment);win.removeEventListener('resize',resize);win.removeEventListener('blur',blur);win.removeEventListener('focus',focus);win.removeEventListener('pagehide',blur);win.removeEventListener('pageshow',focus);doc.removeEventListener('visibilitychange',environment);
  if(motion){if(motion.removeEventListener)motion.removeEventListener('change',reduced);else if(motion.removeListener)motion.removeListener(reduced);}
 }};
}
var api={floorBounds:floorBounds,onFloor:onFloor,target:target,create:create};
if(typeof module==='object'&&module.exports)module.exports=api;else root.RoomRoam=api;
})(this);
