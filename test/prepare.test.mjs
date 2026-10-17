import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareProject } from '../lib/prepare.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa', 'test-tmp');
const hasProbe = spawnSync(process.env.FFPROBE_PATH || 'ffprobe', ['-version'], { windowsHide: true }).status === 0;

function wave(seconds = 1.05) {
  const rate = 16000, samples = Math.round(rate * seconds), dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * 2 * Math.PI * 440) * 500), 44 + i * 2);
  return buffer;
}

async function fixture(t, lyricText = '[00:00.00]First\n[00:00.50]Second', format = 'lrc') {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'prepare-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const audio = path.join(directory, 'song with spaces 音乐.wav');
  const lyrics = path.join(directory, `song.${format}`);
  await writeFile(audio, wave());
  await writeFile(lyrics, lyricText);
  return { audio, lyrics, out: path.join(directory, 'projects', 'new-song'), directory };
}

test('prepare probes real duration, imports portable paths and keeps export blocked', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  const result = await prepareProject({ ...files, templateRoot: path.join(root, 'templates'), aspect: '9:16', direction: 'Playful type.' });
  assert.equal(result.project.duration, 31 / 30);
  assert.equal(result.project.width, 1080);
  assert.equal(result.project.height, 1920);
  assert.equal(result.project.fps, 30);
  assert.equal(result.project.readyToRender, false);
  assert.equal(result.project.artwork, 'artwork.js');
  assert.equal(result.state.status, 'prepared');
  assert.equal(result.state.reason, null);
  assert.equal(result.request.schemaVersion, '0.1.0');
  assert.deepEqual(result.request.assets.lyrics, { format: 'lrc', path: 'assets/lyrics.lrc' });
  assert.deepEqual(result.request.creative, { mode: 'free', direction: 'Playful type.' });
  assert.equal(result.request.output.aspectRatio, '9:16');
  assert.deepEqual(await readFile(path.join(files.out, 'assets/audio.wav')), await readFile(files.audio));
  assert.deepEqual(await readFile(path.join(files.out, 'assets/lyrics.lrc')), await readFile(files.lyrics));
  const sources=JSON.parse(await readFile(path.join(files.out,'sources.json'),'utf8'));
  for(const source of sources.files)assert.deepEqual(await readFile(path.join(files.out,source.path)),await readFile(path.join(files.out,source.asset)));
  assert.equal(sources.files[0].originalName,path.basename(files.audio));
  assert.match(sources.files[0].sha256,/^[a-f0-9]{64}$/);
  assert.equal(await readFile(path.join(files.out, 'artwork.js'), 'utf8'), await readFile(path.join(root, 'templates/artwork.js'), 'utf8'));
  assert.deepEqual(JSON.parse(await readFile(path.join(files.out, 'timeline.json'), 'utf8')), result.timeline);
  assert.doesNotMatch(JSON.stringify(result.request), /[A-Z]:\\|\/Users\/|\.\.\//);
});

test('TXT import preserves raw bytes and records required alignment without made-up timing', { skip: !hasProbe }, async t => {
  const files = await fixture(t, '\uFEFFFirst\r\nSecond', 'txt');
  const result = await prepareProject(files);
  assert.equal(result.state.status, 'needs_input');
  assert.equal(result.state.reason, 'needs_alignment');
  assert.equal(result.timeline.alignment.quality, 'unaligned');
  assert.deepEqual(result.timeline.lines.map(line => [line.start, line.end]), [[null, null], [null, null]]);
  assert.deepEqual(await readFile(path.join(files.out, 'assets/lyrics.txt')), await readFile(files.lyrics));
  const source = await readFile(path.join(files.out, 'artwork.js'), 'utf8');
  assert.match(source, /readyToRender = false/);
  assert.match(source, /render\(\)/);
});

test('reference file is copied and brief uses reference mode', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  const reference = path.join(files.directory, 'reference.mp4');
  await writeFile(reference, Buffer.from('reference fixture'));
  const result = await prepareProject({ ...files, reference });
  assert.equal(result.request.creative.mode, 'reference');
  assert.deepEqual(result.request.assets.reference, { path: 'assets/reference.mp4' });
  assert.equal(await readFile(path.join(files.out, 'assets/reference.mp4'), 'utf8'), 'reference fixture');
});

test('style profile and prompt imports preserve source bytes and use independent portable copies', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  const profile = path.join(root, 'examples/contracts/kinetic-play.style.json');
  const prompt = path.join(files.directory, 'original style prompt.md');
  const rawPrompt = Buffer.from('\uFEFF# My direction\r\n\r\n让字形跟着词义行动。\r\nKeep room for the new song.\r\n');
  await writeFile(prompt, rawPrompt);
  const first = await prepareProject({ ...files, styleProfile: profile, stylePrompt: prompt });
  const secondOut = path.join(files.directory, 'projects', 'second-song');
  const second = await prepareProject({ ...files, out: secondOut, styleProfile: profile, stylePrompt: prompt });
  assert.equal(first.request.creative.styleProfile, 'style/style-profile.json');
  assert.equal(first.request.creative.stylePrompt, 'style/style-prompt.md');
  assert.deepEqual(second.request.creative, first.request.creative);
  assert.deepEqual(await readFile(path.join(files.out, 'style/style-profile.json')), await readFile(profile));
  assert.deepEqual(await readFile(path.join(files.out, 'style/style-prompt.md')), rawPrompt);
  assert.deepEqual(await readFile(path.join(secondOut, 'style/style-prompt.md')), rawPrompt);
  assert.doesNotMatch(JSON.stringify(first.request), /[A-Z]:\\|\/Users\/|\.\.\//);
  await writeFile(path.join(files.out, 'style/style-prompt.md'), 'Edited in the first project');
  assert.deepEqual(await readFile(path.join(secondOut, 'style/style-prompt.md')), rawPrompt);
  assert.deepEqual(await readFile(prompt), rawPrompt);
});

test('invalid or missing style imports fail before creating output', async t => {
  const files = await fixture(t);
  const invalidProfile = path.join(files.directory, 'invalid-profile.json');
  await writeFile(invalidProfile, JSON.stringify({ schemaVersion: '0.1.0', name: 'Incomplete' }));
  await assert.rejects(prepareProject({ ...files, styleProfile: invalidProfile }), /Invalid style field/);
  await assert.rejects(prepareProject({ ...files, stylePrompt: path.join(files.directory, 'missing-prompt.md') }), /does not exist/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
});

test('existing projects are refused, including --force, and files are left intact', async t => {
  const files = await fixture(t);
  await mkdir(files.out, { recursive: true });
  await writeFile(path.join(files.out, 'keep.txt'), 'my work');
  await assert.rejects(prepareProject(files), /already exists/);
  await assert.rejects(prepareProject({ ...files, force: true }), /never deletes or overwrites/);
  assert.equal(await readFile(path.join(files.out, 'keep.txt'), 'utf8'), 'my work');
});

test('invalid paths, unsupported format, and missing templates fail before creating a project', async t => {
  const files = await fixture(t);
  await assert.rejects(prepareProject({ ...files, audio: path.join(files.directory, 'missing.mp3') }), /does not exist/);
  await assert.rejects(prepareProject({ ...files, lyrics: files.directory }), /regular file/);
  await assert.rejects(prepareProject({ ...files, aspect: '4:3' }), /aspect/);
  await assert.rejects(prepareProject({ ...files, templateRoot: files.directory }), /does not exist/);
  const unknown = path.join(files.directory, 'lyrics.json');
  await writeFile(unknown, '{}');
  await assert.rejects(prepareProject({ ...files, lyrics: unknown }), /\.lrc, .srt, or .txt/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
});

test('invalid media and invalid lyric timing fail before creating a project', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  await writeFile(files.audio, 'not audio');
  await assert.rejects(prepareProject(files), /Cannot read audio/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
  await writeFile(files.audio, wave());
  await writeFile(files.lyrics, '[00:59.00]Outside');
  await assert.rejects(prepareProject(files), /No timed lyric/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
});
