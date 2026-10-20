(function(root){
'use strict';
const M=typeof module!=='undefined'?require('./sky-math.js'):root.SkyMath;
// Local x = rabbit's right, y = gaze direction, z = standing up.
function geometry(p,up,look){
 const right=M.unit(M.cross(look,up));
 const world=v=>M.add(p,M.add(M.scale(right,v[0]),M.add(M.scale(look,v[1]),M.scale(up,v[2]))));
 const parts=[
  {c:[-.075,.035,.035],r:[.068,.088,.035],color:[249,211,220],part:'foot'},
  {c:[.075,.035,.035],r:[.068,.088,.035],color:[249,211,220],part:'foot'},
  {c:[0,0,.125],r:[.145,.12,.12],color:[250,213,222],part:'body'},
  {c:[0,.106,.12],r:[.088,.018,.073],color:[255,234,225],part:'belly'},
  {c:[0,-.12,.08],r:[.048,.048,.048],color:[255,234,230],part:'tail'},
  {c:[-.13,.04,.125],r:[.033,.038,.045],color:[250,213,222],part:'arm'},
  {c:[.13,.04,.125],r:[.033,.038,.045],color:[250,213,222],part:'arm'},
  // One broad head includes the cheeks: no separate cheek spheres or neck seam.
  {c:[0,.01,.29],r:[.175,.145,.15],color:[255,220,227],part:'head'},
  {c:[-.077,.0,.495],r:[.044,.039,.145],color:[255,220,227],part:'ear'},
  {c:[.077,.0,.495],r:[.044,.039,.145],color:[255,220,227],part:'ear'},
  {c:[-.077,.034,.50],r:[.021,.009,.107],color:[233,164,184],part:'inner-ear'},
  {c:[.077,.034,.50],r:[.021,.009,.107],color:[233,164,184],part:'inner-ear'},
  {c:[-.067,.14,.315],r:[.017,.016,.019],color:[83,59,67],part:'eye'},
  {c:[.067,.14,.315],r:[.017,.016,.019],color:[83,59,67],part:'eye'},
  {c:[-.070,.153,.321],r:[.004,.004,.005],color:[255,249,241],part:'glint'},
  {c:[.064,.153,.321],r:[.004,.004,.005],color:[255,249,241],part:'glint'},
  {c:[0,.15,.274],r:[.058,.025,.03],color:[255,234,230],part:'muzzle'},
  {c:[0,.177,.285],r:[.015,.013,.011],color:[181,104,128],part:'nose'}
 ];
 const triangles=[];
 for(const part of parts){
  const point=(lat,lon)=>world([part.c[0]+part.r[0]*Math.cos(lat)*Math.cos(lon),part.c[1]+part.r[1]*Math.cos(lat)*Math.sin(lon),part.c[2]+part.r[2]*Math.sin(lat)]);
  for(let j=0;j<10;j++)for(let i=0;i<16;i++){
   const a=-Math.PI/2+j*Math.PI/10,b=a+Math.PI/10,u=i*Math.PI/8,v=u+Math.PI/8;
   const A=point(a,u),B=point(a,v),C=point(b,v),D=point(b,u);
   for(const pts of [[A,B,C],[A,C,D]]){const n=M.cross(M.add(pts[1],M.scale(pts[0],-1)),M.add(pts[2],M.scale(pts[0],-1)));if(Math.hypot(...n)<1e-12)continue;triangles.push({points:pts,normal:M.unit(n),color:part.color});}
  }
 }
 return {triangles,feet:[world([-.075,.035,0]),world([.075,.035,0])],nose:world([0,.177,.285]),up,look,right};
}
function draw(ctx,mesh,project,eye,opacity=1){
 const light=M.unit([-.6,-.8,1.3]);
 const faces=mesh.triangles.filter(t=>M.dot(t.normal,eye)>0).map(t=>({...t,depth:t.points.reduce((n,p)=>n+M.dot(p,eye),0)/3})).sort((a,b)=>a.depth-b.depth);
 ctx.save();ctx.globalAlpha=opacity;
 for(const t of faces){const brightness=.82+.18*Math.max(0,M.dot(t.normal,light));ctx.fillStyle=`rgb(${t.color.map(v=>Math.round(v*brightness)).join(',')})`;ctx.beginPath();t.points.map(project).forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.35;ctx.stroke();}
 ctx.restore();
}
const api={geometry,draw};if(typeof module!=='undefined')module.exports=api;else root.Rabbit3D=api;
})(typeof window!=='undefined'?window:globalThis);
