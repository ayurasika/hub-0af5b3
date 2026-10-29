/* Cafe's original Daifuku atlas/rig, adapted for this isolated preview only.
 * Source: ayurasika/cafe@3d90e606bc2008dcfe09ac3208cb3b812790ef5e
 * The original PNG was obtained with explicit authorization and visually verified on the Mac. No fallback art.
 */
(function (root) {
  'use strict';
  const SOURCE_COMMIT = '3d90e606bc2008dcfe09ac3208cb3b812790ef5e';
  const ATLAS = 'assets/coordinator-budgie-atlas-v2.png';
  const RIG = Object.freeze({
    atlasSize: [1536, 1024],
    body: {box: [550, 100, 450, 860], anchor: [230, 615]},
    left: {box: [0, 100, 550, 550], pivot: [520, 334], shoulder: [-109, -289]},
    right: {box: [1020, 100, 516, 550], pivot: [30, 344], shoulder: [136, -293]}
  });
  // `size` describes the full safe wingspan, not the 450-unit body width.
  const UNITS_PER_SIZE = 1500;
  const SAFE_EXTENT = Object.freeze({left: 0.51, right: 0.51, top: 0.49, bottom: 0.32});
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const radians = n => n * Math.PI / 180;
  const ease = u => u * u * u * (10 + u * (-15 + 6 * u));

  function sampleFlight(time, flight, heading) {
    const u = clamp(finite(flight, 0), 0, 1);
    const facing = heading < 0 ? -1 : 1;
    const flap = Math.sin(finite(time, 0) * Math.PI * 2 * 3.2);
    return {
      progress: u,
      wing: Math.max(0, Math.min(1, u * 10, (1 - u) * 10)),
      wingAngle: flap * 34,
      wingScale: 0.72 + 0.28 * (flap + 1) / 2,
      tilt: facing * Math.sin(Math.PI * u) * 7,
      heading: facing,
      lift: Math.sin(Math.PI * u) ** 2
    };
  }

  function sampleRoute(time, stops, options) {
    if (!Array.isArray(stops) || stops.length < 2) throw new Error('Daifuku needs at least two stops');
    const opt = options || {};
    const rest = Math.max(0, finite(opt.rest, 4));
    const travel = Math.max(0.01, finite(opt.travel, 6));
    const lift = Math.max(0, finite(opt.lift, 100));
    const period = rest + travel;
    const total = period * stops.length;
    const seconds = finite(time, 0);
    const t = ((seconds % total) + total) % total;
    const index = Math.floor(t / period);
    const local = t - index * period;
    const point = p => Array.isArray(p) ? {x: p[0], y: p[1]} : p;
    const from = point(stops[index]);
    const to = point(stops[(index + 1) % stops.length]);
    if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) throw new Error('Invalid Daifuku stop');
    const heading = to.x >= from.x ? 1 : -1;
    if (local < rest) return {x: from.x, y: from.y, phase: 'perch', index, flight: 0, heading, time: seconds};
    const u = (local - rest) / travel;
    const e = ease(u);
    return {x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e - Math.sin(Math.PI * u) ** 2 * lift,
      phase: 'flight', index, flight: u, heading, time: seconds};
  }

  let atlas = null;
  let loaded = false;
  let error = null;
  let ready = Promise.resolve(false);
  let loadId = 0;
  const scriptBase = typeof document !== 'undefined'
    ? (document.currentScript && document.currentScript.src || document.baseURI) : null;

  // No Image instance or request is created until the caller explicitly loads it.
  function load(src) {
    const id = ++loadId;
    loaded = false; atlas = null; error = null;
    const fail = message => { error = new Error(message); ready = Promise.resolve(false); return ready; };
    if (typeof src !== 'string' || !src.trim()) return fail('A local Daifuku atlas source is required');
    const source = src.trim();
    const embeddedPng = /^data:image\/png;base64,[a-z0-9+/=\s]+$/i.test(source);
    const relativePath = !/^[a-z][a-z0-9+.-]*:|^[/\\]/i.test(source)
      && !/[\u0000-\u001f\u007f\\]/.test(source);
    if (!embeddedPng && !relativePath) return fail('Use a relative local path or an embedded PNG');
    if (typeof Image === 'undefined' || !scriptBase) return fail('Image loading is unavailable in this environment');
    let url;
    try { url = embeddedPng ? source : new URL(source, scriptBase).href; }
    catch (_) { return fail('The local Daifuku atlas path is invalid'); }
    const candidate = new Image();
    ready = new Promise(resolve => {
      candidate.onload = () => {
        if (id !== loadId) { resolve(false); return; }
        if (candidate.naturalWidth !== 1536 || candidate.naturalHeight !== 1024) {
          error = new Error('Daifuku atlas has unexpected dimensions'); resolve(false); return;
        }
        atlas = candidate; loaded = true; resolve(true);
      };
      candidate.onerror = () => {
        if (id === loadId) error = new Error('Cafe Daifuku atlas is unavailable');
        resolve(false);
      };
      candidate.src = url;
    });
    return ready;
  }

  function draw(ctx, options) {
    if (!loaded || !atlas) return false;
    const opt = options || {};
    const x = finite(opt.x, 0), y = finite(opt.y, 0);
    const size = Math.max(0, finite(opt.size, 120));
    if (!size) return false;
    const pose = sampleFlight(opt.time, opt.flight, opt.heading);
    const scale = size / UNITS_PER_SIZE;
    ctx.save();
    // Centre of the unrotated body box, while preserving Cafe's pose pivot.
    ctx.translate(x + 5 * pose.heading * scale, y + 185 * scale);
    ctx.scale(scale, scale);
    ctx.rotate(radians(pose.tilt));
    ctx.scale(pose.heading, 1);
    const body = RIG.body;
    ctx.drawImage(atlas, ...body.box, -body.anchor[0], -body.anchor[1], body.box[2], body.box[3]);
    // Cafe DOM order is body, left wing, right wing; wings overlay the body.
    if (pose.wing > 0) ['left', 'right'].forEach(side => {
      const part = RIG[side];
      ctx.save();
      ctx.globalAlpha *= pose.wing;
      ctx.translate(...part.shoulder);
      ctx.rotate(radians((side === 'left' ? 1 : -1) * pose.wingAngle));
      ctx.scale(1, pose.wingScale);
      ctx.drawImage(atlas, ...part.box, -part.pivot[0], -part.pivot[1], part.box[2], part.box[3]);
      ctx.restore();
    });
    ctx.restore();
    return true;
  }

  const api = {draw, load, sampleFlight, sampleRoute, ease, rig: RIG,
    sourceCommit: SOURCE_COMMIT, assetPath: ATLAS, unitsPerSize: UNITS_PER_SIZE,
    safeExtent: SAFE_EXTENT, timing: Object.freeze({rest: 4, travel: 6, frequency: 3.2, wingDegrees: 34, tiltDegrees: 7}),
    get ready() { return ready; }, get loaded() { return loaded; }, get error() { return error; }};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Daifuku = api;
})(typeof window !== 'undefined' ? window : this);
