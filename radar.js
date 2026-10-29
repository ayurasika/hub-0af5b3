// ===== のびしろレーダー（単元ごとの「前といま」） =====
// データ: data/radar.js（window.RADAR）。tests/build_radar.py が tests/kiroku.json から作る。
// 見た目だけ変えるときは、このファイルと下の CSS だけさわればいい（データの形は変えない）
(function(){
  var R = window.RADAR;
  var card = document.querySelector('.card.nobi');
  if(!R || !card) return;
  var LABEL = {sansu:"算数", kokugo:"国語", rika:"理科"};

  var css = document.createElement('style');
  css.textContent = [
    '.nobi .rd-legend{display:flex;gap:14px;justify-content:center;font-size:.68rem;color:#778;font-weight:700;margin-top:-2px;}',
    '.nobi .rd-legend i{display:inline-block;width:16px;height:0;border-top:3px solid #0d7a8f;vertical-align:middle;margin-right:4px;}',
    '.nobi .rd-legend i.b{border-top:2px dashed #9aa7b4;}',
    '.nobi .rd-sec{margin-top:10px;display:flex;flex-direction:column;gap:6px;}',
    '.nobi .rd-lab{font-size:.68rem;font-weight:900;color:#889;letter-spacing:.05em;}',
    '.nobi .rd-row{border-radius:12px;padding:8px 11px;}',
    '.nobi .rd-row .h{display:flex;align-items:center;gap:8px;font-weight:900;font-size:.88rem;}',
    '.nobi .rd-row .v{margin-left:auto;font-size:.72rem;font-weight:900;white-space:nowrap;}',
    '.nobi .rd-row .t{font-size:.74rem;color:#555;line-height:1.6;margin-top:2px;}',
    '.nobi .rd-up{background:#eefaf2;border:2px solid #bfe8cf;} .nobi .rd-up .h,.nobi .rd-up .v{color:#1f9d52;}',
    '.nobi .rd-star{background:#fff7e0;border:2px solid #f2d27a;} .nobi .rd-star .h,.nobi .rd-star .v{color:#a07400;}',
    '.nobi .rd-fire{background:#fff1e8;border:2px solid #ffc9a8;} .nobi .rd-fire .h{color:#e8611a;}',
    '.nobi .rd-pop{font-size:1rem;font-weight:900;color:#e8611a;text-align:center;margin:2px 0 4px;}',
    '.nobi .rd-pop.go{animation:rdpop .7s ease-out;}',
    '@keyframes rdpop{0%{transform:scale(.6);opacity:.3}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.nobi .rd-pop.go{animation:none;}}',
    '.nobi .rd-stamps{display:flex;gap:5px;margin-top:5px;align-items:center;flex-wrap:wrap;}',
    '.nobi .rd-stamps span{width:26px;height:26px;border-radius:50%;border:2px dashed #ffc9a8;display:flex;align-items:center;justify-content:center;font-size:.8rem;}',
    '.nobi .rd-stamps span.on{border:2px solid #e8611a;background:#e8611a;}',
    '.nobi .rd-stamps b{font-size:.72rem;color:#e8611a;margin-right:4px;min-width:5.5em;}',
    '.nobi .rd-none{font-size:.72rem;color:#99a;}'
  ].join('\n');
  document.head.appendChild(css);

  function pct(t){ return t.of ? Math.round(100*t.got/t.of) : null; }
  function md(d){ var p=d.split('-'); return (+p[1])+'/'+(+p[2]); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  // はじめに開く教科：1週間以内に苦手チャレンジがあればその教科
  var first = 'sansu';
  ['sansu','kokugo','rika'].forEach(function(k){ var S=R.subjects[k]; if(S && S.challenge.hero) first = k; });

  card.innerHTML =
    '<h2>📊 のびしろレーダー <span class="badge">外側＝できた</span></h2>' +
    '<div class="sub">テストとプリントで、単元ごとに「何問中何問できたか」。点線が前、色がいま。広がったところが伸びたところ！</div>' +
    '<div class="tabs" id="rd-tabs"></div><div class="chartwrap" id="nobi-chart"></div>' +
    '<div class="rd-legend"><span><i class="b"></i>前（5〜10週前）</span><span><i></i>いま（この4週）</span></div>' +
    '<div id="rd-body"></div>' +
    '<div class="nobinote">更新 '+md(R.updated)+'。問題が少ない単元は数字がぶれやすいよ。</div>';

  var tabs = document.getElementById('rd-tabs');
  Object.keys(LABEL).forEach(function(k){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab ' + (k===first?'on':'off'); b.style.opacity = 1;
    b.textContent = LABEL[k]; b.setAttribute('data-rd', k);
    b.onclick = function(){ [].forEach.call(tabs.children,function(x){x.className='tab off';}); b.className='tab on'; render(k); };
    tabs.appendChild(b);
  });
  render(first);

  function render(key){
    var S = R.subjects[key]; if(!S) return;
    var up = {}; S.up.forEach(function(u){ up[u.u]=u; });
    // レーダー
    var n=S.axes.length, cx=195, cy=130, Rr=82;
    function pt(i,f){ var a=-Math.PI/2+i*2*Math.PI/n; return [cx+Rr*f*Math.cos(a), cy+Rr*f*Math.sin(a)]; }
    function poly(get){ return S.axes.map(function(a,i){ var v=get(a); var p=pt(i,Math.max(v==null?0:v,4)/100); return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' '); }
    var s='<svg viewBox="0 0 390 262" style="width:100%;max-width:390px;" role="img" aria-label="'+LABEL[key]+'の単元ごとのできた割合（前といま）">';
    [.25,.5,.75,1].forEach(function(f){ s+='<polygon points="'+S.axes.map(function(_,i){return pt(i,f).join(',');}).join(' ')+'" fill="none" stroke="#d8ecf1" stroke-width="1.2"/>'; });
    S.axes.forEach(function(_,i){ var p=pt(i,1); s+='<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'" stroke="#d8ecf1" stroke-width="1.2"/>'; });
    s+='<polygon points="'+poly(function(a){return pct(a.before);})+'" fill="none" stroke="#9aa7b4" stroke-width="2" stroke-dasharray="5 4"/>';
    s+='<polygon points="'+poly(function(a){return pct(a.now);})+'" fill="rgba(13,122,143,.2)" stroke="#0d7a8f" stroke-width="2.5" stroke-linejoin="round"/>';
    S.axes.forEach(function(a,i){ var v=pct(a.now); if(v==null) return; var p=pt(i,Math.max(v,4)/100); var u=up[a.u];
      s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(u?5:3.5)+'" fill="'+(u?'#1f9d52':'#0d7a8f')+'"/>'; });
    S.axes.forEach(function(a,i){ var p=pt(i,1.17), anc=Math.abs(p[0]-cx)<8?'middle':(p[0]>cx?'start':'end'); var u=up[a.u]; var v=pct(a.now);
      s+='<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+4).toFixed(1)+'" text-anchor="'+anc+'" font-size="11.5" font-weight="700" fill="'+(u?'#1f9d52':'#456')+'" font-family="inherit">'+(u?'⬆':'')+esc(a.u)+'</text>';
      s+='<text x="'+p[0].toFixed(1)+'" y="'+(p[1]+17).toFixed(1)+'" text-anchor="'+anc+'" font-size="10" fill="#99a" font-family="inherit">'+(v==null?'まだ':a.now.got+'/'+a.now.of)+'</text>'; });
    s+='</svg>';
    document.getElementById('nobi-chart').innerHTML = s;

    var h='';
    // 苦手チャレンジ（いちばん上に出す）
    var C=S.challenge, hero=C.hero;
    if(hero || C.counts.length){
      h+='<div class="rd-sec"><div class="rd-lab">🔥 苦手チャレンジ</div><div class="rd-row rd-fire">';
      if(hero){
        h+='<div class="rd-pop" id="rd-pop">苦手の「'+esc(hero.u)+'」にチャレンジした！</div>';
        h+='<div class="t">📷 '+md(hero.date)+' に「'+esc(hero.n)+'」が届いたよ。前は'+(hero.was!=null?hero.was+'%しか':'あまり')+'できなかった単元。やっただけで、もうえらい。'+(hero.of?'（'+hero.of+'問中'+hero.got+'問できた）':'')+'</div>';
      }
      C.counts.forEach(function(c){
        h+='<div class="rd-stamps"><b>'+esc(c.u)+'</b>';
        for(var i=0;i<Math.max(5,c.count);i++) h+='<span class="'+(i<c.count?'on':'')+'">'+(i<c.count?'🔥':'')+'</span>';
        h+='</div>';
      });
      h+='</div></div>';
    }
    // 伸びてきた
    h+='<div class="rd-sec"><div class="rd-lab">⬆ 伸びてきた</div>';
    if(S.up.length) S.up.forEach(function(u){
      h+='<div class="rd-row rd-up"><div class="h">'+esc(u.u)+'<span class="v">'+u.before+'% → '+u.now+'%</span></div>'+
        (u.why?'<div class="t">'+md(u.why.date)+'の'+esc(u.why.label)+'「'+esc(u.why.n)+'」は'+u.why.of+'問中'+u.why.got+'問できた！</div>':'')+'</div>';
    }); else h+='<div class="rd-none">まだ「前」と比べられるほど記録がないよ。プリントを送るとふえていく。</div>';
    h+='</div>';
    // 得意の証拠
    h+='<div class="rd-sec"><div class="rd-lab">⭐ 得意の証拠</div>';
    if(S.stars.length) S.stars.forEach(function(x){
      h+='<div class="rd-row rd-star"><div class="h">'+esc(x.u)+'<span class="v">'+x.of+'問中'+x.got+'問</span></div><div class="t">'+md(x.date)+' '+esc(x.label)+'「'+esc(x.n)+'」'+(x.got===x.of?'　満点！':'')+'</div></div>';
    }); else h+='<div class="rd-none">ここ6週間で、ほぼ満点の単元が出たらここに出るよ。</div>';
    h+='</div>';
    // 最近届いたプリント
    if(S.prints.length){
      h+='<div class="rd-sec"><div class="rd-lab">📷 最近届いたプリント</div>';
      S.prints.forEach(function(p){ h+='<div class="rd-none">'+md(p.date)+' '+esc(p.u)+'「'+esc(p.n)+'」'+(p.of?p.of+'問中'+p.got+'問':'')+(p.challenge?' 🔥':'')+'</div>'; });
      h+='</div>';
    }
    document.getElementById('rd-body').innerHTML = h;

    // チャレンジの文字は、その端末で初めて見たときだけ動かす
    if(hero){
      var k='rd-seen-'+key+'-'+hero.date+'-'+hero.u, seen=false;
      try{ seen = localStorage.getItem(k)==='1'; localStorage.setItem(k,'1'); }catch(e){}
      if(!seen){ var el=document.getElementById('rd-pop'); if(el) el.className+=' go'; }
    }
  }
})();
