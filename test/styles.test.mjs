import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, mkdtemp, readFile, writeFile, rm, stat, cp, rename } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolveStyleId, listStyles, getStyle, exportStyle } from '../lib/styles.mjs';
import { prepareProject } from '../lib/prepare.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testRoot = path.join(root, 'qa/style-tests');
const hasProbe = spawnSync(process.env.FFPROBE_PATH || 'ffprobe', ['-version'], { windowsHide: true }).status === 0;

function profile(id) {
  return { schemaVersion: '0.1.0', id, name: id, summary: `Original ${id} direction`, principles: ['Follow the song.'], typography: ['Use expressive type.'], composition: ['Choose a focal point.'], motion: ['Move with meaning.'], semantics: ['Reinterpret the lyrics.'], transitions: ['Connect actions.'], avoid: ['Do not copy a storyboard.'], provenance: { kind: 'authored', visualCoverage: 'not-observed', audioCoverage: 'not-observed', lyricsCoverage: 'not-provided' } };
}

function wave() {
  const samples = 16000, buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

async function fixture(t) {
  await mkdir(testRoot, { recursive: true });
  const directory = await mkdtemp(path.join(testRoot, 'case-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const styleRoot = path.join(directory, 'catalog');
  for (const id of ['playground', 'poetry', 'sculpture', 'storybook']) {
    const folder = path.join(styleRoot, 'examples/styles', id);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, 'profile.json'), JSON.stringify(profile(id)));
    await writeFile(path.join(folder, 'prompt.md'), `# ${id}\n\nA flexible starting point, not fixed shots.\n`);
    await writeFile(path.join(folder, 'artwork.js'), 'export const readyToRender = true; // final showcase, never import\n');
  }
  const audio = path.join(directory, 'song.wav'), lyrics = path.join(directory, 'lyrics.lrc');
  await writeFile(audio, wave());
  await writeFile(lyrics, '[00:00.00]A new song\n[00:00.50]A new scene');
  return { directory, styleRoot, audio, lyrics, out: path.join(directory, 'song-project'), templateRoot: path.join(root, 'templates') };
}

test('style aliases resolve consistently and catalog validates real profile/prompt files', async t => {
  const files = await fixture(t);
  for (const [id, aliases] of Object.entries({ auto: ['auto', '0', 0], playground: ['playground', '1', 1, '字形游乐场'], poetry: ['poetry', '2', '流动诗境'], sculpture: ['sculpture', '3', '数字雕塑'], storybook: ['storybook', '4', 4, '故事手绘', ' STORYBOOK '] })) {
    for (const alias of aliases) assert.equal(resolveStyleId(alias), id);
  }
  const catalog = await listStyles({ root: files.styleRoot });
  assert.deepEqual(catalog.map(style => style.id), ['auto', 'playground', 'poetry', 'sculpture', 'storybook']);
  assert.equal(catalog[0].profilePath, null);
  const missing = path.join(files.styleRoot, 'examples/styles/poetry/prompt.md');
  await writeFile(missing, '   ');
  await assert.rejects(listStyles({ root: files.styleRoot }), /prompt is empty/);
  await writeFile(missing, '# Poetry');
  await writeFile(path.join(files.styleRoot, 'examples/styles/sculpture/profile.json'), '{"schemaVersion":"wrong"}');
  await assert.rejects(listStyles({ root: files.styleRoot }), /Invalid style/);
});

test('bundle export creates independent preferences and refuses overwrites or auto export', async t => {
  const files = await fixture(t), out = path.join(files.directory, 'saved-style');
  const result = await exportStyle({ id: '1', out, root: files.styleRoot });
  const source = await getStyle('playground', { root: files.styleRoot });
  assert.deepEqual(await readFile(result.profilePath), await readFile(source.profilePath));
  assert.deepEqual(await readFile(result.promptPath), await readFile(source.promptPath));
  await assert.rejects(stat(path.join(out, 'artwork.js')), { code: 'ENOENT' });
  await writeFile(result.promptPath, 'My changes');
  assert.notEqual(await readFile(source.promptPath, 'utf8'), 'My changes');
  await assert.rejects(exportStyle({ id: '1', out, root: files.styleRoot }), /already exists/);
  assert.equal(await readFile(result.promptPath, 'utf8'), 'My changes');
  const autoOut = path.join(files.directory, 'auto-export');
  await assert.rejects(exportStyle({ id: 'auto', out: autoOut, root: files.styleRoot }), /no fixed profile/);
  await assert.rejects(stat(autoOut), { code: 'ENOENT' });
});

test('a relocated public catalog resolves from its new root without original checkout paths', async t => {
  const files = await fixture(t), moved = path.join(files.directory, 'installed-toolkit');
  await cp(files.styleRoot, moved, { recursive: true });
  await rename(files.styleRoot, path.join(files.directory, 'source-moved-away'));
  const styles = await listStyles({ root: moved });
  assert.equal(styles.length, 5);
  assert.ok(styles.slice(1).every(style => style.profilePath.startsWith(moved) && style.promptPath.startsWith(moved)));
  assert.equal(JSON.parse(await readFile(styles[1].profilePath, 'utf8')).id, 'playground');
  const story = await getStyle('故事手绘', { root: moved });
  assert.equal(JSON.parse(await readFile(story.profilePath, 'utf8')).id, 'storybook');
  const exported = await exportStyle({ id: 4, out: path.join(files.directory, 'portable-story'), root: moved });
  assert.equal(JSON.parse(await readFile(exported.profilePath, 'utf8')).id, 'storybook');
  await assert.rejects(stat(path.join(exported.directory, 'artwork.js')), { code: 'ENOENT' });
});

test('storybook imports the selected direction without inheriting its final example', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  const result = await prepareProject({ ...files, style: '故事手绘', direction: 'Tell the lyric story through characters and changing places.' });
  assert.deepEqual(result.request.extensions.style, { requested: 'storybook', applied: 'storybook', source: 'builtin', role: 'starting-point' });
  assert.equal(JSON.parse(await readFile(path.join(result.directory, result.request.creative.styleProfile), 'utf8')).id, 'storybook');
  assert.equal(result.project.readyToRender, false);
  assert.deepEqual(await readFile(path.join(result.directory, 'artwork.js')), await readFile(path.join(files.templateRoot, 'artwork.js')));
  const original = await getStyle(4, { root: files.styleRoot });
  await writeFile(path.join(result.directory, result.request.creative.stylePrompt), '# A different story for this song');
  assert.notEqual(await readFile(original.promptPath, 'utf8'), '# A different story for this song');
});

test('explicit style imports only independent preferences, preserving direction/reference and unfinished artwork', { skip: !hasProbe }, async t => {
  const files = await fixture(t), reference = path.join(files.directory, 'reference.mp4');
  await writeFile(reference, 'reference source');
  const result = await prepareProject({ ...files, style: '1', direction: 'Use warm colors and quiet pauses.', reference });
  assert.equal(result.request.creative.direction, 'Use warm colors and quiet pauses.');
  assert.equal(result.request.creative.mode, 'reference');
  assert.deepEqual(result.request.extensions.style, { requested: 'playground', applied: 'playground', source: 'builtin', role: 'starting-point' });
  const original = await getStyle('playground', { root: files.styleRoot });
  assert.deepEqual(await readFile(path.join(files.out, result.request.creative.styleProfile)), await readFile(original.profilePath));
  assert.deepEqual(await readFile(path.join(files.out, result.request.creative.stylePrompt)), await readFile(original.promptPath));
  assert.deepEqual(await readFile(path.join(files.out, 'artwork.js')), await readFile(path.join(files.templateRoot, 'artwork.js')));
  assert.equal(result.project.readyToRender, false);
  await writeFile(path.join(files.out, result.request.creative.stylePrompt), 'Project-specific changes');
  assert.notEqual(await readFile(original.promptPath, 'utf8'), 'Project-specific changes');
  assert.doesNotMatch(JSON.stringify(result.request), /[A-Z]:\\|\.\.\//);
});

test('auto leaves art direction open and custom inputs replace the complete built-in bundle', { skip: !hasProbe }, async t => {
  const files = await fixture(t);
  const automatic = await prepareProject({ ...files, styleRoot: path.join(files.directory, 'no-catalog-needed') });
  assert.equal(automatic.request.extensions.style.applied, 'auto');
  assert.equal(automatic.request.creative.styleProfile, undefined);
  assert.equal(automatic.request.creative.stylePrompt, undefined);
  await assert.rejects(stat(path.join(files.out, 'style')), { code: 'ENOENT' });
  const customProfile = path.join(files.directory, 'custom.json');
  await writeFile(customProfile, JSON.stringify(profile('custom-direction')));
  const custom = await prepareProject({ ...files, out: path.join(files.directory, 'custom-project'), style: 'poetry', styleProfile: customProfile, direction: 'My explicit direction' });
  assert.deepEqual(custom.request.extensions.style, { requested: 'poetry', applied: 'custom', source: 'custom', role: 'starting-point' });
  assert.equal(custom.request.creative.stylePrompt, undefined);
  assert.equal(custom.request.creative.direction, 'My explicit direction');
  assert.equal(JSON.parse(await readFile(path.join(custom.directory, custom.request.creative.styleProfile), 'utf8')).id, 'custom-direction');
  const customPrompt = path.join(files.directory, 'custom.md');
  await writeFile(customPrompt, '# Only my prompt');
  const promptOnly = await prepareProject({ ...files, out: path.join(files.directory, 'prompt-project'), style: '3', stylePrompt: customPrompt });
  assert.equal(promptOnly.request.creative.styleProfile, undefined);
  assert.equal(await readFile(path.join(promptOnly.directory, promptOnly.request.creative.stylePrompt), 'utf8'), '# Only my prompt');
});

test('unknown styles fail before creating output, even with custom style inputs', async t => {
  const files = await fixture(t);
  await assert.rejects(prepareProject({ ...files, style: '../private', audio: 'missing', stylePrompt: 'missing' }), /Unknown style/);
  await assert.rejects(stat(files.out), { code: 'ENOENT' });
  const out = path.join(files.directory, 'bad-export');
  await assert.rejects(exportStyle({ id: '99', out, root: files.styleRoot }), /Unknown style/);
  await assert.rejects(stat(out), { code: 'ENOENT' });
});
