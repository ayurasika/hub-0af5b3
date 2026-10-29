(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PetMotion = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var BIRD_REST = 4, BIRD_TRAVEL = 6;
  // Covers Daifuku.safeExtent (.51 left/right, .49 top, .32 bottom).
  var BIRD_HALF_EXTENT = 0.51;
  var CROUCH = 0.18, JUMP = 1.05, LAND = 0.16, REST = 1.1;
  var MAN_STEP = CROUCH + JUMP + LAND + REST;
  var BIRD_STOPS = [[0.22, 0.37], [0.76, 0.43], [0.60, 0.39], [0.28, 0.41]];
  var MAN_STOPS = [0.20, 0.68, 0.82, 0.36];

  function clamp(x, min, max) { return Math.max(min, Math.min(max, x)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smootherstep(x) {
    x = clamp(x, 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  }
  function dimensions(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new RangeError('Pet preview dimensions must be finite positive numbers.');
    }
    // The bird's square includes its full rotated wings and safety allowance.
    // The man renderer must contain its natural aspect ratio in its size square.
    var margin = Math.min(14, Math.max(6, width * 0.025), width * 0.05, height * 0.05);
    var gap = Math.min(Math.max(6, width * 0.012), height * 0.04);
    var manSize = Math.min(clamp(width * 0.115, 44, 76), width * 0.22, height * 0.24);
    var ground = height - margin;
    var jumpHeight = Math.min(75, height * 0.15);
    var maxManHalfY = manSize * 0.5 * (1.05 + 1.12 * Math.sin(0.10));
    var minManTop = ground - manSize * 0.525 - jumpHeight - maxManHalfY;
    var desiredBirdSize = Math.min(clamp(width * 0.20, 72, 140), width * 0.40);
    // Very short canvases also get a smaller bird instead of clipping its wings.
    var birdSize = Math.max(1, Math.min(desiredBirdSize, (minManTop - gap - margin) / (2 * BIRD_HALF_EXTENT)));
    var birdHalf = birdSize * BIRD_HALF_EXTENT;
    var minBirdBase = birdHalf + margin;
    var maxBirdBase = Math.max(minBirdBase, Math.min(height * 0.45, minManTop - gap - birdHalf));
    var birdStops = BIRD_STOPS.map(function (point) {
      return {
        x: clamp(width * point[0], birdHalf + margin, width - birdHalf - margin),
        y: clamp(height * point[1], minBirdBase, maxBirdBase)
      };
    });
    var lowestBirdBase = Math.min.apply(null, birdStops.map(function (p) { return p.y; }));
    var birdLift = Math.max(0, Math.min(100, height * 0.17, lowestBirdBase - birdHalf - margin));
    var maxManHalfX = manSize * 0.5 * (1.12 + 1.05 * Math.sin(0.10));
    var manStops = MAN_STOPS.map(function (fraction) {
      return clamp(width * fraction, maxManHalfX + margin, width - maxManHalfX - margin);
    });
    return {
      width: width, height: height, margin: margin, gap: gap,
      birdSize: birdSize, birdLift: birdLift, birdStops: birdStops,
      manSize: manSize, ground: ground, jumpHeight: jumpHeight, manStops: manStops,
      lanes: { birdBottom: maxBirdBase + birdHalf, manTop: minManTop }
    };
  }
  function squareBounds(x, y, size, sx, sy, angle) {
    var c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
    var halfX = size * 0.5 * (sx * c + sy * s);
    var halfY = size * 0.5 * (sy * c + sx * s);
    return { left: x - halfX, top: y - halfY, right: x + halfX, bottom: y + halfY };
  }
  function birdAt(time, g) {
    var segment = BIRD_REST + BIRD_TRAVEL;
    var cycle = segment * g.birdStops.length;
    var t = time % cycle;
    var index = Math.floor(t / segment);
    var local = t - index * segment;
    var from = g.birdStops[index], to = g.birdStops[(index + 1) % g.birdStops.length];
    var flying = local >= BIRD_REST;
    var u = flying ? clamp((local - BIRD_REST) / BIRD_TRAVEL, 0, 1) : 0;
    var eased = smootherstep(u);
    var x = mix(from.x, to.x, eased);
    var y = mix(from.y, to.y, eased) - Math.pow(Math.sin(Math.PI * u), 2) * g.birdLift;
    return {
      x: x, y: y, size: g.birdSize, flight: u,
      heading: to.x >= from.x ? 1 : -1,
      phase: flying ? 'flight' : 'rest', phaseProgress: flying ? u : local / BIRD_REST,
      bounds: squareBounds(x, y, g.birdSize * 2 * BIRD_HALF_EXTENT, 1, 1, 0)
    };
  }
  function manAt(time, g) {
    var t = time % (MAN_STEP * g.manStops.length);
    var index = Math.floor(t / MAN_STEP);
    var local = t - index * MAN_STEP;
    var from = g.manStops[index], to = g.manStops[(index + 1) % g.manStops.length];
    var heading = to >= from ? 1 : -1;
    var phase, u, x = from, sx = 1, sy = 1, rotation = 0, lift = 0;
    if (local < CROUCH) {
      phase = 'crouch'; u = local / CROUCH;
      var crouch = smootherstep(u);
      sx = 1 + 0.12 * crouch; sy = 1 - 0.24 * crouch;
    } else if (local < CROUCH + JUMP) {
      phase = 'jump'; u = (local - CROUCH) / JUMP;
      x = mix(from, to, u);
      lift = 4 * u * (1 - u) * g.jumpHeight;
      var launch = 1 - smootherstep(u / 0.12);
      var arc = Math.sin(Math.PI * u);
      sx = 1 + 0.12 * launch - 0.03 * arc;
      sy = 1 - 0.24 * launch + 0.05 * arc;
      rotation = heading * 0.10 * arc;
    } else if (local < CROUCH + JUMP + LAND) {
      phase = 'land'; u = (local - CROUCH - JUMP) / LAND;
      x = to;
      var landing = Math.sin(Math.PI * u);
      sx = 1 + 0.12 * landing; sy = 1 - 0.24 * landing;
    } else {
      phase = 'rest'; u = (local - CROUCH - JUMP - LAND) / REST;
      x = to;
    }
    // Scaling around the center keeps the feet on the same floor during squash.
    var y = g.ground - g.manSize * sy / 2 - lift;
    return {
      x: x, y: y, size: g.manSize, scaleX: sx, scaleY: sy,
      rotation: rotation, heading: heading, phase: phase, phaseProgress: clamp(u, 0, 1),
      lift: lift, groundY: g.ground,
      bounds: squareBounds(x, y, g.manSize, sx, sy, rotation)
    };
  }
  function sample(time, width, height) {
    if (!Number.isFinite(time)) throw new RangeError('Pet preview time must be finite.');
    time = Math.max(0, time);
    var g = dimensions(width, height);
    return {
      time: time, bird: birdAt(time, g), man: manAt(time, g),
      viewport: { width: width, height: height, margin: g.margin },
      lanes: g.lanes, separation: g.gap
    };
  }
  return {
    sample: sample, smootherstep: smootherstep,
    timing: {
      birdRest: BIRD_REST, birdTravel: BIRD_TRAVEL, birdCycle: (BIRD_REST + BIRD_TRAVEL) * BIRD_STOPS.length,
      crouch: CROUCH, jump: JUMP, land: LAND, rest: REST,
      manStep: MAN_STEP, manCycle: MAN_STEP * MAN_STOPS.length
    }
  };
});
