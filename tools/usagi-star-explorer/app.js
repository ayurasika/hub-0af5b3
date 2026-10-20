(()=>{'use strict';
const M=SkyMath,$=id=>document.getElementById(id),stars=M.makeStars().map(s=>s.focus?{...s,ra:90,dec:70}:s);
const state={hours:0,latitude:35,direction:0,trail:false,playing:false,polar:false,stage:0};
const names={0:'北',90:'東',180:'南',270:'西'};
const messages={0:'北の空：天の北極を中心に反時計回り。北極星はそのすぐ近くにあります。',90:'東の空：昇る星は右上へ。北緯35°では、右側が南です。',180:'南の空：東（左）から西（右）へ。赤道上では天頂を通る星もあります。',270:'西の空：沈む星は右下へ。北緯35°では、右側が北です。'};
function surface(id){const c=$(id),r=c.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return {x,w:r.width,h:r.height};}
function label(c,t,x,y,color='#e4eff4',align='left',size=12){c.font=`600 ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(t,x,y);}
function line(c,points,color,width=1,dash=[]){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function dot(c,p,r,color){c.beginPath();c.arc(...p,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function drawSpace(){
 const {x:c,w,h}=surface('space');c.fillStyle='#0b1c2d';c.fillRect(0,0,w,h);
 const f=M.frame(state.latitude,state.hours),p=M.scale(f.up,.82),R=1.4;
 const eye=state.polar?[.2,-.35,8]:[4,-6,3.3],forward=M.unit(eye),right=M.unit(M.cross([0,0,1],forward)),up=M.cross(forward,right);
 // Camera orientation AND framing stay fixed while time/latitude changes.
 const scale=Math.min(w/5.7,h/4.8),center=[0,0,0];
 const project=v=>{const q=M.add(v,M.scale(center,-1));return [w*.49+M.dot(q,right)*scale,h*.54-M.dot(q,up)*scale];};
 const path=(pts,col,width=1,dash=[])=>line(c,pts.map(project),col,width,dash);
 const earth=project([0,0,0]);const grad=c.createRadialGradient(earth[0]-scale*.3,earth[1]-scale*.3,0,...earth,scale*.82);grad.addColorStop(0,'#285b80cc');grad.addColorStop(1,'#153a55aa');c.fillStyle=grad;c.beginPath();c.arc(...earth,scale*.82,0,Math.PI*2);c.fill();
 for(const lat of [-60,-30,0,30,60]){const pts=[];for(let a=0;a<=360;a+=5)pts.push(M.scale(M.starVector(a,lat),.82));path(pts,lat===0?'#749cba':'#416580',lat===0?1.5:1);}
 for(let lon=0;lon<360;lon+=45){const pts=[];for(let lat=-90;lat<=90;lat+=3)pts.push(M.scale(M.starVector(lon+state.hours*15,lat),.82));path(pts,'#62859b80');}
 path([[0,0,-1.12],[0,0,1.25]],'#ffdb7f',2);if($('advanced').open)label(c,'地軸',...M.add(project([0,0,1.25]),[8,-5]),'#ffdb7f');
 // Rotating equatorial arrow, viewed from a fixed camera. Positive longitude is eastward.
 const spin=[];for(let a=0;a<=100;a+=5)spin.push(M.scale(M.starVector(a+state.hours*15,0),1.02));path(spin,'#ffb1ca',3);
 const end=project(spin.at(-1)),prev=project(spin.at(-2)),a=Math.atan2(end[1]-prev[1],end[0]-prev[0]);line(c,[[end[0]-9*Math.cos(a-.5),end[1]-9*Math.sin(a-.5)],end,[end[0]-9*Math.cos(a+.5),end[1]-9*Math.sin(a+.5)]],'#ffb1ca',2);
 // Local horizon is tangent to the earth at the observer, not a global equatorial plane.
 const horizon=[];for(let az=0;az<=360;az+=5)horizon.push(M.add(p,M.scale(M.add(M.scale(f.north,Math.cos(az*M.D)),M.scale(f.east,Math.sin(az*M.D))),R)));
 c.beginPath();horizon.map(project).forEach((q,i)=>i?c.lineTo(...q):c.moveTo(...q));c.closePath();c.fillStyle='#80ddc51a';c.fill();path(horizon,'#80ddc5',1.5);
 if($('advanced').open)for(const az of [0,90]){const pts=[];for(let alt=0;alt<=180;alt+=5){const horizontal=M.add(M.scale(f.north,Math.cos(az*M.D)),M.scale(f.east,Math.sin(az*M.D)));pts.push(M.add(p,M.scale(M.add(M.scale(horizontal,Math.cos(alt*M.D)),M.scale(f.up,Math.sin(alt*M.D))),R)));}path(pts,'#61819865',1,[3,4]);}
 for(const az of [0,90,180,270]){if(!$('advanced').open&&az!==state.direction)continue;const v=M.add(M.scale(f.north,Math.cos(az*M.D)),M.scale(f.east,Math.sin(az*M.D)));const q=project(M.add(p,M.scale(v,R+.15)));label(c,names[az],...q,'#80ddc5','center',15);}
 // Fixed background direction markers, independent of observer/time. These are
 // not nearby physical positions: ground coordinates still use unit directions.
 // Do not join observer to a marker (that would imply false stellar parallax).
 stars.forEach((s,i)=>{if(i%3!==0&&!s.polaris&&!s.focus&&!$('advanced').open)return;const v=M.starVector(s.ra,s.dec),q=project(M.scale(v,1.9));if(!s.focus&&!s.polaris&&Math.hypot(q[0]-earth[0],q[1]-earth[1])<scale)return;dot(c,q,s.polaris?5:s.focus?6:1.3,s.polaris?'#ffdb7f':s.focus?'#8ce8ff':'#8294a6');if(s.polaris||s.focus){if(s.focus||$('advanced').open)path([p,M.add(p,M.scale(v,.65))],s.polaris?'#ffdb7f99':'#8ce8ff88',1,[4,4]);label(c,s.polaris?'北極星':'目印の星',q[0]+8,q[1]-9,s.polaris?'#ffdb7f':'#8ce8ff');}});
 const look=M.add(M.scale(f.north,Math.cos(state.direction*M.D)),M.scale(f.east,Math.sin(state.direction*M.D)));
 path([p,M.add(p,M.scale(look,R))],'#ffb1ca',3);
 const person=project(p),behind=M.dot(p,forward)<0;
 Rabbit3D.draw(c,Rabbit3D.geometry(p,f.up,look),project,forward,behind?.45:1);
 label(c,behind?'わたし（地球のうら側）':'わたし',person[0]+12,person[1]+24,'#ffb1ca','left',13);
 label(c,'星の方向はそのまま。地球と自分が回る。',w/2,h-20,'#ffb1ca','center',Math.min(14,w/29));
}
function drawSky(){
 const {x:c,w,h}=surface('sky'),left=44,right=w-18,top=36,bottom=h-55;
 c.fillStyle='#091827';c.fillRect(0,0,w,h);const X=d=>left+(d+60)/120*(right-left),Y=a=>bottom-a/90*(bottom-top);
 for(const alt of [0,30,60,90]){if(alt!==0&&!$('advanced').open)continue;line(c,[[left,Y(alt)],[right,Y(alt)]],alt===0?'#80ddc5':'#31485b',alt===0?2:1);if($('advanced').open)label(c,alt+'°',left-6,Y(alt)+4,'#b5c9d7','right',11);}
 c.fillStyle='#173c37';c.fillRect(left,bottom,right-left,h-bottom);label(c,'地平線',right-5,bottom-7,'#80ddc5','right');if($('advanced').open)label(c,'高度',8,17,'#b5c9d7','left',11);
 // Azimuth-altitude chart: screen distances are not spherical angular distances.
 c.save();c.beginPath();c.rect(left,top,right-left,bottom-top);c.clip();
 stars.forEach((s,i)=>{
  if(i%3!==0&&!s.polaris&&!s.focus&&!$('advanced').open)return;
  const col=s.polaris?'#ffdb7f':s.focus?'#8ce8ff':'#edf4f7';
  if(state.trail&&!s.polaris){let pts=[];const flush=()=>{if(pts.length>1)line(c,pts,s.focus?'#8ce8ffaa':'#718da366',s.focus?2:1);pts=[];};
   for(let i=0;i<=80;i++){const q=M.position(s,state.latitude,state.hours-2+i/40),d=M.wrap(q.az-state.direction);if(q.alt<0||Math.abs(d)>60){flush();continue;}pts.push([X(d),Y(q.alt)]);}flush();}
  const q=M.position(s,state.latitude,state.hours),d=M.wrap(q.az-state.direction);if(q.alt< -1e-10||Math.abs(d)>60)return;
  if(s.focus&&state.hours>0&&state.hours<=3&&state.direction===0&&state.latitude===35){const start=M.position(s,35,0),sd=M.wrap(start.az);c.beginPath();c.arc(X(sd),Y(start.alt),9,0,Math.PI*2);c.strokeStyle='#8ce8ff66';c.lineWidth=1;c.stroke();label(c,'はじめの場所',X(sd)-8,Y(start.alt)+24,'#9dbac7','right',11);}
  dot(c,[X(d),Y(Math.max(0,q.alt))],s.polaris?5:s.focus?4:s.m,col);
  if(s.focus){c.beginPath();c.arc(X(d),Y(q.alt),10,0,Math.PI*2);c.strokeStyle='#8ce8ff88';c.lineWidth=1.5;c.stroke();}
  if(s.polaris||s.focus)label(c,s.polaris?'北極星':'目印の星',Math.min(right-64,X(d)+12),Math.max(top+16,Y(q.alt)-12),col);
 });c.restore();
 label(c,'← '+names[(state.direction+270)%360]+' 側',left,bottom+27,'#b5c9d7');label(c,names[(state.direction+90)%360]+' 側 →',right,bottom+27,'#b5c9d7','right');
 // Pink shoes at the near edge: a first-person cue, not another child ahead.
 c.fillStyle='#ffb1ca';for(const dx of [-16,16]){c.beginPath();c.ellipse(w/2+dx,h+2,9,18,dx<0?-.15:.15,0,Math.PI*2);c.fill();}
 label(c,'わたしは、'+names[state.direction]+'を向いている',w/2,bottom+23,'#ffb1ca','center',12);
}
function render(){
 const mins=Math.round(state.hours*60);$('time-label').textContent=mins===0?'はじめの空':`${Math.floor(mins/60)}時間${mins%60?String(mins%60)+'分':''}たった`;
 $('time').value=state.hours;$('latitude').value=state.latitude;$('lat-label').textContent=state.latitude?'北緯'+state.latitude+'°':'赤道 0°';
 $('sky-heading').textContent=names[state.direction]+'を向いているよ'+($('advanced').open?' / '+$('lat-label').textContent:'');
 const simple={0:'北極星は、ほとんど同じ場所。そのまわりの星の場所が変わって見える。',90:'東の空では、星がのぼってくる。',180:'南の空では、星が左から右へ動いて見える。',270:'西の空では、星がしずんでいく。'};
 $('direction-caption').textContent=state.stage<2?'水色の星を、目で追ってみよう。下のピンクのくつは、あなたの足元。':simple[state.direction];
 $('polaris-info').textContent=`天の北極の高度 = ${state.latitude}°（北極星もほぼ同じ）`;
 const focus=M.position(stars.at(-1),state.latitude,state.hours);
 $('focus-info').textContent=`目印の星の高さ：${Math.abs(focus.alt)<.05?'0.0':focus.alt.toFixed(1)}° / ${focus.alt< -1e-10?'地平線の下':Math.abs(M.wrap(focus.az-state.direction))>60?'この向きの画面外':'今見ている空にあります'}。地球の回転：約${(state.hours*15).toFixed(1)}°。`;
 document.querySelectorAll('[data-dir]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.dir===state.direction)));
 $('play').textContent=state.playing?'Ⅱ 止める':'▶ 自動で動かす';$('play').setAttribute('aria-pressed',String(state.playing));
 const guides=[['1 / 3　空を見上げる','北の空に、水色の星が見える？','下に見えるのは地面。いま、あなたが立って見ている空だよ。','見つけた。時間を進めよう'],['1 / 3　時間を進める','同じ場所で、1時間待ってみよう。','「1時間 進める」を押して、水色の星を見てね。',''],['2 / 3　どうして？','あれ、星の場所が変わった。','あなたは歩いていないのに、どうして空が動いて見えるんだろう？','どうして動いたの？'],['2 / 3　外から見ると','ピンクのうさぎは、さっきのあなた。','地球が回ると、地面も自分もいっしょに回る。「自動で動かす」か「1時間 進める」で見てみよう。','ふたつの見方を並べる'],['3 / 3　つながった！','地球が回るから、星が動いて見える。','ピンクのうさぎは同じあなた。水色の星も同じ星。時間を進めて、見くらべよう。','']];
 const progress=state.stage<2?1:state.stage<4?2:3;
 for(let n=1;n<=3;n++)$('progress-'+n).setAttribute('aria-current',n===progress?'step':'false');
 const g=guides[state.stage];$('guide-number').textContent=g[0];$('guide-title').textContent=g[1];$('guide-text').textContent=g[2];$('found').textContent=g[3];$('found').hidden=!g[3];
 if(state.stage===2&&state.hours===0){$('guide-title').textContent='はじめの空に戻った。';$('guide-text').textContent='もう一度、1時間進めて見くらべてもいいよ。';}
 $('step').disabled=state.stage===0;$('play').hidden=state.stage<3;$('reset').hidden=state.stage<2;
 $('earth-panel').hidden=state.stage<3;$('sky-panel').hidden=state.stage===3;$('views').classList.toggle('solo',state.stage<4);
 $('advanced').hidden=state.stage<4;$('explore').hidden=state.stage<4||!$('direction-section').hidden;
 $('discovery').textContent=state.stage<2?'水色の星を、覚えておこう。':state.stage===2?(state.hours>0&&state.hours<=3?'うすい丸は、はじめに見えた場所。':'水色の星と北極星の位置を、見くらべよう。'):state.stage===3?'星の方向は同じ。地球に乗った自分の向きが変わる。':'地上では「星が動いた」と見える。宇宙から見ると「地球と自分が回った」。';
 if(!$('earth-panel').hidden)drawSpace();if(!$('sky-panel').hidden)drawSky();
}
let previous=null,animationId=null;
function animate(now){animationId=null;if(!state.playing){previous=null;return;}if(previous!==null)state.hours=Math.min(24,state.hours+Math.min((now-previous)/1000,.1)*.4);previous=now;if(state.hours>=24)state.playing=false;render();if(state.playing)animationId=requestAnimationFrame(animate);else previous=null;}
function stop(){state.playing=false;previous=null;if(animationId!==null)cancelAnimationFrame(animationId);animationId=null;}
$('play').addEventListener('click',()=>{if(state.playing)stop();else{state.playing=true;if(state.hours>=24)state.hours=0;previous=null;animationId=requestAnimationFrame(animate);}render();});
$('time').addEventListener('input',e=>{stop();state.hours=+e.target.value;render();});
$('step').addEventListener('click',()=>{if(state.stage===0)return;stop();state.hours=state.hours>=24?0:Math.min(24,state.hours+1);if(state.stage===1)state.stage=2;render();});
$('reset').addEventListener('click',()=>{stop();state.hours=0;render();});
$('latitude').addEventListener('input',e=>{state.latitude=+e.target.value;render();});
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>{state.latitude=+b.dataset.lat;render();}));
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>{state.direction=+b.dataset.dir;render();}));
$('trail').addEventListener('click',()=>{state.trail=!state.trail;$('trail').setAttribute('aria-pressed',String(state.trail));$('trail').textContent=state.trail?'通り道を消す':'通り道を出す';render();});
$('camera').addEventListener('click',()=>{state.polar=!state.polar;$('camera').setAttribute('aria-pressed',String(state.polar));$('camera').textContent=state.polar?'地球をななめから見る':'地球を上から見る';render();});
$('found').addEventListener('click',()=>{stop();if(state.stage===0)state.stage=1;else if(state.stage===2)state.stage=3;else if(state.stage===3)state.stage=4;render();});
$('explore').addEventListener('click',()=>{$('direction-section').hidden=false;render();});
$('advanced').addEventListener('toggle',render);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
window.addEventListener('resize',render);render();
})();
