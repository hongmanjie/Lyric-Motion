import path from 'node:path';
import {lstat, readFile, realpath, mkdir, copyFile} from 'node:fs/promises';

const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};
const allowed = new Set(['.md', '.svg', '.png', '.jpg', '.webp', '.mjs', '.json']);
const reserved = new Set(['profile.json', 'prompt.md', 'style-profile.json', 'style-prompt.md']);

/** Only explicitly declared, local, regular assets travel with a style. Never execute them here. */
export async function readStyleAssets(profileFile) {
  if (!profileFile) return [];
  const profile = JSON.parse((await readFile(profileFile, 'utf8')).replace(/^\uFEFF/, ''));
  const declared = profile.extensions?.assets;
  if (declared === undefined) return [];
  if (!declared || Array.isArray(declared) || typeof declared !== 'object' || Object.keys(declared).length > 8) throw Error('Style assets must be a map of at most eight local files');
  const root = path.dirname(path.resolve(profileFile)), resolvedRoot = await realpath(root), assets = [], seen = new Set();
  for (const [role, relative] of Object.entries(declared)) {
    if (!/^[a-z][a-zA-Z0-9]{0,39}$/.test(role) || typeof relative !== 'string' || /[\\:\x00-\x1f<>"|?*]/.test(relative) || relative.split('/').some(p => !p || p === '.' || p === '..') || !allowed.has(path.extname(relative).toLowerCase()) || reserved.has(relative.toLowerCase())) throw Error(`Invalid style asset: ${role}`);
    const source = path.resolve(root, relative);
    if (!inside(root, source) || seen.has(relative.toLowerCase())) throw Error(`Invalid or duplicate style asset: ${relative}`);
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw Error(`Style assets cannot pass through a link: ${relative}`);
    }
    const info = await lstat(source);
    if (!info.isFile() || info.size > 8 * 1024 * 1024 || !inside(resolvedRoot, await realpath(source))) throw Error(`Style asset must be a local regular file under 8 MiB: ${relative}`);
    seen.add(relative.toLowerCase());
    assets.push({role, path: relative, source});
  }
  return assets;
}

export async function copyStyleAssets(assets, destination) {
  for (const asset of assets) {
    const output = path.resolve(destination, asset.path);
    if (!inside(path.resolve(destination), output)) throw Error('Style asset escapes destination');
    await mkdir(path.dirname(output), {recursive: true});
    await copyFile(asset.source, output);
  }
  return Object.fromEntries(assets.map(({role, path: relative}) => [role, relative]));
}
