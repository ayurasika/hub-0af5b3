/* One finite action around the approved preview motion, with no timers or storage.
 * Browser order: pet-motion.js, then pet-actions.js.
 * duration(id) returns seconds. sample(id, stop, elapsedOrNull, width, height)
 * returns the selected pose directly; pass its time/flight/heading to Daifuku.draw.
 * null holds stop 0..3 naturally. A finite elapsed time performs exactly one trip.
 * At done=true, persist the returned stop and sample that stop with null to hold.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./pet-motion.js'));
  else if (typeof define === 'function' && define.amd) define(['./pet-motion'], factory);
  else root.RoomPetActions = factory(root.PetMotion);
})(typeof window !== 'undefined' ? window : this, function (Motion) {
  'use strict';
  if (!Motion || typeof Motion.sample !== 'function') throw new Error('PetMotion must load before RoomPetActions.');
  var STOP_COUNT = 4;
  var BIRD_SEGMENT = Motion.timing.birdRest + Motion.timing.birdTravel;
  var MAN_SEGMENT = Motion.timing.manStep;
  var MAN_REST_POSE = 1.4; // After 0.18 crouch + 1.05 jump + 0.16 landing.
  var durations = Object.freeze({ daifuku: Motion.timing.birdTravel, 'little-man': MAN_SEGMENT });

  function duration(id) {
    if (!Object.prototype.hasOwnProperty.call(durations, id)) throw new RangeError('Unknown room pet id.');
    return durations[id];
  }
  function idleTime(id, stop) {
    return id === 'daifuku' ? stop * BIRD_SEGMENT
      : ((stop + STOP_COUNT - 1) % STOP_COUNT) * MAN_SEGMENT + MAN_REST_POSE;
  }
  function sample(id, stop, elapsedOrNull, width, height) {
    var seconds = duration(id);
    if (!Number.isInteger(stop) || stop < 0 || stop >= STOP_COUNT) throw new RangeError('Room pet stop must be an integer from 0 to 3.');
    if (elapsedOrNull !== null && !Number.isFinite(elapsedOrNull)) throw new RangeError('Elapsed time must be finite seconds or null.');
    var elapsed = elapsedOrNull === null ? null : Math.max(0, Math.min(elapsedOrNull, seconds));
    var done = elapsed !== null && elapsed >= seconds;
    var active = elapsed !== null && !done;
    var nextStop = (stop + 1) % STOP_COUNT;
    var heldStop = done ? nextStop : stop;
    var time = active
      ? (id === 'daifuku' ? stop * BIRD_SEGMENT + Motion.timing.birdRest : stop * MAN_SEGMENT) + elapsed
      : idleTime(id, heldStop);
    var state = Motion.sample(time, width, height);
    var pose = state[id === 'daifuku' ? 'bird' : 'man'];
    return Object.assign({}, pose, {
      id: id, stop: heldStop, fromStop: stop, nextStop: nextStop,
      elapsed: elapsed, duration: seconds, active: active, done: done, time: time,
      viewport: state.viewport, lanes: state.lanes, separation: state.separation
    });
  }
  return Object.freeze({ duration: duration, durations: durations, sample: sample, stopCount: STOP_COUNT });
});
