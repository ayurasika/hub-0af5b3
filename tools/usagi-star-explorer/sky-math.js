(function(root){
  'use strict';
  const D=Math.PI/180;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const scale=(a,k)=>a.map(v=>v*k);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>scale(a,1/Math.hypot(...a));
  const wrap=a=>((a+180)%360+360)%360-180;
  function frame(latitude,hours){
    const p=latitude*D,t=hours*15*D;
    return {up:[Math.cos(p)*Math.cos(t),Math.cos(p)*Math.sin(t),Math.sin(p)],
      east:[-Math.sin(t),Math.cos(t),0],
      north:[-Math.sin(p)*Math.cos(t),-Math.sin(p)*Math.sin(t),Math.cos(p)]};
  }
  function starVector(ra,dec){return [Math.cos(dec*D)*Math.cos(ra*D),Math.cos(dec*D)*Math.sin(ra*D),Math.sin(dec*D)];}
  function position(star,latitude,hours){
    const f=frame(latitude,hours),v=starVector(star.ra,star.dec);
    return {alt:Math.asin(Math.max(-1,Math.min(1,dot(v,f.up))))/D,
      az:(Math.atan2(dot(v,f.east),dot(v,f.north))/D+360)%360};
  }
  // Original tool's seeded illustrative star distribution; not a catalog of real constellations.
  function makeStars(){let seed=7;const random=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};
    const stars=[];for(let i=0;i<170;i++)stars.push({ra:random()*360,dec:-35+random()*125,m:.8+random()*1.6});
    stars.push({ra:0,dec:90,m:2.4,polaris:true});
    // Highlight one declination-zero star to compare both views.
    stars.push({ra:90,dec:0,m:2.8,focus:true});return stars;
  }
  const api={D,dot,add,scale,cross,unit,wrap,frame,starVector,position,makeStars};
  if(typeof module!=='undefined')module.exports=api;else root.SkyMath=api;
})(typeof window!=='undefined'?window:globalThis);
