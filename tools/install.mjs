import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TOOLKIT_SOURCE_PATHS = Object.freeze([
  'package.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'lib', 'tools', 'templates', 'src', 'schemas', 'examples/demo', 'examples/styles', 'examples/style-assets',
]);
const SKILL_SOURCE = 'skills/lyric-motion';
const MANIFEST = '.lyric-motion-install.json';
const GENERATED_DIRS = new Set(['qa', 'renders', 'output', '.cache', 'node_modules', '.git']);

export function excludedPackagePath(relative) {
  const parts = relative.replaceAll('\\', '/').split('/');
  return parts.some(part => GENERATED_DIRS.has(part)) || /(?:\.tmp|\.bak|~)$/.test(parts.at(-1)) || parts.at(-1) === '.DS_Store';
}

function inside(base, candidate) {
  const relative = path.relative(base, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function exists(file) {
  try { return await fs.lstat(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function assertNoLinks(file) {
  const absolute = path.resolve(file);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = await exists(current);
    if (!stat) break;
    if (stat.isSymbolicLink()) throw new Error(`Symlinks and junctions are not supported: ${current}`);
    if (current !== absolute && !stat.isDirectory()) throw new Error(`Expected directory: ${current}`);
  }
}

async function walk(sourceRoot, relative, destination, files) {
  if (excludedPackagePath(relative)) return;
  const absolute = path.resolve(sourceRoot, relative);
  if (!inside(sourceRoot, absolute)) throw new Error(`Source escapes toolkit root: ${relative}`);
  const stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Refusing source symlink: ${relative}`);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(absolute);
    entries.sort();
    for (const entry of entries) await walk(sourceRoot, path.join(relative, entry), `${destination}/${entry}`, files);
  } else if (stat.isFile()) {
    const bytes = await fs.readFile(absolute);
    files.push({ source: absolute, destination: destination.replaceAll('\\', '/'), sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length });
  } else throw new Error(`Unsupported source file: ${relative}`);
}

/** The exact public allowlist used by installation and release packaging, including required notices. */
export async function collectInstallSources(sourceRoot = REPO_ROOT) {
  const absolute = path.resolve(sourceRoot);
  await assertNoLinks(absolute);
  const files = [];
  await walk(absolute, SKILL_SOURCE, '', files);
  for (const relative of TOOLKIT_SOURCE_PATHS) await walk(absolute, relative, `toolkit/${relative}`, files);
  for (const file of files) file.destination = file.destination.replace(/^\//, '');
  files.sort((a, b) => a.destination.localeCompare(b.destination));
  if (!files.some(file => file.destination === 'SKILL.md')) throw new Error('Missing skills/lyric-motion/SKILL.md');
  if (!files.some(file => file.destination === 'toolkit/tools/cli.mjs')) throw new Error('Missing toolkit CLI');
  return files;
}

function sourceHash(files) {
  return createHash('sha256').update(files.map(file => `${file.destination}\0${file.sha256}\0${file.size}`).join('\n')).digest('hex');
}

async function installedFiles(root, relative = '') {
  const found = [];
  for (const name of (await fs.readdir(path.join(root, relative))).sort()) {
    const child = path.join(relative, name);
    if (excludedPackagePath(child)) continue;
    const stat = await fs.lstat(path.join(root, child));
    if (stat.isSymbolicLink()) throw new Error(`Installed skill contains a symlink: ${child}`);
    if (stat.isDirectory()) found.push(...await installedFiles(root, child));
    else if (stat.isFile()) found.push(child.replaceAll('\\', '/'));
    else throw new Error(`Installed skill contains an unsupported file: ${child}`);
  }
  return found;
}

async function verifyUnchanged(destination, files, digest) {
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(destination, MANIFEST), 'utf8')); }
  catch { throw new Error(`Conflicting installation at ${destination}. Choose another target or move the existing skill aside.`); }
  if (manifest.sourceHash !== digest) throw new Error(`Installed skill differs from this source: ${destination}. Move it aside before installing this version.`);
  const expected = [...files.map(file => file.destination), MANIFEST].sort();
  const actual = (await installedFiles(destination)).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Installed skill contains added or missing files: ${destination}. Existing content was preserved.`);
  for (const file of files) {
    const bytes = await fs.readFile(path.join(destination, file.destination));
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Installed file was modified: ${file.destination}. Existing content was preserved.`);
  }
}

/** Install into one explicitly selected project; never writes to a global home. */
export async function installSkill({ agent, target, sourceRoot = REPO_ROOT } = {}) {
  if (!['codex', 'claude-code'].includes(agent)) throw new Error('Choose --agent codex or --agent claude-code');
  if (typeof target !== 'string' || !target.trim()) throw new Error('An explicit --target project directory is required');
  const targetRoot = path.resolve(target);
  await assertNoLinks(targetRoot);
  const targetStat = await exists(targetRoot);
  if (targetStat && !targetStat.isDirectory()) throw new Error(`Target is not a directory: ${targetRoot}`);
  const destination = path.join(targetRoot, agent === 'codex' ? '.agents' : '.claude', 'skills', 'lyric-motion');
  if (!inside(targetRoot, destination)) throw new Error('Installation path escapes target');
  await assertNoLinks(destination);
  const files = await collectInstallSources(sourceRoot);
  const digest = sourceHash(files);
  const report = { agent, path: destination, fileCount: files.length, sourceHash: digest };
  if (await exists(destination)) {
    await verifyUnchanged(destination, files, digest);
    return { status: 'unchanged', ...report };
  }

  const parent = path.dirname(destination);
  await fs.mkdir(parent, { recursive: true });
  await assertNoLinks(parent);
  const temporary = path.join(parent, `.lyric-motion-install-${randomUUID()}`);
  await fs.mkdir(temporary);
  try {
    for (const file of files) {
      const output = path.resolve(temporary, file.destination);
      if (!inside(temporary, output)) throw new Error('Invalid package path');
      const bytes = await fs.readFile(file.source);
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Source changed during installation: ${file.source}. Retry after edits complete.`);
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, bytes, { flag: 'wx' });
    }
    await fs.writeFile(path.join(temporary, MANIFEST), `${JSON.stringify({ format: 1, agent, sourceHash: digest, files: files.map(({ destination, sha256, size }) => ({ path: destination, sha256, size })) }, null, 2)}\n`, { flag: 'wx' });
    await assertNoLinks(destination);
    if (await exists(destination)) throw new Error(`Installation appeared while copying: ${destination}. Existing content was preserved.`);
    await fs.rename(temporary, destination);
    return { status: 'installed', ...report };
  } finally {
    // Only the verified temporary child created above is ever removed.
    if (inside(parent, temporary) && path.basename(temporary).startsWith('.lyric-motion-install-')) await fs.rm(temporary, { recursive: true, force: true });
  }
}
