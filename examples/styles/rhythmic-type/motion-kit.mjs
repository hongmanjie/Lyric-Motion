// Original deterministic building blocks. Compose new scenes; this is not a finished MV.
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const easeOut = t => 1 - (1 - clamp(t)) ** 4;
export const hash = n => {const v = Math.sin(n * 72.335 + 8.924) * 43758.554; return v - Math.floor(v);};

/** A damped response, evaluated from elapsed time, never accumulated across frames. */
export function settle(age, {duration = .32, overshoot = .09} = {}) {
  if (age <= 0) return 0;
  const p = clamp(age / duration);
  return p === 1 ? 1 : easeOut(p) + Math.sin(p * Math.PI * 2) * Math.exp(-p * 5) * overshoot;
}

/** Reposition existing words while the next word enters. Coordinates and sizes are authored. */
export function layoutAt(previous, next, age, duration = .22) {
  const p = settle(age, {duration});
  return next.map((pose, i) => {
    const from = previous[i] || {...pose, x: pose.x + (i % 2 ? 300 : -300), y: pose.y - 180, size: pose.size * .5, alpha: 0};
    return Object.fromEntries(Object.entries(pose).map(([key, value]) => [key, typeof value === 'number' ? mix(from[key] ?? value, value, p) : value]));
  });
}

/** Sample a semantic handoff path: object, letter, gaze, or motion direction. */
export function cubicPoint(points, progress) {
  const p = clamp(progress), q = 1 - p;
  return [0, 1].map(axis => q ** 3 * points[0][axis] + 3 * q * q * p * points[1][axis] + 3 * q * p * p * points[2][axis] + p ** 3 * points[3][axis]);
}

export function drawRibbon(ctx, {points, color, width = 8, progress = 1, dash = [], alpha = 1}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash); ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const point = cubicPoint(points, i / 80 * clamp(progress));
    i ? ctx.lineTo(...point) : ctx.moveTo(...point);
  }
  ctx.stroke(); ctx.restore();
}

export function drawBurst(ctx, {time, at, x, y, color, secondary = color, seed = 1, count = 32, duration = .65, radius = 350}) {
  const age = time - at; if (age < 0 || age >= duration) return;
  const p = age / duration;
  ctx.save(); ctx.globalAlpha *= (1 - p) ** 1.5;
  for (let i = 0; i < count; i++) {
    const a = hash(seed + i * 3) * Math.PI * 2, distance = radius * (.3 + hash(seed + i)) * easeOut(p);
    ctx.save(); ctx.translate(x + Math.cos(a) * distance, y + Math.sin(a) * distance * .8);
    ctx.rotate(a + p); ctx.fillStyle = i % 4 ? color : secondary;
    ctx.fillRect(-3, -2, 7 + hash(i + 57) * 20, 4 + hash(i + 8) * 5); ctx.restore();
  }
  ctx.restore();
}

/** Controlled secondary echoes, with an exclusion zone around the focal word. */
export function drawEchoes(ctx, {text, time, color, width = 1920, height = 920, font = '900 76px sans-serif', alpha = .07, angle = -.09, focus = [320, 190, 1280, 600]}) {
  ctx.save(); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.globalAlpha *= alpha;
  const drift = time * 19 % 420;
  for (let row = 0; row < 6; row++) for (let column = -1; column < 6; column++) {
    const x = column * 420 + (row % 2) * 160 + drift, y = row * 182 + 30;
    if (x > focus[0] && x < focus[0] + focus[2] && y > focus[1] && y < focus[1] + focus[3]) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.strokeText(text, 0, 0); ctx.restore();
  }
  ctx.restore();
}

/** Estimated acoustic events, not a generated musical beat grid. */
export function acousticPulse(features, time, decay = 22) {
  const events = features.onsets || []; let lo = 0, hi = events.length;
  while (lo < hi) {const mid = lo + hi >>> 1; events[mid].time <= time ? lo = mid + 1 : hi = mid;}
  let value = 0;
  for (let i = lo - 1; i >= 0 && time - events[i].time < .35; i--) value = Math.max(value, events[i].strength * Math.exp(-(time - events[i].time) * decay));
  return value;
}

export function energyAt(features, time) {
  const values = features.rms || [], step = features.step || .01;
  if (!values.length) return 0;
  const i = clamp((time - (features.windowCenterOffset || 0)) / step, 0, values.length - 1), a = Math.floor(i);
  return mix(values[a], values[Math.min(a + 1, values.length - 1)], i - a);
}
