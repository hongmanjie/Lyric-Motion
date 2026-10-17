import path from 'node:path';
import { copyFile, lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseLyrics } from './lyrics.mjs';
import {validateStyle} from './reference.mjs';
import {getStyle,resolveStyleId} from './styles.mjs';
import {readStyleAssets,copyStyleAssets} from './style-pack.mjs';

const execute = promisify(execFile);
const ASPECTS = { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080] };
const FPS = 30;

async function existingFile(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a file path`);
  const file = path.resolve(value);
  const stat = await lstat(file).catch(error => {
    if (error.code === 'ENOENT') throw new Error(`${label} file does not exist: ${file}`);
    throw error;
  });
  // Refuse symlinks rather than importing an unexpected target or directory.
  if (!stat.isFile()) throw new Error(`${label} must be a regular file: ${file}`);
  return file;
}

async function unusedDirectory(out, force) {
  if (typeof out !== 'string' || !out.trim()) throw new Error('out must be a new project directory');
  const target = path.resolve(out);
  const found = await lstat(target).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (found) throw new Error(`Project already exists: ${target}. Choose a new directory.${force ? ' --force never deletes or overwrites an existing project.' : ''}`);
  return target;
}

async function audioDuration(audio) {
  let stdout;
  try {
    ({ stdout } = await execute(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,duration', '-of', 'json', audio,
    ], { windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024 }));
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('ffprobe is required to inspect the real song duration. Install FFmpeg or set FFPROBE_PATH.');
    throw new Error(`Cannot read audio with ffprobe: ${error.stderr?.trim() || error.message}`);
  }
  let metadata;
  try { metadata = JSON.parse(stdout); } catch { throw new Error('ffprobe returned invalid media metadata'); }
  const stream = metadata.streams?.find(value => value.codec_type === 'audio');
  if (!stream) throw new Error('The input file has no audio stream');
  const streamDuration = Number(stream.duration);
  const duration = Number.isFinite(streamDuration) && streamDuration > 0 ? streamDuration : Number(metadata.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('The audio must have a finite, positive duration');
  return duration;
}

function extension(file, fallback) {
  const ext = path.extname(file).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : fallback;
}

const json = value => `${JSON.stringify(value, null, 2)}\n`;

/** Import one song into a new, independent project; never overwrite an existing project. */
export async function prepareProject({ audio, lyrics, out, aspect = '16:9', direction = '', reference, style = 'auto', styleProfile, stylePrompt, styleRoot, force = false, templateRoot } = {}) {
  if (!Object.hasOwn(ASPECTS, aspect)) throw new Error('aspect must be 16:9, 9:16, or 1:1');
  if (typeof direction !== 'string') throw new TypeError('direction must be text');
  const selectedStyle = resolveStyleId(style);
  const customStyle = styleProfile !== undefined || stylePrompt !== undefined;
  // A supplied custom bundle replaces the built-in bundle as a unit: never silently mix two directions.
  const builtin = customStyle ? null : await getStyle(selectedStyle, { root: styleRoot });
  const destination = await unusedDirectory(out, force);
  const audioFile = await existingFile(audio, 'audio');
  const lyricsFile = await existingFile(lyrics, 'lyrics');
  const format = path.extname(lyricsFile).slice(1).toLowerCase();
  if (!['lrc', 'srt', 'txt'].includes(format)) throw new Error('lyrics must use .lrc, .srt, or .txt');
  const referenceFile = reference === undefined ? null : await existingFile(reference, 'reference');
  const profileFile=styleProfile===undefined?(builtin?.profilePath??null):await existingFile(styleProfile,'style profile');
  const promptFile=stylePrompt===undefined?(builtin?.promptPath??null):await existingFile(stylePrompt,'style prompt');
  if(profileFile)validateStyle(JSON.parse((await readFile(profileFile,'utf8')).replace(/^\uFEFF/,'')));
  const styleAssets = await readStyleAssets(profileFile);
  const starter = templateRoot === undefined ? null : await existingFile(path.join(templateRoot, 'artwork.js'), 'artwork template');
  const raw = await readFile(lyricsFile);
  const realDuration = await audioDuration(audioFile);
  const frames = Math.floor(realDuration * FPS + 1e-8);
  if (frames < 1) throw new Error('Audio is shorter than one 30fps video frame');
  const duration = frames / FPS;
  const timeline = parseLyrics(raw.toString('utf8'), { format, duration });
  const [width, height] = ASPECTS[aspect];
  const audioAsset = `assets/audio${extension(audioFile, '.audio')}`;
  const lyricsAsset = `assets/lyrics.${format}`;
  const referenceAsset = referenceFile ? `assets/reference${extension(referenceFile, '.video')}` : null;
  const project = {
    title: path.basename(audioFile, path.extname(audioFile)), width, height, fps: FPS, duration,
    previewDuration: Math.min(15, duration), audio: audioAsset, timeline: 'timeline.json',
    artwork: 'artwork.js', readyToRender: false,
  };
  const request = {
    schemaVersion: '0.1.0',
    assets: { audio: audioAsset, lyrics: { format, path: lyricsAsset }, ...(referenceAsset ? { reference: { path: referenceAsset } } : {}) },
    creative: { mode: referenceFile ? 'reference' : 'free', direction, ...(profileFile?{styleProfile:'style/style-profile.json'}:{}), ...(promptFile?{stylePrompt:'style/style-prompt.md'}:{}), ...(styleAssets.length?{styleAssets:Object.fromEntries(styleAssets.map(asset=>[asset.role,`style/${asset.path}`]))}:{}) },
    output: { aspectRatio: aspect, fps: FPS },
    extensions: { style: { requested: selectedStyle, applied: customStyle ? 'custom' : selectedStyle, source: customStyle ? 'custom' : selectedStyle === 'auto' ? 'auto' : 'builtin', role: 'starting-point' } },
  };
  const state = {
    schemaVersion: '0.1.0', status: timeline.alignment.quality === 'unaligned' ? 'needs_input' : 'prepared',
    reason: timeline.alignment.quality === 'unaligned' ? 'needs_alignment' : null,
  };
  // Check everything above before creating anything. Exclusive mkdir closes the usual overwrite race.
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(destination);
  await mkdir(path.join(destination, 'assets'));
  await mkdir(path.join(destination, 'config'));
  await copyFile(audioFile, path.join(destination, audioAsset));
  await writeFile(path.join(destination, lyricsAsset), raw, { flag: 'wx' });
  if (referenceFile) await copyFile(referenceFile, path.join(destination, referenceAsset));
  if(profileFile||promptFile){await mkdir(path.join(destination,'style'));if(profileFile)await copyFile(profileFile,path.join(destination,'style/style-profile.json'));if(promptFile)await copyFile(promptFile,path.join(destination,'style/style-prompt.md'));}
  await copyStyleAssets(styleAssets, path.join(destination,'style'));
  if (starter) await copyFile(starter, path.join(destination, 'artwork.js'));
  else await writeFile(path.join(destination, 'artwork.js'), [
    'export const readyToRender = false;',
    'export const cuts = [];',
    'export async function createArtwork({ ctx, project }) {',
    '  return { render() { ctx.fillStyle = "#f4f4ef"; ctx.fillRect(0, 0, project.width, project.height); } };',
    '}', '',
  ].join('\n'), { flag: 'wx' });
  for (const [file, value] of Object.entries({ 'config/project.json': project, 'timeline.json': timeline, 'request.json': request, 'state.json': state })) {
    await writeFile(path.join(destination, file), json(value), { flag: 'wx' });
  }
  return { directory: destination, project, timeline, request, state };
}
