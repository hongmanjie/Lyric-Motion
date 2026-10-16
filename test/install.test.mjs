import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { installSkill, collectInstallSources } from '../tools/install.mjs';

const exec = promisify(execFile);
const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../qa/install-tests');

async function fixture(t) {
  await fs.mkdir(fixtureRoot, { recursive: true });
  const folder = await fs.mkdtemp(path.join(fixtureRoot, 'case-'));
  t.after(async () => {
    assert.ok(path.relative(fixtureRoot, folder) && !path.relative(fixtureRoot, folder).startsWith('..'));
    await fs.rm(folder, { recursive: true, force: true });
  });
  const source = path.join(folder, 'source');
  const entries = {
    'package.json': '{"type":"module"}',
    'LICENSE': 'MIT License\n\nCopyright (c) Lyric Motion contributors\n',
    'THIRD_PARTY_NOTICES.md': '# Third-party notices\n\nDemo font: SIL Open Font License 1.1.\n',
    'skills/lyric-motion/SKILL.md': '---\nname: lyric-motion\ndescription: Create a music video.\n---\nUse toolkit/tools/cli.mjs.\n',
    'lib/value.mjs': 'export const value = "portable";\n',
    'tools/cli.mjs': 'import { value } from "../lib/value.mjs"; console.log(value);\n',
    'templates/artwork.js': 'export const readyToRender = false;\n',
    'src/runtime.js': 'export const runtime = true;\n',
    'schemas/project.schema.json': '{}',
    'examples/demo/config/project.json': '{"width":1920}',
    'examples/vocal-demo/provenance.json': '{"recording":{"license":"CC0-1.0"}}',
    'examples/vocal-demo/assets/source.ogg': 'public CC0 fixture recording',
    'examples/vocal-demo/renders/final.mp4': 'ignore generated vocal render',
    'examples/vocal-demo/qa/review.json': 'ignore generated vocal review',
    'examples/styles/playground/profile.json': '{"id":"playground"}',
    'examples/styles/playground/prompt.md': '# Playful type\n',
    'examples/styles/storybook/profile.json': '{"id":"storybook"}',
    'examples/styles/storybook/prompt.md': '# Hand-drawn lyric story\n',
    'examples/style-assets/OFL.txt': 'SIL Open Font License\n',
    'examples/demo/renders/generated.mp4': 'ignore this generated output',
    'examples/demo/qa/viewing.md': 'ignore this generated check',
    'projects/private/input/audio.mp3': 'private song',
    'input/reference.mp4': 'private footage',
  };
  for (const [relative, contents] of Object.entries(entries)) {
    const file = path.join(source, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents);
  }
  return { folder, source, target: path.join(folder, 'consumer') };
}

test('installs a portable, allowlisted Codex toolkit and remains unchanged after generated output', async t => {
  const { folder, source, target } = await fixture(t);
  const sources = await collectInstallSources(source);
  assert.ok(sources.length >= 8);
  assert.ok(sources.every(file => !file.destination.includes('private') && !file.destination.includes('/renders/') && !file.destination.includes('/qa/') && !file.destination.includes('reference.mp4')));
  const report = await installSkill({ agent: 'codex', target, sourceRoot: source });
  assert.equal(report.status, 'installed');
  assert.equal(report.path, path.join(target, '.agents', 'skills', 'lyric-motion'));
  for (const notice of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    assert.deepEqual(await fs.readFile(path.join(report.path, 'toolkit', notice)), await fs.readFile(path.join(source, notice)));
  }
  for (const relative of ['examples/styles/storybook/profile.json', 'examples/styles/storybook/prompt.md', 'examples/vocal-demo/provenance.json', 'examples/vocal-demo/assets/source.ogg']) {
    assert.deepEqual(await fs.readFile(path.join(report.path, 'toolkit', relative)), await fs.readFile(path.join(source, relative)));
  }
  const render = path.join(report.path, 'toolkit/examples/demo/renders/generated.mp4');
  await fs.mkdir(path.dirname(render), { recursive: true });
  await fs.writeFile(render, 'new local render');
  assert.equal((await installSkill({ agent: 'codex', target, sourceRoot: source })).status, 'unchanged');
  await fs.rename(source, path.join(folder, 'original-moved'));
  const { stdout } = await exec(process.execPath, [path.join(report.path, 'toolkit/tools/cli.mjs')], { cwd: target });
  assert.equal(stdout.trim(), 'portable');
});

test('supports Claude Code project installation without global writes', async t => {
  const { source, target } = await fixture(t);
  const report = await installSkill({ agent: 'claude-code', target, sourceRoot: source });
  assert.equal(report.path, path.join(target, '.claude', 'skills', 'lyric-motion'));
  await assert.rejects(installSkill({ agent: 'other', target, sourceRoot: source }), /Choose --agent/);
  await assert.rejects(installSkill({ agent: 'codex', sourceRoot: source }), /explicit --target/);
});

test('refuses edited, extra, or stale installed files without overwriting them', async t => {
  const { source, target } = await fixture(t);
  const report = await installSkill({ agent: 'codex', target, sourceRoot: source });
  const installed = path.join(report.path, 'SKILL.md');
  const original = await fs.readFile(installed, 'utf8');
  await fs.writeFile(installed, 'user changes');
  await assert.rejects(installSkill({ agent: 'codex', target, sourceRoot: source }), /was modified/);
  assert.equal(await fs.readFile(installed, 'utf8'), 'user changes');
  await fs.writeFile(installed, original);
  const extra = path.join(report.path, 'notes.md');
  await fs.writeFile(extra, 'user notes');
  await assert.rejects(installSkill({ agent: 'codex', target, sourceRoot: source }), /added or missing/);
  await fs.unlink(extra);
  await fs.appendFile(path.join(source, 'lib/value.mjs'), '// source update\n');
  await assert.rejects(installSkill({ agent: 'codex', target, sourceRoot: source }), /differs from this source/);
  assert.equal(await fs.readFile(installed, 'utf8'), original);
});

test('refuses source and destination directory links', async t => {
  const { folder, source, target } = await fixture(t);
  const outside = path.join(folder, 'outside');
  await fs.mkdir(outside);
  const link = path.join(source, 'lib/linked');
  try { await fs.symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.skip('Directory link creation is unavailable on this host'); return; } throw error; }
  await assert.rejects(installSkill({ agent: 'codex', target, sourceRoot: source }), /source symlink/);
  await fs.unlink(link);
  await fs.mkdir(target, { recursive: true });
  await fs.symlink(outside, path.join(target, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installSkill({ agent: 'codex', target, sourceRoot: source }), /Symlinks and junctions/);
  assert.deepEqual(await fs.readdir(outside), []);
});
