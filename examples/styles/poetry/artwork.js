import { loadFonts, clamp, lerp, ease, smooth, segment, cueAt, camera, fitText, drawSubtitles, beat } from '../shared.mjs';

export const readyToRender = true;
export let cuts = [];

const C = { paper: '#f0e7d6', white: '#fff9ed', ink: '#2d3130', plum: '#84677a', red: '#ad4d43', gold: '#d0aa69', night: '#272731', moon: '#d68b79' };
const TAU = Math.PI * 2;
const random = n => { const x = Math.sin(n * 74.319 + 19.473) * 43758.5453; return x - Math.floor(x); };
const mod = (n, d) => ((n % d) + d) % d;
const latin = text => /^[\x20-\x7e]+$/.test(text);
const textOf = line => String(line?.text || line?.jp || '');

function trace(ctx, points, color, width = 2, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(...points[i], (points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2);
  ctx.quadraticCurveTo(...points.at(-2), ...points.at(-1)); ctx.stroke(); ctx.restore();
}

function page(ctx, x, y, width, height, angle, alpha = 1, color = C.white) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.shadowColor = '#30252a24'; ctx.shadowBlur = 23; ctx.shadowOffsetY = 8;
  const wash = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  wash.addColorStop(0, C.white); wash.addColorStop(.7, color); wash.addColorStop(1, '#cfc0ac');
  ctx.fillStyle = wash; ctx.beginPath(); ctx.moveTo(-width / 2, -height / 2); ctx.lineTo(width / 2, -height / 2 + 3);
  ctx.lineTo(width / 2 - 3, height / 2); ctx.lineTo(-width / 2 + 2, height / 2 - 4); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#7d675b22'; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
}

function interpolatePoints(from, to, p) {
  return from.map(([x, y], i) => [lerp(x, to[i][0], p), lerp(y, to[i][1], p)]);
}

// The carrier changes role: pressure contour -> opening edge -> descent -> grasp.
const THREAD = {
  pressure: [[-100, 630], [325, 185], [800, 80], [1510, 170], [1775, 580], [1190, 835], [400, 760]],
  open: [[-100, 630], [300, 600], [730, 165], [1210, 90], [1760, 300], [1480, 760], [400, 760]],
  fall: [[-100, 200], [600, 50], [1450, 180], [1560, 530], [1200, 850], [890, 640], [960, 1000]],
  reach: [[-100, 760], [340, 720], [490, 280], [1000, 125], [1510, 330], [1515, 775], [960, 810]],
};

function onset(line, cue, unitIndex, ascii) {
  if (ascii || !line.tokens?.length) return cue.start;
  const position = textOf(line).indexOf(cue.text);
  if (position < 0) return cue.start;
  let length = 0;
  for (const token of line.tokens) {
    if (length >= position + unitIndex) return token.start;
    length += [...String(token.text)].length;
  }
  return cue.start;
}

export async function createArtwork({ ctx, project, timeline }) {
  const fonts = await loadFonts(project);
  cuts = [...new Set([0, project.duration, ...timeline.lines.flatMap(line => [line.start, ...(line.cues || []).flatMap(cue => [cue.start, ...(cue.end - cue.start > 1.35 ? [cue.start + .78] : [])])])])].filter(t => t >= 0 && t <= project.duration).sort((a, b) => a - b);
  const grain = document.createElement('canvas'); grain.width = 480; grain.height = 270;
  const gc = grain.getContext('2d');
  for (let i = 0; i < 1400; i++) { gc.fillStyle = `rgba(69,47,35,${.025 + random(i) * .045})`; gc.fillRect(random(i * 2 + 1) * 480, random(i * 2 + 2) * 270, .35 + random(i + 3), .6 + random(i + 4)); }
  const paperGrain = ctx.createPattern(grain, 'repeat');

  function type(value, x, y, size, width, { color = C.ink, alpha = 1, angle = 0, weight = 450, align = 'center' } = {}) {
    fitText(ctx, value, x, y, size, width, { font: fonts.serif, weight, color, alpha, angle, align, baseline: 'middle' });
  }

  function livingText(t, line, cue, x, y, size, maxWidth, { color = C.ink, mode = 'slide', release = 0, angle = 0, spread = 1 } = {}) {
    const text = String(cue.text || line.focus || textOf(line)), ascii = latin(text), units = ascii ? text.trim().split(/\s+/) : [...text];
    ctx.save(); ctx.font = `500 ${size}px ${fonts.serif}`;
    const space = ascii ? ctx.measureText(' ').width : 0;
    const widths = units.map(value => ctx.measureText(value).width);
    const natural = widths.reduce((sum, width) => sum + width, 0) + space * Math.max(0, units.length - 1);
    const scale = Math.min(1, maxWidth / Math.max(1, natural));
    ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, 1);
    let cursor = -natural / 2;
    units.forEach((unit, i) => {
      const p = ease(clamp((t - onset(line, cue, i, ascii) + .055) / .2));
      const centered = cursor + widths[i] / 2;
      let dx = (1 - p) * (i % 2 ? 100 : -100), dy = (1 - p) * 44, rotation = (1 - p) * (i % 2 ? .06 : -.06);
      if (mode === 'burst') { dx = (1 - p) * (centered * .55); dy = (1 - p) * (i % 2 ? 145 : -145); }
      if (mode === 'fall') { dy = -(1 - p) * 145 + release * release * (140 + i * 34); dx += release * (i - units.length / 2) * 17; rotation += release * (i % 2 ? .06 : -.06); }
      if (mode === 'gather') { dx = (1 - p) * (i < units.length / 2 ? -380 : 380); dy = (1 - p) * (i % 2 ? 90 : -90); }
      ctx.save(); ctx.translate(centered * spread + dx, dy); ctx.rotate(rotation); ctx.globalAlpha *= .27 + p * .73;
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(unit, 0, 0); ctx.restore();
      cursor += widths[i] + space;
    });
    ctx.restore();
  }

  function carrier(t, data, action) {
    const previous = timeline.lines[data.index - 1]?.action || action;
    const before = THREAD[previous] || THREAD.pressure, after = THREAD[action] || THREAD.open;
    const points = interpolatePoints(before, after, ease(clamp((data.local + .015) / .29)));
    const q = (t - data.line.start) / Math.max(.1, data.line.end - data.line.start);
    const animated = points.map(([x, y], i) => [x + Math.sin(q * 3.4 + i * .8) * (18 + beat(t, timeline) * 6), y + Math.cos(q * 4 + i * .7) * 23]);
    trace(ctx, animated, action === 'fall' ? C.moon : C.red, 34, action === 'fall' ? .07 : .055);
    trace(ctx, animated, action === 'fall' ? C.moon : C.red, 1.7, .64);
  }

  function pressure(t, data, q) {
    const { line } = data, { cue, index, local, progress } = q;
    const release = index >= 3 ? ease(progress) : 0;
    const fragments = line.cues?.map(value => value.text).filter(Boolean) || [line.focus || textOf(line)];
    for (let i = 0; i < 18; i++) {
      const row = i % 5, direction = i % 2 ? -1 : 1;
      const x = mod(random(i + 12) * 2300 + t * direction * (75 + i * 8), 2500) - 270;
      type(fragments[i % fragments.length], x, 130 + row * 153 + Math.sin(t * 2 + i) * 10, 50 + random(i + 3) * 68, 590,
        { color: i % 4 ? C.ink : C.red, alpha: (.035 + random(i) * .11) * (1 - release * .9), angle: (random(i + 9) - .5) * .2 });
    }
    const arrive = ease(clamp((local + .025) / .2));
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1, distance = lerp(980, 480 + (i % 3) * 35, arrive) + release * 600;
      page(ctx, 960 + side * distance, 210 + (i % 4) * 155, 365, 73, side * (.07 + i * .025), .39 * (1 - release * .75), i % 3 ? C.white : '#ead2c6');
    }
    const anchors = [[720, 335], [1220, 400], [760, 600], [1105, 445]], at = anchors[index % anchors.length];
    if (index === 2) {
      trace(ctx, [[390, 235], [650, 204], [940, 235]], C.ink, 3.2, .45);
      trace(ctx, [[400, 254], [650, 225], [930, 250]], C.plum, 1, .3);
    }
    livingText(t, line, cue, at[0] - (1 - arrive) * 170, at[1], index >= 3 ? 294 : index === 1 ? 220 : 188, index >= 3 ? 920 : 1290,
      { color: index === 1 ? C.red : C.ink, mode: index === 2 ? 'gather' : 'slide', spread: index === 2 ? lerp(1.3, 1, arrive) : 1 });
    if (index >= 3) trace(ctx, [[at[0] - 225, 625], [at[0], 645], [at[0] + 230, 625]], C.red, 1.5, .6);
  }

  function opening(t, data, q) {
    const { line } = data, { cue, index, local, progress } = q, p = ease(clamp((local + .025) / .28));
    const sweep = index === 0 ? p : 1, center = index === 0 ? 735 : index === 1 ? 1120 : 1050;
    const gap = lerp(25, index === 1 ? 850 : 540, sweep);
    page(ctx, center - gap * .62, 465, 660, 660, -.15 * sweep - .025, .72, '#efe3c8');
    page(ctx, center + gap * .62, 455, 660, 660, .12 * sweep + .018, .7, '#f4e5cc');
    const glow = ctx.createRadialGradient(center, 435, 5, center, 435, index === 1 ? 650 : 390);
    glow.addColorStop(0, '#fff9dbe6'); glow.addColorStop(.48, '#edc98455'); glow.addColorStop(1, '#edc98400');
    ctx.fillStyle = glow; ctx.fillRect(-150, -120, 2250, 1200);
    if (index === 0) {
      const turn = progress > .48 ? ease(clamp((progress - .48) / .18)) : 0;
      livingText(t, line, cue, lerp(750, 1160, turn), lerp(315, 540, turn), 153, 1280, { color: C.ink, angle: lerp(-.045, .018, turn) });
      trace(ctx, [[160, 735], [460, 705], [820, 335], [1550, 175]], C.red, 1.7, .65);
    } else if (index === 1) {
      for (let i = 0; i < 11; i++) {
        const angle = i / 11 * TAU + .18, radius = 130 + p * 370;
        page(ctx, 1120 + Math.cos(angle) * radius, 450 + Math.sin(angle) * radius * .64, 145, 17 + i % 3 * 7, angle + .3, .24 * (1 - progress * .4), '#f6dfbe');
      }
      livingText(t, line, cue, 1090, 445, 289, 1340, { color: C.red, mode: 'burst' });
    } else {
      const edge = interpolatePoints([[380, 190], [410, 640], [1100, 820], [1580, 560]], [[200, 655], [640, 645], [1220, 630], [1760, 640]], ease(progress));
      trace(ctx, edge, C.red, 2, .63);
      livingText(t, line, cue, 1115, 390 - (1 - p) * 95, 251, 1260, { color: C.ink, mode: 'burst' });
      type(line.focus || '', 480, 715, 62, 700, { color: C.plum, alpha: .5, align: 'left' });
    }
  }

  function falling(t, data, q) {
    const { line } = data, { cue, index, local, progress } = q;
    for (let i = 7; i >= 0; i--) {
      const scale = 1 / (1 + i * .36), angle = -.11 + i * .105 + data.local * .15;
      ctx.save(); ctx.translate(1110, 460); ctx.rotate(angle); ctx.scale(scale, scale);
      ctx.strokeStyle = i % 2 ? '#d8bbb0' : C.moon; ctx.globalAlpha = .08 + i * .015; ctx.lineWidth = 1.2 / scale;
      ctx.strokeRect(-710, -455, 1420, 910); ctx.restore();
    }
    const drift = mod(data.local * 290, 980);
    for (let i = 0; i < 8; i++) page(ctx, 250 + random(i + 15) * 1480, mod(i * 145 + drift, 1100) - 110, 120 + i * 7, 27, .18 + i * .17 + data.local * .15, .15, '#c2a3a6');
    const anchors = [[660, 300], [1170, 420], [825, 490], [1250, 645]], at = anchors[index % anchors.length];
    if (index === 0) trace(ctx, [[260, 620], [500, 300], [920, 660], [1280, 250], [1690, 560]], C.moon, 2.4, .42);
    const drop = index === 2 ? ease(clamp((progress - .43) / .55)) : 0;
    livingText(t, line, cue, at[0], at[1], index === 1 ? 340 : index === 3 ? 215 : 190, index === 1 ? 1130 : 1320,
      { color: index === 3 ? '#e6ad96' : C.white, mode: 'fall', release: drop, angle: index === 2 ? progress * .055 : 0 });
    if (index === 3) trace(ctx, [[1120, 90], [1090, 420], [1030, 730], [1310, 840], [1570, 635]], C.moon, 3.4, .9);
  }

  function reaching(t, data, q) {
    const { line } = data, { cue, index, local, progress } = q, p = ease(clamp((local + .035) / .23));
    const center = [620, 1090, 960, 1160][index % 4], cy = [320, 410, 445, 360][index % 4];
    const closing = index >= 2 ? p : index === 1 ? .46 * p : .13 * p;
    const gap = lerp(920, index === 3 ? 660 : 520, closing), stretch = index === 2 ? 1 + beat(t, timeline) * .025 : 1;
    const left = [[-120, 740], [500 - gap * .38, 760], [960 - gap, 220], [960 - gap * .56, 160], [960 - gap * .52, 655]];
    const right = [[2070, 155], [1480 + gap * .38, 130], [960 + gap, 710], [960 + gap * .56, 790], [960 + gap * .52, 260]];
    trace(ctx, left, C.plum, 58, .095); trace(ctx, right, C.gold, 78, .12);
    trace(ctx, left, C.red, 2.5, .74); trace(ctx, right, C.red, 2, .7);
    if (index === 1 || index === 2) {
      for (let i = 0; i < 5; i++) {
        const x = 740 + i * 112, y = 665 + Math.sin(i * .6) * 20;
        page(ctx, x + (1 - p) * (i < 2 ? -500 : 500), y, 160, 45, (i - 2) * .09 * (1 - closing), .5, i % 2 ? '#ead7c0' : C.white);
      }
    }
    livingText(t, line, cue, center + (index === 0 ? (1 - p) * -260 : 0), cy, (index === 1 ? 314 : index === 2 ? 246 : 194) * stretch,
      index === 1 ? 1230 : 1290, { color: index === 2 ? C.red : C.ink, mode: index >= 2 ? 'gather' : 'slide' });
    if (index >= 3) {
      type(textOf(line), 960, 700, latin(textOf(line)) ? 80 : 76, 1490, { color: C.ink, alpha: p, weight: 400 });
      trace(ctx, [[320, 782], [860, 797], [1470, 774]], C.red, 1.7, p * .6);
    }
  }

  return {
    render(time) {
      const t = clamp(Number(time) || 0, 0, project.duration), data = segment(Math.min(t, project.duration - .00001), timeline), q = cueAt(t, data.line);
      const action = ['pressure', 'open', 'fall', 'reach'].includes(data.line.action) ? data.line.action : ['pressure', 'open', 'fall', 'reach'][data.index % 4];
      const dark = action === 'fall', color = dark ? C.white : C.ink;
      ctx.save(); ctx.scale(project.width / 1920, project.height / 1080);
      ctx.fillStyle = dark ? C.night : C.paper; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = paperGrain; ctx.fillRect(0, 0, 1920, 1080);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, 920); ctx.clip();
      const p = ease(clamp((q.local + .025) / .19)), motion = q.index % 4, micro = q.cue.end - q.cue.start > 1.35 ? smooth(clamp((q.local - .78) / .18)) : 0;
      const zoom = [1.09, .94, 1.035, .96][motion] + beat(t, timeline) * (motion === 1 ? .006 : .014) - micro * .065;
      camera(ctx, { x: lerp(1080, [980, 895, 1015, 945][motion] + micro * 90, p), y: lerp(580, [490, 510, 470, 500][motion], p),
        zoom: lerp(.89, zoom, p), angle: lerp(.075, [-.025, .03, -.037, .008][motion] + micro * .026, p) });
      carrier(t, data, action);
      ({ pressure, open: opening, fall: falling, reach: reaching })[action](t, data, q);
      ctx.restore();
      if (action !== 'reach' || q.index < 3) type(textOf(data.line), 1625, 863, 37, 1480, { color, alpha: .35, align: 'right', weight: 400 });
      // A rapid page turn reveals the ink-dark descent while preserving the subtitle surface.
      if (dark && data.local < .22) {
        const sweep = ease(clamp(data.local / .22));
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, 920); ctx.clip();
        page(ctx, 960 + sweep * 3100, 430, 2380, 1700, -.14 + sweep * .16, 1, C.paper); ctx.restore();
      }
      drawSubtitles(ctx, t, timeline, project, { color, accent: dark ? C.moon : C.red }); ctx.restore();
    },
  };
}
