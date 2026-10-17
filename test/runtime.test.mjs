import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { loadProject, normalizeTimeline } from '../lib/project.mjs';
import {exportSubtitles} from '../lib/render.mjs';
import { serve } from '../tools/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa', 'test-tmp');
const bytes = Buffer.from(Array.from({ length: 64 }, (_, index) => index));
const project = {
  title: 'Integration fixture', width: 1920, height: 1080, fps: 30, duration: 2, previewDuration: 2,
  audio: 'assets/audio.wav', timeline: 'timeline.json', artwork: 'artwork.js', readyToRender: false,
};
const timeline = {
  language: 'und', duration: 2, alignment: { quality: 'line-timed', source: 'lrc' }, beats: [],
  lines: [{ id: 'line-1', text: 'Original fixture', start: 0, end: 2, tokens: [] }],
};

async function fixture(t, customTimeline = timeline) {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'runtime-'));
  const result = { directory, projectRoot: path.join(directory, 'project'), server: null };
  t.after(async () => {
    await result.server?.close();
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(path.join(result.projectRoot, 'config'), { recursive: true });
  await mkdir(path.join(result.projectRoot, 'assets'));
  await writeFile(path.join(result.projectRoot, 'config/project.json'), JSON.stringify(project));
  await writeFile(path.join(result.projectRoot, 'timeline.json'), JSON.stringify(customTimeline));
  await writeFile(path.join(result.projectRoot, 'artwork.js'), 'export const readyToRender=false; export const cuts=[]; export function createArtwork(){return {render(){}};}');
  // Transport fixtures, not decodable media: these tests verify exact HTTP bytes and headers.
  await writeFile(path.join(result.projectRoot, 'assets/audio.wav'), bytes);
  await writeFile(path.join(result.projectRoot, 'assets/font.woff2'), Buffer.from('font-byte-fixture'));
  await writeFile(path.join(result.projectRoot, '.env'), 'PRIVATE_TOKEN=never-serve');
  await writeFile(path.join(directory, 'outside.txt'), 'outside-project-secret');
  return result;
}

async function serverFixture(t) {
  const value = await fixture(t);
  value.server = await serve(value.projectRoot);
  return value;
}

function request(url, route, options = {}) {
  const address = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: address.hostname, port: address.port, path: route, ...options }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('project root serves shared preview shell, its runtime module, project data and local artwork', async t => {
  const { server, projectRoot } = await serverFixture(t);
  const home = await request(server.url, '/');
  assert.equal(home.status, 200);
  assert.match(home.headers['content-type'], /^text\/html/);
  assert.deepEqual(home.body, await readFile(path.join(root, 'src/index.html')));
  const script = await request(server.url, '/__runtime/runtime.js');
  assert.equal(script.status, 200);
  assert.match(script.headers['content-type'], /^text\/javascript/);
  assert.deepEqual(script.body, await readFile(path.join(root, 'src/runtime.js')));
  const config = await request(server.url, '/config/project.json');
  assert.deepEqual(JSON.parse(config.body), project);
  const art = await request(server.url, '/artwork.js');
  assert.equal(art.status, 200);
  assert.match(art.headers['content-type'], /^text\/javascript/);
  assert.deepEqual(art.body, await readFile(path.join(projectRoot, 'artwork.js')));
  const font = await request(server.url, '/assets/font.woff2');
  assert.equal(font.status, 200);
  assert.equal(font.headers['content-type'], 'font/woff2');
  assert.equal(font.body.toString(), 'font-byte-fixture');
  assert.equal(font.headers['x-content-type-options'], 'nosniff');
});

test('audio transport supports full reads, byte ranges, suffix ranges, open ends, and HEAD', async t => {
  const { server } = await serverFixture(t);
  const full = await request(server.url, '/assets/audio.wav');
  assert.equal(full.status, 200);
  assert.equal(full.headers['content-type'], 'audio/wav');
  assert.equal(full.headers['accept-ranges'], 'bytes');
  assert.equal(Number(full.headers['content-length']), bytes.length);
  assert.deepEqual(full.body, bytes);
  for (const [range, start, end] of [['bytes=4-11', 4, 11], ['bytes=-4', 60, 63], ['bytes=60-', 60, 63], ['bytes=60-999', 60, 63]]) {
    const response = await request(server.url, '/assets/audio.wav', { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers['content-range'], `bytes ${start}-${end}/64`);
    assert.equal(Number(response.headers['content-length']), end - start + 1);
    assert.deepEqual(response.body, bytes.subarray(start, end + 1));
  }
  const head = await request(server.url, '/assets/audio.wav', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(Number(head.headers['content-length']), 64);
  assert.equal(head.body.length, 0);
  const rangeHead = await request(server.url, '/assets/audio.wav', { method: 'HEAD', headers: { Range: 'bytes=4-11' } });
  assert.equal(rangeHead.status, 206);
  assert.equal(rangeHead.headers['content-range'], 'bytes 4-11/64');
  assert.equal(Number(rangeHead.headers['content-length']), 8);
  assert.equal(rangeHead.body.length, 0);
});

test('invalid byte ranges are rejected rather than silently returning the whole audio', async t => {
  const { server } = await serverFixture(t);
  for (const range of ['bytes=64-', 'bytes=12-3', 'bytes=-0', 'bytes=-', 'bytes=0-1,4-5', 'items=0-2', 'bytes=999999999999999999999999-']) {
    const response = await request(server.url, '/assets/audio.wav', { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers['content-range'], 'bytes */64');
    assert.equal(response.body.length, 0);
  }
});

test('transport denies dotfiles and traversal, including encoded Windows separators', async t => {
  const { server } = await serverFixture(t);
  for (const route of ['/.env', '/assets/../.env', '/%2eenv', '/%2e%2e%5coutside.txt', '/assets/%2e%2e%5c%2e%2e%5coutside.txt', '/../outside.txt', '/%2e%2e/outside.txt', '/__runtime/%2e%2e%5cpackage.json', '/bad%escape']) {
    const response = await request(server.url, route);
    assert.ok([403, 404].includes(response.status), `${route}: ${response.status}`);
    assert.doesNotMatch(response.body.toString(), /PRIVATE_TOKEN|outside-project-secret/);
  }
  const post = await request(server.url, '/config/project.json', { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});

test('loadProject returns validated generic inputs and creates isolated output directories', async t => {
  const { projectRoot } = await fixture(t);
  const loaded = await loadProject(projectRoot);
  assert.equal(loaded.root, projectRoot);
  assert.deepEqual(loaded.project, project);
  assert.deepEqual(loaded.timeline.lines, timeline.lines);
  assert.equal(loaded.audio, path.join(projectRoot, 'assets/audio.wav'));
  assert.equal((await stat(path.join(projectRoot, 'renders'))).isDirectory(), true);
  assert.equal((await stat(path.join(projectRoot, 'qa'))).isDirectory(), true);
});

test('loadProject rejects unaligned TXT instead of treating null times as timed lyrics', async t => {
  const input = { ...timeline, alignment: { quality: 'unaligned', source: 'txt' }, lines: [{ id: 'line-1', text: 'Needs alignment', start: null, end: null, tokens: [] }] };
  const { projectRoot } = await fixture(t, input);
  await assert.rejects(loadProject(projectRoot), /Lyrics need timing/);
});

test('explicit instrumental timeline loads and produces no fake or empty vocal SRT',async t=>{
  const input={...timeline,content:{kind:'instrumental',evidence:'provided-marker'},alignment:{quality:'not-applicable',source:'lrc'},lines:[]};
  const {projectRoot}=await fixture(t,input);
  assert.equal((await loadProject(projectRoot)).timeline.lines.length,0);
  await writeFile(path.join(projectRoot,'renders/captions.srt'),'Previous good subtitles');
  assert.deepEqual(await exportSubtitles(projectRoot),{file:null,lines:0,reason:'instrumental-no-vocal-subtitles'});
  assert.equal(await readFile(path.join(projectRoot,'renders/captions.srt'),'utf8'),'Previous good subtitles');
  const bad=await fixture(t,{...input,lines:timeline.lines});
  await assert.rejects(loadProject(bad.projectRoot),/cannot contain/);
});

test('loadProject accepts simultaneous and overlapping timed voices in start order', async t => {
  const input = { ...timeline, lines: [
    { id: 'one', text: 'First voice', start: 0, end: 2, tokens: [] },
    { id: 'two', text: 'Second voice', start: 0, end: 1, tokens: [] },
    { id: 'three', text: 'Third voice', start: 0.5, end: 1.5, tokens: [] },
  ] };
  const { projectRoot } = await fixture(t, input);
  const loaded = await loadProject(projectRoot);
  assert.equal(loaded.timeline.lines.length, 3);
  assert.equal(loaded.timeline.lines[2].start, 0.5);
});

test('loadProject rejects reversed times, out-of-order cues, and cue ends outside the song', async t => {
  for (const lines of [
    [{ text: 'Backwards', start: 1, end: 0.5, tokens: [] }],
    [{ text: 'Later', start: 1, end: 2, tokens: [] }, { text: 'Earlier', start: 0, end: 1, tokens: [] }],
    [{ text: 'Outside', start: 0, end: 2.5, tokens: [] }],
  ]) {
    const { projectRoot } = await fixture(t, { ...timeline, lines });
    await assert.rejects(loadProject(projectRoot), /Invalid or out-of-order lyric line/);
  }
});

test('loadProject rejects media paths that escape their independent project', async t => {
  const { projectRoot } = await fixture(t);
  await writeFile(path.join(projectRoot, 'config/project.json'), JSON.stringify({ ...project, audio: '../outside.txt' }));
  await assert.rejects(loadProject(projectRoot), /escapes the project/);
});

test('legacy jp/morae input normalizes to text/tokens without mutating the source', async t => {
  const legacy = { duration: 2, beats: [0, 0.5, 1, 1.5], lines: [{ jp: 'あい', start: 0, end: 2.5, morae: [{ ch: 'あ', at: 0.1 }, { ch: 'い', at: 0.4 }] }] };
  const normalized = normalizeTimeline(legacy);
  assert.equal(normalized.language, 'und');
  assert.equal(normalized.lines[0].text, 'あい');
  assert.equal(normalized.lines[0].end, 2);
  assert.deepEqual(normalized.lines[0].tokens, [{ text: 'あ', start: 0.1 }, { text: 'い', start: 0.4 }]);
  assert.equal(legacy.lines[0].text, undefined);
  assert.equal(legacy.lines[0].tokens, undefined);
  assert.equal(legacy.lines[0].end, 2.5);
  const { projectRoot } = await fixture(t, legacy);
  const loaded = await loadProject(projectRoot);
  assert.deepEqual(loaded.timeline.lines[0].tokens, normalized.lines[0].tokens);
});
