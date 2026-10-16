import path from 'node:path';
import { lstat, readFile, mkdir, copyFile } from 'node:fs/promises';
import { REPO_ROOT } from './paths.mjs';
import { validateStyle } from './reference.mjs';

export const STYLE_CATALOG = Object.freeze([
  Object.freeze({ id: 'auto', number: 0, name: 'AI 自由创作', description: 'Let the agent choose an original direction for this song.', aliases: ['0'] }),
  Object.freeze({ id: 'playground', number: 1, name: '字形游乐场', description: 'Playful typography, bold scale, and physical wordplay.', aliases: ['1', '字形游乐场'] }),
  Object.freeze({ id: 'poetry', number: 2, name: '流动诗境', description: 'Poetic space, flowing forms, and expressive restraint.', aliases: ['2', '流动诗境'] }),
  Object.freeze({ id: 'sculpture', number: 3, name: '数字雕塑', description: 'Dimensional letterforms, spatial relationships, and sculptural light.', aliases: ['3', '数字雕塑'] }),
  Object.freeze({ id: 'storybook', number: 4, name: '故事手绘', description: 'Hand-drawn characters, objects, and changing scenes that perform the lyric story.', aliases: ['4', '故事手绘'] }),
]);

export function resolveStyleId(value = 'auto') {
  const key = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().toLowerCase() : '';
  const entry = STYLE_CATALOG.find(style => style.id === key || style.aliases.includes(key));
  if (!entry) throw new Error(`Unknown style: ${String(value)}. Choose auto/0, playground/1, poetry/2, sculpture/3, or storybook/4.`);
  return entry.id;
}

async function readRegular(file) {
  const stat = await lstat(file).catch(error => {
    if (error.code === 'ENOENT') throw new Error(`Built-in style asset is missing: ${file}`);
    throw error;
  });
  if (!stat.isFile()) throw new Error(`Built-in style asset must be a regular file: ${file}`);
  return readFile(file);
}

/** Resolve only reusable preferences. The showcase artwork is never an import template. */
export async function getStyle(value = 'auto', { root = REPO_ROOT } = {}) {
  const id = resolveStyleId(value);
  const entry = STYLE_CATALOG.find(style => style.id === id);
  if (id === 'auto') return { ...entry, profilePath: null, promptPath: null };
  const directory = path.join(path.resolve(root), 'examples', 'styles', id);
  const profilePath = path.join(directory, 'profile.json');
  const promptPath = path.join(directory, 'prompt.md');
  const profileBytes = await readRegular(profilePath);
  let profile;
  try { profile = JSON.parse(profileBytes.toString('utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error(`Built-in style profile is not valid JSON: ${profilePath}`); }
  validateStyle(profile);
  if (!profile.id || !profile.summary || !profile.provenance) throw new Error(`Built-in style profile lacks its identity or provenance: ${profilePath}`);
  const prompt = await readRegular(promptPath);
  if (!prompt.toString('utf8').trim()) throw new Error(`Built-in style prompt is empty: ${promptPath}`);
  return { ...entry, profilePath, promptPath };
}

/** Listing validates actual shipped profile/prompt files rather than advertising missing presets. */
export async function listStyles(options = {}) {
  return Promise.all(STYLE_CATALOG.map(style => getStyle(style.id, options)));
}

/** Optional independent bundle export; an existing destination is always preserved. */
export async function exportStyle({ id, out, root = REPO_ROOT } = {}) {
  const style = await getStyle(id, { root });
  if (out === undefined) return style;
  if (style.id === 'auto') throw new Error('auto has no fixed profile or prompt to export. Omit --out or choose a named style.');
  if (typeof out !== 'string' || !out.trim()) throw new Error('Style export needs a new --out directory');
  const directory = path.resolve(out);
  if (await lstat(directory).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) throw new Error(`Style export already exists: ${directory}. Choose a new directory.`);
  await mkdir(path.dirname(directory), { recursive: true });
  await mkdir(directory);
  await copyFile(style.profilePath, path.join(directory, 'style-profile.json'));
  await copyFile(style.promptPath, path.join(directory, 'style-prompt.md'));
  return { id: style.id, name: style.name, directory, profilePath: path.join(directory, 'style-profile.json'), promptPath: path.join(directory, 'style-prompt.md'), note: 'Reusable preferences only. No showcase artwork was copied.' };
}
