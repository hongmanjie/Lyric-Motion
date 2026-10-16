import path from 'node:path';
import { lstat, realpath, mkdir, mkdtemp, readFile, writeFile, copyFile, rename, rm, unlink } from 'node:fs/promises';
import { REPO_ROOT, inside, writeJSON } from './paths.mjs';
import { prepareReference } from './reference.mjs';

const VERSION = '0.1.0';
const STATUS = ['observed', 'inferred', 'unknown'];
const EPS = .0001;
const LOOK = ['composition', 'typography', 'materials', 'color'];
const isText = value => typeof value === 'string' && value.trim().length > 0;
function requireThat(value, message) { if (!value) throw new Error(`Reconstruction analysis: ${message}`); }
function object(value, label) { requireThat(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`); }
function strings(value, label, minimum = 0) { requireThat(Array.isArray(value) && value.length >= minimum && value.every(isText), `${label} must contain text`); }
function inRange(time, range) { return Number.isFinite(time) && time >= range.start - EPS && time <= range.end + EPS; }
function timeRange(value, label, parent) {
  object(value, label);
  requireThat(Number.isFinite(value.start) && Number.isFinite(value.end) && value.start >= 0 && value.end > value.start, `${label} needs start < end`);
  if (parent) requireThat(inRange(value.start, parent) && inRange(value.end, parent), `${label} is outside source range`);
}
function evidenceAsset(value) {
  return typeof value === 'string' && /^evidence\/.+\.(png|jpe?g|webp)$/i.test(value) && !/[\\\u0000-\u001f]/.test(value) && !value.split('/').some(part => part === '..' || part === '.' || !part);
}
const covered = (start, end, ranges) => ranges.some(range => start >= range.start - EPS && end <= range.end + EPS);

/** Checks authored evidence/coverage, not whether an agent really watched or heard a file. */
export function validateReconstruction(analysis) {
  object(analysis, 'root');
  requireThat(analysis.schemaVersion === VERSION, 'unsupported schemaVersion');
  requireThat(isText(analysis.title), 'title is required');
  const source = analysis.source;
  object(source, 'source'); requireThat(isText(source.label), 'source.label is required');
  timeRange(source.range, 'source.range');
  object(source.frame, 'source.frame');
  requireThat(['width', 'height'].every(key => Number.isInteger(source.frame[key]) && source.frame[key] > 0), 'source.frame needs positive dimensions');
  if (source.region !== undefined && source.region !== null) {
    object(source.region, 'source.region');
    requireThat(['x', 'y', 'width', 'height'].every(key => Number.isInteger(source.region[key])) && source.region.x >= 0 && source.region.y >= 0 && source.region.width > 0 && source.region.height > 0 && source.region.x + source.region.width <= source.frame.width && source.region.y + source.region.height <= source.frame.height, 'source.region is outside source frame');
  }
  const coverage = analysis.coverage;
  object(coverage, 'coverage');
  requireThat(['not-observed', 'stills', 'continuous'].includes(coverage.visual), 'invalid visual coverage');
  requireThat(['not-observed', 'signal-only', 'listened'].includes(coverage.audio), 'invalid audio coverage');
  requireThat(['not-provided', 'visible-text', 'provided-text', 'timed'].includes(coverage.lyrics), 'invalid lyric coverage');
  requireThat(Array.isArray(coverage.inspectedFrames) && coverage.inspectedFrames.every(time => inRange(time, source.range)), 'inspectedFrames must use source timestamps');
  for (const key of ['watchedRanges', 'listenedRanges']) {
    requireThat(Array.isArray(coverage[key]), `${key} must be an array`);
    for (const range of coverage[key]) timeRange(range, key, source.range);
  }
  strings(coverage.limitations, 'coverage.limitations');
  requireThat(coverage.visual !== 'not-observed', 'visual observation is required before exporting a reconstruction prompt');
  if (coverage.visual === 'stills') requireThat(coverage.inspectedFrames.length > 0 && coverage.watchedRanges.length === 0, 'stills coverage needs inspected frames and no claimed watched ranges');
  if (coverage.visual === 'continuous') requireThat(coverage.watchedRanges.length > 0, 'continuous coverage needs watched ranges');
  if (coverage.audio === 'listened') requireThat(coverage.listenedRanges.length > 0, 'listened coverage needs listened ranges');
  else requireThat(coverage.listenedRanges.length === 0, 'unheard audio cannot have listened ranges');
  const seen = time => coverage.inspectedFrames.some(frame => Math.abs(frame - time) <= EPS) || covered(time, time, coverage.watchedRanges);
  const claim = (value, label, dynamic = false) => {
    object(value, label);
    requireThat(isText(value.description) && STATUS.includes(value.status), `${label} needs description and observed/inferred/unknown status`);
    if (value.evidence !== undefined) {
      requireThat(Array.isArray(value.evidence) && value.evidence.length > 0, `${label}.evidence is empty`);
      for (const item of value.evidence) {
        object(item, 'evidence');
        requireThat(inRange(item.at, source.range) && isText(item.description), `${label} evidence needs an in-range timestamp and description`);
        if (item.until !== undefined) requireThat(inRange(item.until, source.range) && item.until > item.at, `${label} evidence interval is invalid`);
        if (item.asset !== undefined) requireThat(evidenceAsset(item.asset), `${label} evidence asset must be a local evidence image`);
        if (value.status === 'observed') {
          requireThat(seen(item.at), `${label} evidence falls outside recorded viewing coverage`);
          if (dynamic) requireThat(coverage.visual === 'continuous' && item.until !== undefined && covered(item.at, item.until, coverage.watchedRanges), `${label}: observed motion/cadence needs continuous timestamped coverage`);
        }
      }
    }
    if (value.status === 'observed') requireThat(value.evidence?.length > 0, `${label}: observed claims need timestamped evidence`);
  };
  const claims = (values, label, dynamic = false) => {
    requireThat(Array.isArray(values) && values.length > 0, `${label} needs at least one claim, including unknown when unavailable`);
    values.forEach(value => claim(value, label, dynamic));
  };
  object(analysis.look, 'look');
  for (const key of LOOK) claims(analysis.look[key], `look.${key}`);
  requireThat(LOOK.some(key => analysis.look[key].some(value => value.status === 'observed')), 'at least one timestamped visual observation is required');
  for (const key of ['motion', 'transitions', 'rhythm']) claims(analysis[key], key, true);
  claims(analysis.semantics, 'semantics');
  if (coverage.lyrics === 'not-provided') requireThat(analysis.semantics.every(value => value.status !== 'observed'), 'observed semantic relations need visible or supplied text');
  requireThat(Array.isArray(analysis.scenes) && analysis.scenes.length > 0, 'scenes must describe the selected sequence');
  let previousStart = source.range.start;
  for (const scene of analysis.scenes) {
    timeRange(scene, 'scene', source.range);
    requireThat(scene.start >= previousStart - EPS, 'scenes must be ordered'); previousStart = scene.start;
    claim(scene, 'scene');
    if (scene.status === 'observed') requireThat(coverage.visual === 'continuous' && covered(scene.start, scene.end, coverage.watchedRanges), 'observed scene timing needs continuous coverage; use inferred boundaries for stills');
  }
  requireThat(isText(analysis.creativePrompt) && analysis.creativePrompt.trim().length >= 40, 'creativePrompt must be a natural production request, not an empty analysis placeholder');
  strings(analysis.negativePrompt, 'negativePrompt', 1);
  requireThat(Array.isArray(analysis.assumptions), 'assumptions must be an array');
  for (const value of analysis.assumptions) { claim(value, 'assumption'); requireThat(value.status !== 'observed', 'assumptions cannot be asserted as observations'); }
  object(analysis.technicalStack, 'technicalStack');
  requireThat(['unknown', 'inferred'].includes(analysis.technicalStack.status) && isText(analysis.technicalStack.description), 'original technical stack cannot be asserted as observed');
  return true;
}

function evidenceItems(analysis) {
  return [...LOOK.flatMap(key => analysis.look[key]), ...analysis.motion, ...analysis.transitions, ...analysis.rhythm, ...analysis.semantics, ...analysis.scenes, ...analysis.assumptions].flatMap(claim => claim.evidence || []);
}

export function formatReconstructionPrompt(analysis) {
  validateReconstruction(analysis);
  const describe = claim => `${claim.description}${claim.status === 'observed' ? '' : ` [${claim.status}]`}`;
  const headings = { composition: 'Composition', typography: 'Typography', materials: 'Materials and light', color: 'Color', motion: 'Motion mechanisms', transitions: 'Transitions', rhythm: 'Rhythm and shot cadence', semantics: 'Text and semantic relationships' };
  let text = `# ${analysis.title}\n\n## Copyable production request\n\n${analysis.creativePrompt.trim()}\n\n`;
  text += `Reference scope: source ${analysis.source.range.start}–${analysis.source.range.end}s; ${analysis.source.region?.width || analysis.source.frame.width}×${analysis.source.region?.height || analysis.source.frame.height} selected image. Aim for a similar visible result; this is an authored reconstruction request, not the recovered original secret prompt.\n`;
  for (const [key, label] of Object.entries(headings)) text += `\n### ${label}\n\n${(analysis.look[key] || analysis[key]).map(claim => `- ${describe(claim)}`).join('\n')}\n`;
  text += `\n### Sequence and timing\n\n${analysis.scenes.map(scene => `- ${scene.start}–${scene.end}s (source time): ${describe(scene)}`).join('\n')}\n`;
  text += `\n### Avoid\n\n${analysis.negativePrompt.map(value => `- ${value}`).join('\n')}\n`;
  text += `\nIf a new song or lyrics are supplied, adapt text and timing to that audio while preserving the intended visual relationships. Technical implementation is a new production choice.\n\n## Observation limits\n\nVisual: ${analysis.coverage.visual}; audio: ${analysis.coverage.audio}; lyrics: ${analysis.coverage.lyrics}.\n`;
  text += `\n- Inspected source frames: ${analysis.coverage.inspectedFrames.join(', ') || 'none recorded'}.\n- Watched source intervals: ${analysis.coverage.watchedRanges.map(range => `${range.start}–${range.end}s`).join(', ') || 'none'}.\n- Listened source intervals: ${analysis.coverage.listenedRanges.map(range => `${range.start}–${range.end}s`).join(', ') || 'none'}.\n`;
  for (const limitation of analysis.coverage.limitations) text += `- ${limitation}\n`;
  text += `\nPossible original implementation (${analysis.technicalStack.status}): ${analysis.technicalStack.description}\n`;
  if (analysis.assumptions.length) text += `\nAssumptions:\n${analysis.assumptions.map(value => `- ${describe(value)}`).join('\n')}\n`;
  return text;
}

async function unused(destination) {
  const found = await lstat(destination).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (found) throw new Error(`Reconstruction output already exists: ${destination}. Choose a new directory.`);
}
async function newBundle(out, build) {
  if (typeof out !== 'string' || !out.trim()) throw new Error('Choose a new --out directory');
  const destination = path.resolve(out); await unused(destination);
  const parent = path.dirname(destination); await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(path.join(parent, '.lyric-motion-reconstruction-'));
  try {
    const bundle = path.join(stage, 'bundle'); const result = await build(bundle);
    await unused(destination); await rename(bundle, destination);
    return { directory: destination, ...result };
  } finally {
    if (inside(parent, stage) && path.basename(stage).startsWith('.lyric-motion-reconstruction-')) await rm(stage, { recursive: true, force: true });
  }
}

export async function prepareReconstruction(options = {}) {
  return newBundle(options.out, async directory => {
    const reference = await prepareReference({ ...options, out: directory });
    const analysis = {
      schemaVersion: VERSION, title: `Reconstruction study: ${reference.source.name}`,
      source: { label: reference.source.name, range: reference.range, frame: { width: reference.source.width, height: reference.source.height }, region: reference.region },
      coverage: { visual: 'not-observed', audio: 'not-observed', lyrics: 'not-provided', inspectedFrames: [], watchedRanges: [], listenedRanges: [], limitations: [] },
      look: Object.fromEntries(LOOK.map(key => [key, []])), motion: [], transitions: [], rhythm: [], semantics: [], scenes: [], creativePrompt: '', negativePrompt: [], assumptions: [],
      technicalStack: { status: 'unknown', description: 'The original implementation cannot be determined from media preparation.' },
    };
    await writeJSON(path.join(directory, 'analysis.json'), analysis);
    await writeJSON(path.join(directory, 'state.json'), { schemaVersion: VERSION, status: 'needs-analysis', kind: 'reconstruction', finalPrompt: null, note: 'Evidence prepared only. An agent must actually observe, author, and export the prompt.' });
    await copyFile(path.join(REPO_ROOT, 'schemas/reconstruction.schema.json'), path.join(directory, 'analysis.schema.json'));
    await unlink(path.join(directory, 'reference-findings.md'));
    await writeFile(path.join(directory, 'analysis-brief.md'), '# Reconstruct a production prompt\n\nStatus: needs-analysis. No video interpretation or original-prompt recovery has happened.\n\nInspect evidence/preview.mp4 continuously and individual frames when available. Record actual source timestamps in analysis.json: frames inspected, watched/listened intervals, lyric availability and limits. Times are source times, not crop-relative times.\n\nDescribe composition, typography, materials, color, movement/transition mechanisms, cadence, sequence, and semantic relationships. Mark observations, inferences and unknowns. Sparse stills cannot establish exact easing, shot boundaries or beat synchronization. Original software is unknown unless separately supplied; any implementation suggestion remains inferred.\n\nWrite creativePrompt as a complete, natural production request capable of directing a similar visible result, rather than a list of observations. Add negative direction and assumptions. Keep timestamps for this reconstruction; use the separate style workflow when the goal is transferable principles without this sequence.\n\nAfter actual observation and authorship, run reverse-prompt --analysis <this-directory>/analysis.json --out <new-bundle-directory>. The final file will be reconstruction-prompt.md. This preparation directory intentionally contains no final prompt.\n');
    return { status: 'needs-analysis', analysis: 'analysis.json', schema: 'analysis.schema.json', preview: reference.preview, note: 'Media prepared; reconstruction analysis is performed by your agent.' };
  });
}

/** Exports an authored prompt with local still evidence, after all inputs have been checked. */
export async function exportReconstruction({ analysis, out, evidenceRoot } = {}) {
  const prompt = formatReconstructionPrompt(analysis);
  const files = new Map();
  for (const item of evidenceItems(analysis)) if (item.asset && !files.has(item.asset)) {
    if (!evidenceRoot) throw new Error('Evidence assets need the analysis file directory as evidenceRoot');
    const base = await realpath(path.resolve(evidenceRoot));
    const candidate = path.resolve(base, item.asset);
    requireThat(inside(base, candidate), 'evidence escapes analysis directory');
    const stat = await lstat(candidate);
    requireThat(stat.isFile() && inside(base, await realpath(candidate)), 'evidence must be a contained regular image');
    files.set(item.asset, candidate);
  }
  return newBundle(out, async directory => {
    await mkdir(directory);
    await writeJSON(path.join(directory, 'reconstruction.json'), analysis);
    await writeJSON(path.join(directory, 'state.json'), { schemaVersion: VERSION, status: 'authored', kind: 'reconstruction', prompt: 'reconstruction-prompt.md', note: 'Formatting/coverage validation passed; observation truth and visual fidelity still depend on the author.' });
    await writeFile(path.join(directory, 'reconstruction-prompt.md'), prompt);
    for (const [relative, source] of files) { await mkdir(path.dirname(path.join(directory, relative)), { recursive: true }); await copyFile(source, path.join(directory, relative)); }
    return { status: 'authored', prompt: 'reconstruction-prompt.md', analysis: 'reconstruction.json', evidenceImages: files.size };
  });
}
