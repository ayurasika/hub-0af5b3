'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const Actions = require('../pet-actions.js');
const Motion = require('../pet-motion.js');
const Daifuku = require('../daifuku.js');
const IDS = ['daifuku', 'little-man'];
const WIDTHS = [280, 320, 390, 560, 900];
const EPS = 1e-8;
function near(a, b, epsilon = EPS) { assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`); }
function inside(box, width, height, margin) {
  assert.ok(box.left >= margin - EPS, `left clipped: ${box.left}`);
  assert.ok(box.top >= margin - EPS, `top clipped: ${box.top}`);
  assert.ok(box.right <= width - margin + EPS, `right clipped: ${box.right}`);
  assert.ok(box.bottom <= height - margin + EPS, `bottom clipped: ${box.bottom}`);
}
function contains(outer, inner) {
  assert.ok(outer.left <= inner.left + EPS);
  assert.ok(outer.top <= inner.top + EPS);
  assert.ok(outer.right >= inner.right - EPS);
  assert.ok(outer.bottom >= inner.bottom - EPS);
}
function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}
function samePose(a, b, epsilon = EPS) {
  for (const key of ['x', 'y', 'size', 'scaleX', 'scaleY', 'rotation', 'lift']) {
    if (key in a) near(a[key], b[key], epsilon);
  }
}
function geometryCanvas() {
  let matrix = [1, 0, 0, 1, 0, 0], stack = [], rectangles = [];
  return {
    globalAlpha: 1,
    reset() { matrix = [1, 0, 0, 1, 0, 0]; stack = []; rectangles = []; this.globalAlpha = 1; },
    save() { stack.push([matrix.slice(), this.globalAlpha]); },
    restore() { [matrix, this.globalAlpha] = stack.pop(); },
    translate(x, y) { const [a, b, c, d] = matrix; matrix[4] += a*x+c*y; matrix[5] += b*x+d*y; },
    scale(x, y) { matrix[0] *= x; matrix[1] *= x; matrix[2] *= y; matrix[3] *= y; },
    rotate(angle) {
      const [a, b, c, d] = matrix, cos = Math.cos(angle), sin = Math.sin(angle);
      matrix[0] = a*cos+c*sin; matrix[1] = b*cos+d*sin;
      matrix[2] = c*cos-a*sin; matrix[3] = d*cos-b*sin;
    },
    drawImage(_image, ...args) {
      const [x, y, width, height] = args.slice(-4);
      const [a, b, c, d, e, f] = matrix;
      const points = [[x,y], [x+width,y], [x,y+height], [x+width,y+height]];
      const xs = points.map(([px,py]) => a*px+c*py+e);
      const ys = points.map(([px,py]) => b*px+d*py+f);
      rectangles.push({left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys)});
    },
    get rectangles() { return rectangles; }
  };
}

test('browser UMD is pure and exposes exactly one finite action per input', () => {
  const context = { window: {} }; // No DOM, storage, timers, or network globals.
  for (const filename of ['pet-motion.js', 'pet-actions.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'), context);
  }
  assert.equal(context.window.RoomPetActions.duration('daifuku'), 6);
  near(context.window.RoomPetActions.duration('little-man'), 2.49);
  assert.equal(context.window.RoomPetActions.stopCount, 4);
  assert.equal(context.window.RoomPetActions.sample('little-man', 0, null, 390, 260).phase, 'rest');
});

test('all four idle stops are natural rests and actions start without a position or squash jump', () => {
  for (const id of IDS) for (let stop = 0; stop < 4; stop++) {
    const idle = Actions.sample(id, stop, null, 390, 260);
    const start = Actions.sample(id, stop, 0, 390, 260);
    const next = Actions.sample(id, stop, 1e-7, 390, 260);
    assert.equal(idle.phase, 'rest'); assert.equal(idle.active, false); assert.equal(idle.done, false);
    assert.equal(start.active, true); assert.equal(start.done, false);
    samePose(idle, start); samePose(start, next, 0.001);
    if (id === 'little-man') {
      near(idle.scaleX, 1); near(idle.scaleY, 1); near(idle.rotation, 0);
      near(idle.time, ((stop + 3) % 4) * 2.49 + 1.4);
      near(start.time, stop * 2.49);
    } else {
      assert.equal(start.phase, 'flight'); near(start.time, stop * 10 + 4);
      const flying = Actions.sample(id, stop, 0.05, 390, 260);
      assert.ok(flying.flight > 0);
      assert.ok(Daifuku.sampleFlight(flying.time, flying.flight, flying.heading).wing > 0);
    }
  }
});

test('completion advances one stop, holds indefinitely, and does not schedule another trip', () => {
  for (const id of IDS) for (let stop = 0; stop < 4; stop++) {
    const duration = Actions.duration(id), nextStop = (stop + 1) % 4;
    const before = Actions.sample(id, stop, duration - 1e-7, 560, 560 * 2 / 3);
    const end = Actions.sample(id, stop, duration, 560, 560 * 2 / 3);
    const idle = Actions.sample(id, nextStop, null, 560, 560 * 2 / 3);
    assert.equal(end.done, true); assert.equal(end.active, false); assert.equal(end.stop, nextStop);
    assert.equal(end.fromStop, stop); assert.equal(end.nextStop, nextStop); assert.equal(end.phase, 'rest');
    samePose(before, end, 0.001); samePose(end, idle);
    if (id === 'daifuku') {
      // Flight progress wraps from 1 to 0 at rest; the visible wing opacity,
      // body tilt, and lift all approach zero on both sides of that boundary.
      const a = Daifuku.sampleFlight(before.time, before.flight, before.heading);
      const b = Daifuku.sampleFlight(end.time, end.flight, end.heading);
      for (const key of ['wing', 'tilt', 'lift']) near(a[key], b[key], 0.001);
      near(end.flight, 0);
    }
    for (const elapsed of [duration + 0.001, duration * 8, 100000000]) {
      assert.deepEqual(Actions.sample(id, stop, elapsed, 560, 560 * 2 / 3), end);
    }
    const second = Actions.sample(id, nextStop, 0, 560, 560 * 2 / 3);
    samePose(idle, second); // A second action only occurs when the caller starts it.
  }
});

test('crouch, launch, landing, and rest boundaries stay continuous at every stop', () => {
  const t = Motion.timing;
  for (let stop = 0; stop < 4; stop++) {
    for (const edge of [t.crouch, t.crouch + t.jump, t.crouch + t.jump + t.land, t.manStep]) {
      const before = Actions.sample('little-man', stop, edge - 1e-7, 900, 600);
      const after = Actions.sample('little-man', stop, edge + 1e-7, 900, 600);
      samePose(before, after, 0.001);
    }
  }
});

test('finite poses keep both independent action lanes safe at phone and PC widths', () => {
  for (const width of WIDTHS) {
    const height = width * 2 / 3;
    for (const id of IDS) for (let stop = 0; stop < 4; stop++) {
      const duration = Actions.duration(id);
      for (let frame = 0; frame <= Math.ceil(duration * 120); frame++) {
        const pose = Actions.sample(id, stop, frame / 120, width, height);
        finiteTree(pose); inside(pose.bounds, width, height, pose.viewport.margin);
        if (id === 'daifuku') {
          const e = Daifuku.safeExtent;
          contains(pose.bounds, {left: pose.x-pose.size*e.left, right: pose.x+pose.size*e.right,
            top: pose.y-pose.size*e.top, bottom: pose.y+pose.size*e.bottom});
          assert.ok(pose.bounds.bottom <= pose.lanes.birdBottom + EPS);
        } else assert.ok(pose.bounds.top >= pose.lanes.manTop - EPS);
        assert.ok(pose.lanes.birdBottom + pose.separation <= pose.lanes.manTop + EPS);
      }
    }
  }
});

test('actual unchanged Daifuku draw rectangles and contained man image fit their safe envelopes', async () => {
  const context = { window: {}, URL, document: {baseURI: 'file:///inert-fixture/index.html'},
    Image: class {
      constructor() { this.naturalWidth = 1536; this.naturalHeight = 1024; }
      set src(_value) { this.onload(); } // No real resource access; record only geometry.
    } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../daifuku.js'), 'utf8'), context);
  const renderer = context.window.Daifuku;
  assert.equal(await renderer.load('inert-geometry-fixture.png'), true);
  const man = fs.readFileSync(path.join(__dirname, '../assets/pet-little-man.png'));
  const naturalWidth = man.readUInt32BE(16), naturalHeight = man.readUInt32BE(20);
  const ctx = geometryCanvas(), headings = new Set();
  let wingRectangles = 0;
  for (const width of WIDTHS) {
    const height = width * 2 / 3;
    for (let stop = 0; stop < 4; stop++) {
      for (let frame = 0; frame <= 720; frame++) {
        const bird = Actions.sample('daifuku', stop, frame / 120, width, height);
        ctx.reset(); assert.equal(renderer.draw(ctx, bird), true);
        headings.add(bird.heading); wingRectangles += ctx.rectangles.length - 1;
        for (const box of ctx.rectangles) {
          contains(bird.bounds, box); inside(box, width, height, bird.viewport.margin);
          assert.ok(box.bottom + bird.separation <= bird.lanes.manTop + EPS);
        }
        const pose = Actions.sample('little-man', stop, frame / 120, width, height);
        const scale = pose.size / Math.max(naturalWidth, naturalHeight);
        const w = naturalWidth * scale, h = naturalHeight * scale;
        ctx.reset(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.rotation);
        ctx.scale(pose.scaleX, pose.scaleY); ctx.drawImage(null, -w / 2, -h / 2, w, h);
        contains(pose.bounds, ctx.rectangles[0]); inside(ctx.rectangles[0], width, height, pose.viewport.margin);
        assert.ok(ctx.rectangles[0].top >= pose.lanes.birdBottom + pose.separation - EPS);
      }
    }
  }
  assert.equal(headings.size, 2); assert.ok(wingRectangles > 28000);
});

test('PNG copies retain the original bytes and approved hashes', () => {
  const expected = {
    'coordinator-budgie-atlas-v2.png': '7338d970f9486e95e542b2278445b8d08ad056ebd5f2f155e27f5e89900a560d',
    'pet-little-man.png': '843deb0d22e31cbf2d938b48e829bb755c9ebf7bd73203a86e8a0cbc28f64341'
  };
  for (const [filename, hash] of Object.entries(expected)) {
    const data = fs.readFileSync(path.join(__dirname, '../assets', filename));
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), hash);
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    if (filename.startsWith('coordinator')) {
      assert.equal(data.length, 1468016);
      assert.equal(data.readUInt32BE(16), 1536); assert.equal(data.readUInt32BE(20), 1024);
      assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex'),
        'd5006060c81103be17b78c1328523dfc273ffedd');
    }
  }
});

test('invalid ids, stops, dimensions, and clocks fail instead of creating non-finite coordinates', () => {
  for (const id of ['', 'bird', '__proto__', 'constructor']) assert.throws(() => Actions.duration(id), RangeError);
  for (const stop of [-1, 4, 0.5, NaN, Infinity]) assert.throws(() => Actions.sample('daifuku', stop, null, 390, 260), RangeError);
  for (const elapsed of [undefined, NaN, Infinity, -Infinity, '0']) assert.throws(() => Actions.sample('little-man', 0, elapsed, 390, 260), RangeError);
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => Actions.sample('daifuku', 0, null, value, 260), RangeError);
    assert.throws(() => Actions.sample('daifuku', 0, null, 390, value), RangeError);
  }
  assert.deepEqual(Actions.sample('daifuku', 0, -1, 390, 260), Actions.sample('daifuku', 0, 0, 390, 260));
});
