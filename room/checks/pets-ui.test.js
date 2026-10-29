'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('../pets');
const A = require('../pet-actions');
const IDS = ['daifuku', 'little-man'];
const KEY = P.previewKey;
const jsonCopy = value => JSON.parse(JSON.stringify(value));
function preferences(bird = true, man = true, quiet = false) {
  return {schema: 1, visible: {daifuku: bird, 'little-man': man}, quiet};
}
function storageFixture(state) {
  const data = new Map([
    [P.key, 'fictional production pet settings'],
    ['kokoro-room-season-v1', 'fictional outfit and decoration settings'],
    ['kokoro-room-device-v1:layout-v2', 'fictional furniture placement'],
    ['kokoro-room-roam-v1', 'off'], ['shared-cache', 'fictional learning records']
  ]);
  if (state !== undefined) data.set(KEY, JSON.stringify(state));
  return data;
}

// Execute the real controller/store/action model with inert images, a fake DOM,
// isolated Map storage, and a deterministic RAF queue. No browser or I/O.
function boot({data = storageFixture(), osReduced = false, readFailure = false, writeFailure = false,
  observers = true, legacyMedia = false, status = {started: true, collectionDays: 27}} = {}) {
  const access = [], writes = [], loads = [], scrolls = [], readers = [], raf = new Map(), timers = new Map();
  let now = 0, serial = 0, paint = [], portraitPaint = [], observerCallback, resizeCallback;
  let manImage, birdResolve, birdPromise, birdLoaded = false;
  const storageErrors = {read: readFailure, write: writeFailure};
  function target(properties = {}) {
    const listeners = new Map();
    return Object.assign({
      dataset: {}, style: {}, attributes: {}, textContent: '', hidden: false, disabled: false, checked: false,
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      },
      dispatch(name, event = {}) {
        const payload = Object.assign({type: name, target: this}, event);
        for (const callback of listeners.get(name) || []) callback.call(this, payload);
      },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name] ?? null; }
    }, properties);
  }
  const ctx = {};
  for (const method of ['save', 'restore', 'beginPath', 'ellipse', 'fill', 'translate', 'rotate', 'scale', 'setTransform']) {
    ctx[method] = (...args) => paint.push([method, ...args]);
  }
  ctx.clearRect = () => { paint = []; };
  ctx.drawImage = (_image, ...args) => paint.push(['man', ...args]);
  const portraitCtx = {setTransform: (...args) => portraitPaint.push(['setTransform', ...args])};
  const nodeNames = ['canvas', 'error', 'note', 'quiet', 'pause', 'undo', 'export', 'import', 'daifuku-portrait', 'progress'];
  IDS.forEach(id => nodeNames.push('show-' + id, 'action-' + id, 'hit-' + id, 'earned-' + id));
  const nodes = Object.fromEntries(nodeNames.map(name => [name, target()]));
  nodes.canvas.getContext = () => ctx;
  nodes['daifuku-portrait'].getContext = () => portraitCtx;
  const scene = target({getBoundingClientRect: () => ({width: 390, height: 260}), scrollIntoView: options => scrolls.push(jsonCopy(options))});
  const host = target({querySelector: selector => {
    assert.equal(selector, '.sr-scene'); return scene;
  }});
  host.attributes['data-room-preview'] = 'true';
  const document = target({hidden: false, getElementById(id) {
    if (id === 'study-room') return host;
    assert.ok(id.startsWith('sp-') && nodes[id.slice(3)], 'unexpected DOM access: ' + id);
    return nodes[id.slice(3)];
  }});
  const media = target({matches: osReduced});
  if (legacyMedia) {
    const subscribe = media.addEventListener.bind(media);
    delete media.addEventListener;
    media.addListener = callback => subscribe('change', callback);
  }
  const localStorage = {
    getItem(key) { access.push(['get', key]); if (storageErrors.read) throw Error('SecurityError'); return data.get(key) ?? null; },
    setItem(key, value) {
      access.push(['set', key]); if (storageErrors.write) throw Error('QuotaExceededError');
      writes.push([key, value]); data.set(key, value);
    }
  };
  function requestAnimationFrame(callback) { const id = ++serial; raf.set(id, callback); return id; }
  function cancelAnimationFrame(id) { raf.delete(id); }
  function setTimeout(callback, delay) { const id = ++serial; timers.set(id, {callback, delay}); return id; }
  const window = target({localStorage, RoomRewardStatus: status, devicePixelRatio: 1, requestAnimationFrame, cancelAnimationFrame,
    matchMedia: query => { assert.equal(query, '(prefers-reduced-motion: reduce)'); return media; }});
  const environment = {
    window, document, RoomPets: P, RoomPetActions: A,
    requestAnimationFrame, cancelAnimationFrame, setTimeout,
    Image: class {
      constructor() { manImage = this; this.naturalWidth = 1354; this.naturalHeight = 1161; }
      set src(value) { loads.push(['man', value]); }
    },
    FileReader: class {
      readAsText(file) { this.file = file; readers.push(this); }
    },
    Daifuku: {
      load(path) {
        assert.equal(path, 'assets/coordinator-budgie-atlas-v2.png');
        loads.push(['bird', path]); birdPromise = new Promise(resolve => { birdResolve = resolve; }); return birdPromise;
      },
      draw(context, options) {
        assert.equal(birdLoaded, true, 'cannot draw before atlas load succeeds');
        const output = context === ctx ? paint : context === portraitCtx ? portraitPaint : null;
        assert.ok(output, 'unexpected canvas'); output.push(['bird', {...options}]); return true;
      }
    }
  };
  if (observers) {
    environment.ResizeObserver = window.ResizeObserver = class {
      constructor(callback) { resizeCallback = callback; } observe(node) { assert.equal(node, scene); }
    };
    environment.IntersectionObserver = window.IntersectionObserver = class {
      constructor(callback) { observerCallback = callback; } observe(node) { assert.equal(node, scene); }
    };
  }
  vm.runInNewContext(fs.readFileSync(require.resolve('../pets-ui.js'), 'utf8'), environment, {filename: 'pets-ui.js'});
  const api = {
    data, access, writes, loads, scrolls, nodes, host, scene, window, document, media, storageErrors,
    pending: () => raf.size, timerCount: () => timers.size,
    paint: () => jsonCopy(paint), portrait: () => jsonCopy(portraitPaint),
    birdPose: () => jsonCopy(paint.find(op => op[0] === 'bird')?.[1] ?? null),
    elapsed(id) { const value = nodes['hit-' + id].dataset.elapsed; return value === '' ? null : Number(value); },
    position(id) { const hit = nodes['hit-' + id]; return {x: hit.dataset.x, y: hit.dataset.y, phase: hit.dataset.phase}; },
    saved: () => JSON.parse(data.get(KEY)),
    click(name) { assert.equal(nodes[name].disabled, false, name + ' must be usable'); nodes[name].dispatch('click'); },
    forceClick(name) { nodes[name].dispatch('click'); },
    quiet(value) { assert.equal(nodes.quiet.disabled, false); nodes.quiet.checked = value; nodes.quiet.dispatch('change'); },
    reduced(value) { media.matches = value; media.dispatch('change', {matches: value}); },
    rewards(value) { window.RoomRewardStatus = value; window.dispatch('room-rewards-change'); },
    startImport(raw) {
      assert.equal(nodes.import.disabled, false);
      nodes.import.files = [{size: Buffer.byteLength(raw), text: raw}]; nodes.import.value = 'fixture.json';
      nodes.import.dispatch('change');
    },
    async finishImport() {
      assert.ok(readers.length, 'the real change handler must create a FileReader');
      const reader = readers.shift(); await Promise.resolve();
      reader.result = reader.file.text; reader.onload();
      assert.equal(nodes.import.value, '');
    },
    hidden(value) { document.hidden = value; document.dispatch('visibilitychange'); },
    visible(value) { assert.ok(observerCallback); observerCallback([{isIntersecting: value}]); },
    resize() { if (resizeCallback) resizeCallback(); else window.dispatch('resize'); },
    step(milliseconds = 50) {
      now += milliseconds; const callbacks = [...raf.values()]; raf.clear();
      callbacks.forEach(callback => callback(now));
      assert.ok(raf.size <= 1, 'never schedule multiple animation loops');
    },
    advance(milliseconds) {
      let left = milliseconds;
      while (left > 0) { const step = Math.min(50, left); api.step(step); left -= step; }
    },
    settleMan(ok = true) { if (ok) manImage.onload(); else manImage.onerror(); },
    async settleBird(ok = true) { birdLoaded = ok; birdResolve(ok); await birdPromise; await Promise.resolve(); },
    async ready({bird = true, man = true} = {}) { api.settleMan(man); await api.settleBird(bird); }
  };
  return api;
}

test('initial load and selected pets stay calm without RAF, timers or storage writes', async () => {
  for (const state of [undefined, preferences()]) {
    const f = boot({data: storageFixture(state)}), before = [...f.data];
    assert.equal(f.pending(), 0); assert.equal(f.timerCount(), 0);
    await f.ready();
    assert.equal(f.pending(), 0); assert.equal(f.timerCount(), 0); assert.deepEqual([...f.data], before);
    assert.deepEqual(f.writes, []);
    for (const id of IDS) {
      assert.equal(f.nodes['hit-' + id].hidden, !state);
      assert.equal(f.nodes['show-' + id].attributes['aria-pressed'], String(!!state));
      if (state) assert.equal(f.elapsed(id), null);
    }
    f.advance(60000); assert.equal(f.pending(), 0); assert.deepEqual(f.writes, []);
    assert.deepEqual(f.loads, [['man', 'room/assets/pet-little-man.png'], ['bird', 'assets/coordinator-budgie-atlas-v2.png']]);
    assert.equal(f.portrait().filter(op => op[0] === 'bird').length, 1);
  }
});

test('each tap performs one finite action, repeated clicks never queue another trip', async () => {
  for (const id of IDS) {
    const f = boot({data: storageFixture(preferences())}); await f.ready();
    const other = IDS.find(value => value !== id), still = f.position(other), before = f.position(id);
    f.click('hit-' + id); f.step(0); f.advance(300);
    assert.ok(f.elapsed(id) > 0); assert.deepEqual(f.position(other), still);
    const alreadyElapsed = f.elapsed(id), inProgress = f.paint();
    for (let i = 0; i < 10; i++) f.forceClick('action-' + id);
    assert.equal(f.elapsed(id), alreadyElapsed, 'repeated taps must not rewind the current action');
    assert.deepEqual(f.paint(), inProgress);
    assert.equal(f.pending(), 1);
    f.advance((A.duration(id) + .2) * 1000);
    assert.equal(f.elapsed(id), null); assert.equal(f.pending(), 0);
    assert.equal(f.nodes['action-' + id].disabled, false);
    assert.notDeepEqual(f.position(id), before);
    const after = f.paint(); f.advance(60000); assert.deepEqual(f.paint(), after);
    assert.deepEqual(f.writes, []); assert.equal(f.timerCount(), 0);
  }
});

test('both pets can act independently and the shorter action finishing does not stop the bird', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  f.click('action-daifuku'); f.step(0); f.advance(300);
  const birdElapsed = f.elapsed('daifuku');
  f.click('action-little-man'); assert.equal(f.elapsed('daifuku'), birdElapsed);
  f.step(0); f.advance((A.duration('little-man') + .1) * 1000);
  assert.equal(f.elapsed('little-man'), null); assert.ok(f.elapsed('daifuku') > birdElapsed);
  assert.equal(f.pending(), 1);
  f.advance(6500); assert.equal(f.pending(), 0); assert.equal(f.elapsed('daifuku'), null);
  assert.deepEqual(f.writes, []);
});

test('partial image failures disable only that pet and preserve the other finite action', async () => {
  for (const failed of IDS) {
    const f = boot({data: storageFixture(preferences())});
    await f.ready({bird: failed !== 'daifuku', man: failed !== 'little-man'});
    const working = IDS.find(id => id !== failed);
    assert.equal(f.nodes['action-' + failed].disabled, true); assert.equal(f.nodes['hit-' + failed].hidden, true);
    assert.equal(f.nodes['hit-' + working].hidden, false); assert.match(f.nodes.error.textContent, /画像を読み込めません/);
    f.click('action-' + working); f.step(0); f.advance((A.duration(working) + .1) * 1000);
    assert.equal(f.pending(), 0); assert.equal(f.elapsed(working), null);
    assert.equal(f.portrait().some(op => op[0] === 'bird'), failed !== 'daifuku');
    assert.deepEqual(f.writes, []);
  }
});

test('late atlas completion preserves a paused action and never starts a newly ready pet', async () => {
  const f = boot({data: storageFixture(preferences())}); f.settleMan();
  assert.equal(f.nodes['action-daifuku'].disabled, true);
  f.click('action-little-man'); f.step(0); f.advance(300); f.click('pause');
  const elapsed = f.elapsed('little-man'), man = f.position('little-man');
  await f.settleBird();
  assert.equal(f.pending(), 0); assert.equal(f.nodes.canvas.dataset.paused, 'true');
  assert.equal(f.elapsed('little-man'), elapsed); assert.deepEqual(f.position('little-man'), man);
  assert.equal(f.elapsed('daifuku'), null); assert.equal(f.nodes['hit-daifuku'].hidden, false);
  assert.deepEqual(f.writes, []);
  f.click('pause'); f.step(0); assert.equal(f.elapsed('little-man'), elapsed);
  f.advance(2700); assert.equal(f.pending(), 0); assert.equal(f.elapsed('daifuku'), null);
  assert.ok(f.scrolls.every(options => options.block === 'start' && options.behavior === 'auto'));
});

test('pause/resume freezes both poses and excludes elapsed wall time', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  IDS.forEach(id => f.click('action-' + id)); f.step(0); f.advance(300);
  f.click('pause'); const frozen = f.paint(), elapsed = IDS.map(id => f.elapsed(id));
  assert.equal(f.pending(), 0); assert.equal(f.nodes.canvas.dataset.paused, 'true');
  f.advance(60000); f.resize(); assert.deepEqual(f.paint(), frozen);
  f.click('pause'); f.step(0); assert.deepEqual(f.paint(), frozen);
  f.step(50); IDS.forEach((id, index) => assert.ok(Math.abs(f.elapsed(id) - elapsed[index] - .05) < 1e-8));
  f.advance(6500); assert.equal(f.pending(), 0); assert.deepEqual(f.writes, []);
});

test('tapping the other pet cannot release a global pause or queue a hidden action', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  f.click('action-daifuku'); f.step(0); f.advance(350); f.click('pause');
  const frozen = f.paint(), elapsed = f.elapsed('daifuku');
  IDS.forEach(id => {
    assert.equal(f.nodes['action-' + id].disabled, true);
    assert.equal(f.nodes['hit-' + id].disabled, true);
    f.forceClick('action-' + id); f.forceClick('hit-' + id);
  });
  assert.equal(f.pending(), 0); assert.equal(f.nodes.canvas.dataset.paused, 'true');
  assert.equal(f.elapsed('daifuku'), elapsed); assert.equal(f.elapsed('little-man'), null);
  assert.deepEqual(f.paint(), frozen);
  f.click('pause'); f.step(0); assert.deepEqual(f.paint(), frozen);
  assert.equal(f.nodes['action-little-man'].disabled, false);
  f.advance(6500); assert.equal(f.pending(), 0); assert.equal(f.elapsed('little-man'), null);
  assert.deepEqual(f.writes, []);
});

test('manual and OS quiet cancel actions and never autonomously restart them', async () => {
  for (const mode of ['manual', 'os']) {
    const f = boot({data: storageFixture(preferences()), legacyMedia: mode === 'os'}); await f.ready();
    IDS.forEach(id => f.click('action-' + id)); f.step(0); f.advance(300);
    if (mode === 'manual') f.quiet(true); else f.reduced(true);
    assert.equal(f.pending(), 0); assert.equal(f.nodes.canvas.dataset.reduced, 'true');
    for (const id of IDS) { assert.equal(f.elapsed(id), null); assert.equal(f.nodes['action-' + id].disabled, true); }
    assert.equal(f.birdPose().flight, 0);
    assert.equal(f.nodes.quiet.disabled, mode === 'os');
    assert.equal(f.saved().quiet, mode === 'manual');
    if (mode === 'manual') f.quiet(false); else f.reduced(false);
    f.advance(60000); assert.equal(f.pending(), 0);
    f.click('action-daifuku'); assert.equal(f.pending(), 1);
  }
  const f = boot({data: storageFixture(preferences(true, true, true)), osReduced: true}); await f.ready();
  f.reduced(false); assert.equal(f.nodes.quiet.checked, true); assert.equal(f.pending(), 0);
  assert.equal(f.nodes['action-daifuku'].disabled, true); assert.deepEqual(f.writes, []);
});

test('hiding one pet cancels only its action and showing it again stays static', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  IDS.forEach(id => f.click('action-' + id)); f.step(0); f.advance(200);
  const manElapsed = f.elapsed('little-man');
  f.click('show-daifuku');
  assert.equal(f.nodes['hit-daifuku'].hidden, true); assert.equal(f.elapsed('little-man'), manElapsed); assert.equal(f.pending(), 1);
  f.click('show-daifuku'); assert.equal(f.elapsed('daifuku'), null); assert.equal(f.saved().visible.daifuku, true);
  f.step(0); f.advance(2700); assert.equal(f.pending(), 0); assert.equal(f.elapsed('little-man'), null);
  assert.equal(f.writes.length, 2);
});

test('offscreen, hidden, and unfocused rooms freeze unfinished actions and resume without catchup', async () => {
  for (const mode of ['offscreen', 'hidden', 'blur']) {
    const f = boot({data: storageFixture(preferences())}); await f.ready();
    f.click('action-daifuku'); f.step(0); f.advance(350);
    if (mode === 'offscreen') f.visible(false); else if (mode === 'hidden') f.hidden(true); else f.window.dispatch('blur');
    const frozen = f.paint(), elapsed = f.elapsed('daifuku');
    assert.equal(f.pending(), 0); f.advance(60000); assert.deepEqual(f.paint(), frozen);
    if (mode === 'offscreen') f.visible(true); else if (mode === 'hidden') f.hidden(false); else f.window.dispatch('focus');
    f.step(0); assert.deepEqual(f.paint(), frozen); assert.equal(f.elapsed('daifuku'), elapsed);
    f.step(50); assert.ok(Math.abs(f.elapsed('daifuku') - elapsed - .05) < 1e-8);
    f.advance(6500); assert.equal(f.pending(), 0); assert.deepEqual(f.writes, []);
    f.visible(false); f.visible(true); f.hidden(true); f.hidden(false); f.window.dispatch('focus');
    assert.equal(f.pending(), 0, 'environment events must never create a new action');
  }
});

test('furniture pointerdown freezes pets without moving furniture, clearing selection or intercepting drag', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  f.click('action-daifuku'); f.step(0); f.advance(300);
  const furniture = {style: {left: '27%', top: '73%'}, selected: true,
    closest(selector) { assert.equal(selector, '.ss-object,.sr-drag'); return this; }};
  const before = jsonCopy({style: furniture.style, selected: furniture.selected}), raw = f.data.get(KEY);
  f.host.dispatch('pointerdown', {target: furniture,
    preventDefault() { assert.fail('pet controller must not intercept the furniture drag'); },
    stopPropagation() { assert.fail('pet controller must not intercept the furniture drag'); }});
  const frozen = f.paint(); assert.equal(f.pending(), 0);
  f.advance(60000); assert.deepEqual(f.paint(), frozen);
  assert.deepEqual({style: furniture.style, selected: furniture.selected}, before);
  assert.equal(f.data.get(KEY), raw); assert.deepEqual(f.writes, []);
  f.window.dispatch('pointerup'); f.step(0); assert.deepEqual(f.paint(), frozen); assert.equal(f.pending(), 1);
});

test('furniture drag and window blur holds cannot accidentally release each other', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  f.click('action-daifuku'); f.step(0); f.advance(200);
  const furniture = {closest: () => ({})};
  f.host.dispatch('pointerdown', {target: furniture}); f.window.dispatch('blur');
  f.window.dispatch('pointerup'); assert.equal(f.pending(), 0, 'blur must still hold after pointerup');
  f.window.dispatch('focus'); assert.equal(f.pending(), 1);
  f.host.dispatch('pointerdown', {target: furniture}); f.window.dispatch('blur'); f.window.dispatch('focus');
  assert.equal(f.pending(), 0, 'arrangement must still hold after focus');
  f.window.dispatch('pointercancel'); assert.equal(f.pending(), 1);
});

test('selection persists but transient actions do not restart after reload', async () => {
  const f = boot(); await f.ready(); f.click('show-daifuku'); f.click('show-little-man'); f.click('show-daifuku');
  f.click('action-little-man'); f.step(0); f.advance(300);
  const raw = f.data.get(KEY), restored = boot({data: f.data}); await restored.ready();
  assert.equal(restored.pending(), 0); assert.equal(restored.nodes['hit-daifuku'].hidden, true);
  assert.equal(restored.nodes['hit-little-man'].hidden, false); assert.equal(restored.elapsed('little-man'), null);
  assert.equal(restored.data.get(KEY), raw); assert.deepEqual(restored.writes, []);
  assert.deepEqual(restored.saved(), preferences(false, true));
});

test('external pet-setting changes reread only the preview key and leave the room initially static', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready(); f.click('action-daifuku'); f.step(0); f.advance(200);
  const elapsed = f.elapsed('daifuku'), accessCount = f.access.length;
  f.window.dispatch('storage', {key: 'shared-cache'});
  assert.equal(f.access.length, accessCount); assert.equal(f.elapsed('daifuku'), elapsed);
  f.data.set(KEY, JSON.stringify(preferences(false, true, true))); f.window.dispatch('storage', {key: KEY});
  assert.equal(f.pending(), 0); assert.equal(f.nodes['hit-daifuku'].hidden, true); assert.equal(f.nodes.quiet.checked, true);
  assert.equal(f.elapsed('little-man'), null); assert.deepEqual(f.writes, []);
});

test('corrupt or unreadable settings stop safely without replacing any saved bytes', async () => {
  for (const unreadable of [false, true]) {
    const data = storageFixture(); if (!unreadable) data.set(KEY, 'broken JSON');
    const before = [...data], f = boot({data, readFailure: unreadable}); await f.ready();
    assert.equal(f.pending(), 0); assert.match(f.nodes.error.textContent, unreadable ? /SecurityError/ : /上書きせず停止/);
    IDS.forEach(id => { assert.equal(f.nodes['show-' + id].disabled, true); assert.equal(f.nodes['hit-' + id].hidden, true); });
    assert.deepEqual([...data], before); assert.deepEqual(f.writes, []);
  }
});

test('a failed settings write keeps the previous selection usable and reports the failure', async () => {
  const f = boot({data: storageFixture(preferences(true, false)), writeFailure: true}); await f.ready();
  const before = [...f.data]; f.click('show-little-man');
  assert.match(f.nodes.error.textContent, /QuotaExceededError/); assert.deepEqual([...f.data], before);
  assert.equal(f.nodes['hit-little-man'].hidden, true); assert.equal(f.nodes['hit-daifuku'].hidden, false);
  f.click('action-daifuku'); f.step(0); f.advance(6500); assert.equal(f.pending(), 0);
  f.storageErrors.write = false; f.click('show-little-man');
  assert.equal(f.nodes['hit-little-man'].hidden, false); assert.equal(f.nodes.error.textContent, '');
});

test('controller settings and actions never access learning, season, furniture or production keys', async () => {
  const data = storageFixture(), other = [...data], f = boot({data, observers: false}); await f.ready();
  f.click('show-daifuku'); f.click('show-little-man'); f.click('action-daifuku'); f.step(0); f.advance(300);
  f.resize(); f.click('pause'); f.click('pause'); f.quiet(true); f.quiet(false); f.click('show-daifuku'); f.click('undo');
  f.window.dispatch('pagehide'); f.window.dispatch('pageshow');
  assert.ok(f.access.length > 0); assert.ok(f.access.every(([, key]) => key === KEY));
  for (const [key, value] of other) assert.equal(data.get(key), value, key);
  assert.ok(f.writes.every(([key]) => key === KEY));
});

function assertScenePets(f, bird, man) {
  assert.equal(f.paint().some(op => op[0] === 'bird'), bird, 'scene bird drawing');
  assert.equal(f.paint().some(op => op[0] === 'man'), man, 'scene man drawing');
  assert.equal(f.nodes['hit-daifuku'].hidden, !bird);
  assert.equal(f.nodes['hit-little-man'].hidden, !man);
}
function assertLocked(f, id) {
  assert.equal(f.nodes['show-' + id].disabled, true, id + ' selection must remain locked');
  assert.equal(f.nodes['show-' + id].attributes['aria-pressed'], 'false');
  assert.equal(f.nodes['action-' + id].disabled, true);
  assert.equal(f.nodes['hit-' + id].disabled, true);
  assert.equal(f.nodes['hit-' + id].hidden, true);
}
const statusAt = days => ({started: true, collectionDays: days});
const petBackup = state => JSON.stringify({format: 'kokoro-room-pets-backup-v1', state});

test('day 19/20/26/27/40 gates restored selections, scene drawing, hit targets and action entry', async () => {
  for (const [days, bird, man] of [[19, false, false], [20, true, false], [26, true, false], [27, true, true], [40, true, true]]) {
    const data = storageFixture(preferences()), before = [...data];
    const f = boot({data, status: {...statusAt(days), days: 1000}}); await f.ready();
    assertScenePets(f, bird, man); assert.equal(f.pending(), 0); assert.deepEqual([...data], before);
    for (const [id, owned] of [['daifuku', bird], ['little-man', man]]) {
      if (owned) {
        assert.equal(f.nodes['show-' + id].disabled, false);
        assert.equal(f.nodes['action-' + id].disabled, false);
        assert.equal(f.nodes['show-' + id].attributes['aria-pressed'], 'true');
      } else {
        assertLocked(f, id);
        f.forceClick('show-' + id); f.forceClick('action-' + id); f.forceClick('hit-' + id);
        assert.equal(f.pending(), 0); assertScenePets(f, bird, man);
        assert.deepEqual([...data], before, 'locked clicks must not alter saved visibility');
      }
    }
    assert.equal(f.portrait().some(op => op[0] === 'bird'), true, 'catalogue portrait is not reward-gated');
    assert.deepEqual(f.writes, []);
  }
});

test('missing or malformed reward status cannot be replaced by saved visibility or old total days', async () => {
  const statuses = [null, {}, [], {started: false, collectionDays: 40}, {started: true, days: 400},
    {collectionDays: 40}, statusAt('40'), statusAt(-1), statusAt(26.9), statusAt(NaN), statusAt(Infinity)];
  for (const status of statuses) {
    const data = storageFixture(preferences()), raw = data.get(KEY), f = boot({data, status}); await f.ready();
    assertScenePets(f, false, false); IDS.forEach(id => assertLocked(f, id));
    IDS.forEach(id => { f.forceClick('show-' + id); f.forceClick('action-' + id); });
    assert.equal(f.pending(), 0); assert.equal(data.get(KEY), raw); assert.deepEqual(f.writes, []);
    f.rewards(undefined); assertScenePets(f, false, false); assert.equal(f.pending(), 0);
  }
});

test('retroactive unlocks reveal saved selections at rest without writing settings or starting motion', async () => {
  const data = storageFixture(preferences()), raw = data.get(KEY), f = boot({data, status: statusAt(19)}); await f.ready();
  assertScenePets(f, false, false);
  f.rewards(statusAt(20)); assertScenePets(f, true, false); assert.equal(f.elapsed('daifuku'), null); assertLocked(f, 'little-man');
  f.rewards(statusAt(26)); assertScenePets(f, true, false);
  f.rewards(statusAt(27)); assertScenePets(f, true, true); IDS.forEach(id => assert.equal(f.elapsed(id), null));
  f.rewards(statusAt(40)); assertScenePets(f, true, true);
  f.advance(60000); assert.equal(f.pending(), 0); assert.equal(data.get(KEY), raw); assert.deepEqual(f.writes, []);
});

test('reward changes cancel only newly locked actions and never resurrect them after unlock', async () => {
  const data = storageFixture(preferences()), raw = data.get(KEY), f = boot({data}); await f.ready();
  IDS.forEach(id => f.click('action-' + id)); f.step(0); f.advance(300);
  const birdElapsed = f.elapsed('daifuku');
  f.rewards(statusAt(26)); assertScenePets(f, true, false); assertLocked(f, 'little-man');
  assert.equal(f.elapsed('daifuku'), birdElapsed); assert.equal(f.pending(), 1);
  f.step(0); assert.equal(f.elapsed('daifuku'), birdElapsed);
  f.rewards(statusAt(27)); assertScenePets(f, true, true); assert.equal(f.elapsed('little-man'), null);
  f.rewards(statusAt(19)); assertScenePets(f, false, false); assert.equal(f.pending(), 0);
  f.rewards(statusAt(27)); assertScenePets(f, true, true); assert.equal(f.pending(), 0);
  IDS.forEach(id => assert.equal(f.elapsed(id), null));
  assert.equal(data.get(KEY), raw); assert.deepEqual(f.writes, []);
});

test('RAF checks the current reward status before advancing or drawing a now locked pet', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  IDS.forEach(id => f.click('action-' + id)); f.step(0); f.advance(200);
  // Model a status replacement before the corresponding notification is handled.
  f.window.RoomRewardStatus = statusAt(19); f.step(50);
  assertScenePets(f, false, false); assert.equal(f.pending(), 0);
  f.rewards(statusAt(27)); assertScenePets(f, true, true); assert.equal(f.pending(), 0);
  IDS.forEach(id => assert.equal(f.elapsed(id), null)); assert.deepEqual(f.writes, []);
});

test('real import change/FileReader handlers preserve restored visibility without granting locked pets', async () => {
  for (const [days, bird] of [[19, false], [20, true]]) {
    const f = boot({status: statusAt(days)}); await f.ready();
    const originalStatus = jsonCopy(f.window.RoomRewardStatus);
    f.startImport(petBackup(preferences()));
    assert.equal(f.data.has(KEY), false, 'import must wait for FileReader completion');
    await f.finishImport();
    assert.deepEqual(f.saved(), preferences()); assertScenePets(f, bird, false); assert.equal(f.pending(), 0);
    assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], KEY);
    assert.deepEqual(f.window.RoomRewardStatus, originalStatus);
    IDS.filter(id => id !== 'daifuku' || !bird).forEach(id => assertLocked(f, id));
    const restored = boot({data: f.data, status: statusAt(days)}); await restored.ready();
    assertScenePets(restored, bird, false); assert.equal(restored.pending(), 0); assert.deepEqual(restored.writes, []);
    f.click('undo'); assert.deepEqual(f.saved(), preferences(false, false)); assertScenePets(f, false, false);
    assert.deepEqual(f.window.RoomRewardStatus, originalStatus);
  }
});

test('import completion uses current eligibility when reward status changes while the file is loading', async () => {
  const f = boot(); await f.ready();
  f.startImport(petBackup(preferences())); f.rewards(statusAt(19));
  await f.finishImport();
  assert.deepEqual(f.saved(), preferences()); assertScenePets(f, false, false); assert.equal(f.pending(), 0);
  IDS.forEach(id => assertLocked(f, id));
  f.rewards(statusAt(27)); assertScenePets(f, true, true); assert.equal(f.pending(), 0);
  assert.equal(f.writes.length, 1);
});

test('undo can restore visibility preferences below the threshold without rendering or unlocking either pet', async () => {
  const f = boot({data: storageFixture(preferences())}); await f.ready();
  f.click('show-little-man'); assert.equal(f.saved().visible['little-man'], false);
  f.rewards(statusAt(19)); f.click('undo');
  assert.deepEqual(f.saved(), preferences()); assertScenePets(f, false, false); IDS.forEach(id => assertLocked(f, id));
  assert.equal(f.pending(), 0);
  f.rewards(statusAt(27)); assertScenePets(f, true, true); assert.equal(f.pending(), 0);
});

test('manual and OS quiet remain effective as each reward boundary is crossed', async () => {
  for (const mode of ['manual', 'os']) {
    const f = boot({data: storageFixture(preferences(true, true, mode === 'manual')), status: statusAt(19), osReduced: mode === 'os'});
    await f.ready();
    for (const [days, bird, man] of [[19, false, false], [20, true, false], [26, true, false], [27, true, true]]) {
      f.rewards(statusAt(days)); assertScenePets(f, bird, man); assert.equal(f.pending(), 0);
      IDS.forEach(id => { assert.equal(f.nodes['action-' + id].disabled, true); f.forceClick('action-' + id); });
      assert.equal(f.pending(), 0);
    }
    assert.deepEqual(f.writes, []);
    if (mode === 'manual') f.quiet(false); else f.reduced(false);
    assert.equal(f.pending(), 0); IDS.forEach(id => assert.equal(f.nodes['action-' + id].disabled, false));
  }
});
