import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { makeStyleExamples, STYLE_IDS } from '../tools/make-style-examples.mjs';
import { probe, run } from '../lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa/style-example-tests');
const available = ['ffmpeg', 'ffprobe'].every(tool => spawnSync(process.env[tool === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH'] || tool, ['-version'], { windowsHide: true }).status === 0);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const absent = file => assert.rejects(stat(file), { code: 'ENOENT' });

async function fixture(t) {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'case-'));
  t.after(async () => {
    const relative = path.relative(testRoot, directory);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(directory, { recursive: true, force: true });
  });
  const audio = path.join(directory, 'user-source.wav'), timeline = path.join(directory, 'user-timeline.json');
  await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=733:duration=2', '-ar', '16000', '-c:a', 'pcm_s16le', audio]);
  await writeFile(timeline, JSON.stringify({ duration: 2, segStart: 30, language: 'en', alignment: { quality: 'token-timed' }, beats: [0, .25, .5, .75, 1, 1.25, 1.5, 1.75], lines: [
    { id: 'a', text: 'PRIVATE first', start: 0, end: .4, tokens: [] },
    { id: 'b', text: 'PRIVATE second', action: 'pressure', start: .4, end: .8, translations: { 'zh-CN': '第二句', en: 'Second' }, tokens: [{ text: 'overlap', start: .55, end: .75 }], cues: [{ text: 'first cue', start: .45, end: .65 }, { text: 'next cue', start: .65, end: .77 }] },
    { id: 'c', text: 'PRIVATE third', start: .8, end: 1.2, zh: '第三句', tokens: [{ text: 'middle', start: .9, end: 1.1 }] },
    { id: 'd', text: 'PRIVATE fourth', start: 1.2, end: 1.6, tokens: [] },
    { id: 'e', text: 'PRIVATE fifth', start: 1.6, end: 2, tokens: [{ text: 'last', start: 1.65, end: 1.8 }] },
  ] }));
  return { directory, audio, timeline, out: path.join(directory, 'comparison') };
}

test('excerpt keeps translations, clipped token timing, source bytes, and identical portable audio across directions', { skip: !available }, async t => {
  const input = await fixture(t);
  const before = [digest(await readFile(input.audio)), digest(await readFile(input.timeline))];
  const sourceArtwork = await Promise.all(STYLE_IDS.map(id => readFile(path.join(root, 'examples/styles', id, 'artwork.js'))));
  const result = await makeStyleExamples({ ...input, start: .6, duration: 1.1 });
  assert.equal(result.duration, 1.1);
  const timeline = JSON.parse(await readFile(path.join(input.out, 'timeline.json'), 'utf8'));
  assert.deepEqual(timeline.lines.map(line => line.id), ['b', 'c', 'd', 'e']);
  const expected = [[0, .2], [.2, .6], [.6, 1], [1, 1.1]];
  for (const [index, line] of timeline.lines.entries()) {
    assert.ok(Math.abs(line.start - expected[index][0]) < 1e-9);
    assert.ok(Math.abs(line.end - expected[index][1]) < 1e-9);
  }
  assert.deepEqual(timeline.lines[0].translations, { 'zh-CN': '第二句', en: 'Second' });
  assert.deepEqual(timeline.lines[1].translations, { 'zh-CN': '第三句' });
  assert.ok(Math.abs(timeline.lines[1].tokens[0].start - .3) < 1e-9);
  assert.ok(Math.abs(timeline.lines[3].tokens[0].end - 1.1) < 1e-9);
  const sharedAudio = digest(await readFile(path.join(input.out, 'assets/audio.wav')));
  for (const [index, id] of STYLE_IDS.entries()) {
    const folder = path.join(input.out, id);
    assert.equal(digest(await readFile(path.join(folder, 'assets/audio.wav'))), sharedAudio);
    assert.deepEqual(JSON.parse(await readFile(path.join(folder, 'timeline.json'), 'utf8')), timeline);
    assert.equal((await stat(path.join(folder, 'shared.mjs'))).isFile(), true);
    const captions = await readFile(path.join(folder, 'captions.srt'), 'utf8');
    assert.ok(captions.includes('00:00:00,000 --> 00:00:00,200\n第二句'));
    assert.ok(captions.includes('第三句'));
    const code = await readFile(path.join(folder, 'artwork.js'), 'utf8');
    assert.match(code, /['"]\.\/shared\.mjs['"]/);
    assert.doesNotMatch(code, /['"]\.\.\/shared\.mjs['"]/);
    assert.deepEqual(await readFile(path.join(root, 'examples/styles', id, 'artwork.js')), sourceArtwork[index]);
  }
  assert.deepEqual([digest(await readFile(input.audio)), digest(await readFile(input.timeline))], before);
  const source = JSON.parse(await readFile(path.join(input.out, 'source.json'), 'utf8'));
  assert.equal(source.publicRedistribution, 'not-assumed');
  assert.ok(Math.abs(source.originalTrackRange.start - 30.6) < 1e-9);
  // An explicitly timed token still sounding at the excerpt boundary must remain represented.
  assert.equal(timeline.lines[0].tokens.length, 1);
  assert.equal(timeline.lines[0].tokens[0].text, 'overlap');
  assert.equal(timeline.lines[0].tokens[0].start, 0);
  assert.ok(Math.abs(timeline.lines[0].tokens[0].end - .15) < 1e-9);
  assert.equal(timeline.lines[0].action, 'pressure');
  assert.equal(timeline.lines[0].cues[0].start, 0);
  assert.ok(Math.abs(timeline.lines[0].cues[0].end - .05) < 1e-9);
  assert.ok(Math.abs(timeline.lines[0].cues[1].start - .05) < 1e-9);
  assert.ok(Math.abs(timeline.lines[0].cues[1].end - .17) < 1e-9);
});

test('invalid excerpt ranges create no output and existing directories remain untouched', { skip: !available }, async t => {
  const input = await fixture(t);
  for (const options of [{ start: -1, duration: 1 }, { start: 1, duration: 2 }, { start: 0, duration: .01 }]) {
    await assert.rejects(makeStyleExamples({ ...input, ...options }));
    await absent(input.out);
  }
  await mkdir(input.out);
  const marker = path.join(input.out, 'keep.txt');
  await writeFile(marker, 'Existing project');
  await assert.rejects(makeStyleExamples({ ...input, duration: 1 }), /output exists/);
  assert.equal(await readFile(marker, 'utf8'), 'Existing project');
});

test('public comparison uses only original instrumental cues rather than supplied private content', { skip: !available }, async t => {
  const input = await fixture(t);
  const before = [digest(await readFile(input.audio)), digest(await readFile(input.timeline))];
  const result = await makeStyleExamples({ ...input, publicDemo: true });
  assert.equal(result.source.kind, 'original-instrumental');
  assert.doesNotMatch(JSON.stringify(result.source), /user-source|user-timeline|PRIVATE/);
  assert.equal(result.duration, 14.3);
  const timeline = JSON.parse(await readFile(path.join(input.out, 'timeline.json'), 'utf8'));
  assert.equal(timeline.lines.length, 4);
  assert.equal(timeline.alignment.vocals, false);
  assert.doesNotMatch(JSON.stringify(timeline), /PRIVATE|第二句|第三句/);
  const audio = path.join(input.out, 'assets/audio.wav');
  assert.ok(Math.abs(Number((await probe(audio)).format.duration) - 14.3) < .001);
  const hash = digest(await readFile(audio));
  for (const id of STYLE_IDS) assert.equal(digest(await readFile(path.join(input.out, id, 'assets/audio.wav'))), hash);
  assert.deepEqual([digest(await readFile(input.audio)), digest(await readFile(input.timeline))], before);
});

test('encoder failure does not strand a partial output that blocks a clean retry', { skip: !available }, async t => {
  const input = await fixture(t), previous = process.env.FFMPEG_PATH;
  process.env.FFMPEG_PATH = process.execPath; // A deterministic non-FFmpeg executable; no source files are changed.
  try { await assert.rejects(makeStyleExamples({ ...input, duration: 1 })); }
  finally { if (previous === undefined) delete process.env.FFMPEG_PATH; else process.env.FFMPEG_PATH = previous; }
  await absent(input.out);
});
