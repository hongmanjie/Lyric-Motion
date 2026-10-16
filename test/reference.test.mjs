import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { prepareReference, validateStyle, exportStylePrompt } from '../lib/reference.mjs';
import { probe, run } from '../lib/paths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa', 'test-tmp');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const hasMediaTools = [ffmpeg, ffprobe].every(command => spawnSync(command, ['-version'], { windowsHide: true }).status === 0);
const profile = JSON.parse(await readFile(path.join(root, 'examples/contracts/kinetic-play.style.json'), 'utf8'));

async function fixture(t, media = false) {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'reference-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const video = path.join(directory, 'source RGB clip.mkv');
  if (media) await run(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=65x49:rate=12:duration=1.5',
    '-c:v', 'ffv1', '-pix_fmt', 'bgr0', video,
  ]);
  return { directory, video, out: path.join(directory, 'reference-analysis') };
}

test('reference preparation produces real even yuv420p preview from an odd RGB crop', { skip: !hasMediaTools }, async t => {
  const files = await fixture(t, true);
  const source = await probe(files.video);
  assert.equal(source.streams[0].width, 65);
  assert.equal(source.streams[0].height, 49);
  const result = await prepareReference({ ...files, start: 0.25, duration: 0.75, crop: '1:3:33:25' });
  const metadata = JSON.parse(await readFile(path.join(files.out, 'reference.json'), 'utf8'));
  assert.deepEqual(metadata.region, { x: 1, y: 3, width: 33, height: 25 });
  assert.deepEqual(metadata.range, { start: 0.25, end: 1 });
  assert.equal(metadata.source.name, path.basename(files.video));
  assert.equal(metadata.source.hasAudio, false);
  assert.equal(metadata.frames.length, 2);
  assert.equal(metadata.review.visual, 'pending');
  assert.equal(metadata.review.audio, 'not-claimed');
  assert.equal(metadata.review.semantics, 'pending');
  assert.ok(!JSON.stringify(metadata).includes(files.directory));
  assert.ok(!JSON.stringify(metadata).includes(files.video));
  const preview = await probe(path.join(files.out, result.preview));
  const stream = preview.streams.find(value => value.codec_type === 'video');
  assert.equal(stream.width, 32);
  assert.equal(stream.height, 24);
  assert.equal(stream.pix_fmt, 'yuv420p');
  assert.ok(Math.abs(Number(preview.format.duration) - 0.75) < 0.1);
  for (const frame of metadata.frames) {
    assert.ok(frame.at >= 0.25 && frame.at < 1);
    const image = (await probe(path.join(files.out, frame.asset))).streams[0];
    assert.equal(image.width, 32);
    assert.equal(image.height, 24);
  }
  const findings = await readFile(path.join(files.out, 'reference-findings.md'), 'utf8');
  assert.match(findings, /analysis not performed/);
});

test('invalid reference crops and ranges refuse before creating output', { skip: !hasMediaTools }, async t => {
  const files = await fixture(t, true);
  for (const crop of ['-1:0:10:10', '0:0:100:10', '0:0:1:10', '0:0:32.5:10', '0:0:32:10:3']) {
    await assert.rejects(prepareReference({ ...files, crop }), /Crop must/);
    await assert.rejects(stat(files.out), { code: 'ENOENT' });
  }
  for (const range of [{ start: -1, duration: 1 }, { start: 0, duration: 0 }, { start: 1, duration: 1 }, { start: 0, duration: Infinity }]) {
    await assert.rejects(prepareReference({ ...files, ...range }), /range outside/);
    await assert.rejects(stat(files.out), { code: 'ENOENT' });
  }
});

test('reference output never overwrites an existing analysis directory', { skip: !hasMediaTools }, async t => {
  const files = await fixture(t, true);
  await mkdir(files.out);
  await writeFile(path.join(files.out, 'keep.md'), 'Previous human observations');
  await assert.rejects(prepareReference(files), /already exists/);
  assert.equal(await readFile(path.join(files.out, 'keep.md'), 'utf8'), 'Previous human observations');
});

test('valid profile exports reusable authored principles without pretending to observe video', async t => {
  const files = await fixture(t);
  assert.equal(validateStyle(profile), true);
  const destination = path.join(files.directory, 'style', 'style-prompt.md');
  await exportStylePrompt(profile, destination);
  const prompt = await readFile(destination, 'utf8');
  assert.ok(prompt.includes(profile.name));
  for (const key of ['principles', 'typography', 'composition', 'color', 'motion', 'rhythm', 'semantics', 'transitions', 'avoid']) {
    for (const value of profile[key]) assert.ok(prompt.includes(value), `Missing ${key} principle`);
  }
  assert.match(prompt, /Recompose for the new song/);
});

test('optional color and rhythm fields reject malformed values when supplied', () => {
  for (const key of ['color', 'rhythm']) {
    for (const value of [null, '', [], [''], [1], {}]) {
      assert.throws(() => validateStyle({ ...profile, [key]: value }), new RegExp(`Invalid style field: ${key}`));
    }
    const without = { ...profile };
    delete without[key];
    assert.equal(validateStyle(without), true);
  }
});

test('observed claims require nonnegative timestamps and descriptions', () => {
  for (const evidence of [undefined, [], [{ description: 'Visible shape' }], [{ at: -1, description: 'Visible shape' }], [{ at: 1 }]]) {
    assert.throws(() => validateStyle({ ...profile, observations: [{ status: 'observed', evidence }] }), /timestamped evidence/);
  }
  assert.equal(validateStyle({ ...profile, observations: [{ status: 'observed', evidence: [{ at: 1.25, description: 'A glyph enters from the right.' }] }] }), true);
});
