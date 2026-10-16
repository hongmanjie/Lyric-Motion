import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, writeFile, rm, stat, rename } from 'node:fs/promises';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { prepareReconstruction, validateReconstruction, formatReconstructionPrompt, exportReconstruction } from '../lib/reconstruction.mjs';
import { installSkill } from '../tools/install.mjs';
import { run } from '../lib/paths.mjs';

const execute = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa/reconstruction-tests');
const available = ['ffmpeg', 'ffprobe'].every(tool => spawnSync(process.env[tool === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH'] || tool, ['-version'], { windowsHide: true }).status === 0);

function analysis() {
  const observed = description => ({ description, status: 'observed', evidence: [{ at: .25, description: 'Visible in the inspected sample.' }] });
  return {
    schemaVersion: '0.1.0', title: 'A bold geometric reconstruction',
    source: { label: 'self-authored test video', range: { start: 0, end: 1 }, frame: { width: 96, height: 64 }, region: null },
    coverage: { visual: 'stills', audio: 'not-observed', lyrics: 'not-provided', inspectedFrames: [.25, .75], watchedRanges: [], listenedRanges: [], limitations: ['Sparse samples; timing and sound were not reviewed.'] },
    look: { composition: [observed('A large central geometric subject with empty margins.')], typography: [{ description: 'No reliable type identification from this sample.', status: 'unknown' }], materials: [observed('Flat graphic fields.')], color: [observed('Strong contrast between the field and subject.')] },
    motion: [{ description: 'Use a restrained spatial reveal as a new production choice.', status: 'inferred' }],
    transitions: [{ description: 'Exact transition mechanism is unavailable from the samples.', status: 'unknown' }],
    rhythm: [{ description: 'Musical synchronization and shot cadence were not heard or watched.', status: 'unknown' }],
    semantics: [{ description: 'No lyrics were supplied, so lyric linkage remains unknown.', status: 'unknown' }],
    scenes: [{ start: 0, end: 1, description: 'Build one strong geometric composition; exact boundaries are inferred.', status: 'inferred' }],
    creativePrompt: 'Create a short landscape motion-graphics video dominated by one bold geometric subject. Preserve wide breathing room and strong color contrast. Design a restrained reveal and readable hold, treating the exact easing as a new creative decision.',
    negativePrompt: ['Avoid decorative clutter and unsupported claims of beat synchronization.'],
    assumptions: [{ description: 'A code-rendered implementation could produce this visible result.', status: 'inferred' }],
    technicalStack: { status: 'unknown', description: 'The media does not establish the original renderer or software.' },
  };
}

async function fixture(t, media = false) {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'case-'));
  t.after(async () => {
    const relative = path.relative(testRoot, directory);
    assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(directory, { recursive: true, force: true });
  });
  const video = path.join(directory, 'original.mkv');
  if (media) await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=96x64:rate=12:duration=1', '-c:v', 'ffv1', video]);
  return { directory, video, out: path.join(directory, 'prepared') };
}

test('authored reconstruction exports a natural production request, sequence, unknowns, and actual coverage', () => {
  const value = analysis();
  assert.equal(validateReconstruction(value), true);
  const prompt = formatReconstructionPrompt(value);
  assert.ok(prompt.includes(value.creativePrompt));
  assert.ok(prompt.includes(value.scenes[0].description));
  assert.ok(prompt.includes(value.negativePrompt[0]));
  assert.match(prompt, /not the recovered original secret prompt/);
  assert.match(prompt, /Visual: stills; audio: not-observed/);
  assert.match(prompt, /original implementation \(unknown\)/);
  assert.match(prompt, /0–1s \(source time\)/);
});

test('incomplete observations and unsupported motion/stack claims cannot export as completed analysis', () => {
  const cases = [
    value => { value.coverage.visual = 'not-observed'; },
    value => { value.look.composition[0].evidence = []; },
    value => { value.look.composition[0].evidence[0].at = .5; },
    value => { value.coverage.audio = 'listened'; },
    value => { value.creativePrompt = ''; },
    value => { for (const claims of Object.values(value.look)) for (const item of claims) item.status = 'unknown'; },
    value => { value.technicalStack.status = 'observed'; },
    value => { value.scenes[0].end = 2; },
    value => { value.motion = [{ description: 'A verified overshoot.', status: 'observed', evidence: [{ at: .25, until: .75, description: 'Motion interval.' }] }]; },
  ];
  for (const mutate of cases) { const value = analysis(); mutate(value); assert.throws(() => validateReconstruction(value), /Reconstruction analysis/); }
  const watched = analysis();
  watched.coverage.visual = 'continuous'; watched.coverage.watchedRanges = [{ start: 0, end: 1 }];
  watched.motion = [{ description: 'A watched motion interval.', status: 'observed', evidence: [{ at: .25, until: .75, description: 'The subject changes scale.' }] }];
  assert.equal(validateReconstruction(watched), true);
});

test('preparation preserves media and produces an analysis-needed draft without pretending to analyze', { skip: !available }, async t => {
  const files = await fixture(t, true), before = await readFile(files.video);
  const result = await prepareReconstruction({ ...files, start: .1, duration: .8, crop: '0:0:48:32' });
  assert.equal(result.status, 'needs-analysis');
  const draft = JSON.parse(await readFile(path.join(files.out, 'analysis.json'), 'utf8'));
  assert.deepEqual(draft.source.range, { start: .1, end: .9 });
  assert.equal(draft.coverage.visual, 'not-observed');
  assert.equal(draft.creativePrompt, '');
  assert.throws(() => validateReconstruction(draft), /visual observation/);
  await assert.rejects(stat(path.join(files.out, 'reconstruction-prompt.md')), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(path.join(files.out, 'state.json'), 'utf8')).status, 'needs-analysis');
  assert.equal((await stat(path.join(files.out, 'evidence/preview.mp4'))).isFile(), true);
  assert.deepEqual(await readFile(files.video), before);
});

test('invalid preparation leaves no output and existing work is preserved', { skip: !available }, async t => {
  const files = await fixture(t, true);
  await assert.rejects(prepareReconstruction({ ...files, duration: 5 }), /range outside/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
  await assert.rejects(prepareReconstruction({ ...files, crop: '../invalid' }), /Crop must/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
  await mkdir(files.out); await writeFile(path.join(files.out, 'keep.md'), 'Prior observations');
  await assert.rejects(prepareReconstruction(files), /already exists/);
  assert.equal(await readFile(path.join(files.out, 'keep.md'), 'utf8'), 'Prior observations');
});

test('export keeps contained evidence portable and refuses unsafe/incomplete/missing inputs without output', async t => {
  const files = await fixture(t), value = analysis();
  await mkdir(path.join(files.directory, 'evidence'));
  const pixels = Buffer.from('local image bytes');
  await writeFile(path.join(files.directory, 'evidence/frame.png'), pixels);
  value.look.composition[0].evidence[0].asset = 'evidence/frame.png';
  const output = path.join(files.directory, 'exported');
  const result = await exportReconstruction({ analysis: value, out: output, evidenceRoot: files.directory });
  assert.equal(result.status, 'authored');
  assert.deepEqual(await readFile(path.join(output, 'evidence/frame.png')), pixels);
  assert.equal((await stat(path.join(output, 'reconstruction-prompt.md'))).isFile(), true);
  await assert.rejects(exportReconstruction({ analysis: value, out: output, evidenceRoot: files.directory }), /already exists/);
  value.look.composition[0].evidence[0].asset = 'evidence/../private.png';
  const invalid = path.join(files.directory, 'invalid');
  await assert.rejects(exportReconstruction({ analysis: value, out: invalid, evidenceRoot: files.directory }), /local evidence image/);
  await assert.rejects(stat(invalid), { code: 'ENOENT' });
  value.look.composition[0].evidence[0].asset = 'evidence/missing.png';
  await assert.rejects(exportReconstruction({ analysis: value, out: invalid, evidenceRoot: files.directory }), /ENOENT/);
  await assert.rejects(stat(invalid), { code: 'ENOENT' });
});

test('installed and relocated toolkit can prepare reconstruction using its bundled schema', { skip: !available }, async t => {
  const files = await fixture(t, true);
  const installed = await installSkill({ agent: 'codex', target: path.join(files.directory, 'consumer') });
  const moved = path.join(files.directory, 'relocated-skill');
  await rename(installed.path, moved);
  const cli = path.join(moved, 'toolkit/tools/cli.mjs');
  const { stdout } = await execute(process.execPath, [cli, 'reverse-prompt', '--video', files.video, '--out', files.out], { cwd: files.directory, windowsHide: true });
  assert.equal(JSON.parse(stdout).status, 'needs-analysis');
  assert.deepEqual(await readFile(path.join(files.out, 'analysis.schema.json')), await readFile(path.join(moved, 'toolkit/schemas/reconstruction.schema.json')));
  const invalidOut = path.join(files.directory, 'invalid-mode');
  await assert.rejects(execute(process.execPath, [cli, 'reverse-prompt', '--video', files.video, '--analysis', 'missing.json', '--out', invalidOut], { cwd: files.directory, windowsHide: true }), /exactly one/);
  await assert.rejects(stat(invalidOut), { code: 'ENOENT' });
});
