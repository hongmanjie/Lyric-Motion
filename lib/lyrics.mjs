const FORMATS = new Set(['lrc', 'srt', 'txt']);

// Keep source annotations available without performing them as sung words.
// Only unmistakable labels are classified; ambiguous prose remains a lyric.
function cueKind(text) {
  if (/^(?:作词|作曲|词曲|编曲|演唱|原唱|歌手|制作人|制作|录音|混音|母带|和声|吉他|贝斯|鼓|监制|出品|发行|词|曲|lyricist|composer|arranger|lyrics by|written by|vocals?|singer)\s*[:：]\s*\S/iu.test(text)) return 'credit';
  const compact = text.replace(/[\s,，。.!！:：]/gu, '').toLowerCase();
  if (/^(?:纯音乐(?:请欣赏)?|instrumental(?:music)?|musiconly)$/.test(compact)) return 'instrumental-marker';
  if (/^(?:欢迎(?:来访|访问)|更多(?:歌曲|歌词)|下载(?:歌曲|音乐))/u.test(text) && /(?:https?:\/\/|www\.)\S+/iu.test(text)) return 'source-notice';
  return null;
}

function number(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function lrcTime(value) {
  const match = /^(?:(\d+):)?(\d+):(\d{2})(?:[.:](\d{1,3}))?$/.exec(value);
  if (!match) throw new Error(`Invalid LRC timestamp: ${value}`);
  const [, hours, minutes, seconds, fraction = ''] = match;
  if (Number(seconds) >= 60 || (hours !== undefined && Number(minutes) >= 60)) throw new Error(`Invalid LRC timestamp: ${value}`);
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(`0.${fraction || '0'}`);
}

function srtTime(value) {
  const match = /^(\d+):(\d{2}):(\d{2})[,.](\d{3})$/.exec(value.trim());
  if (!match || Number(match[2]) >= 60 || Number(match[3]) >= 60) throw new Error(`Invalid SRT timestamp: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function parseLrc(text, offset) {
  const records = [];
  const offsets = [...text.matchAll(/^\s*\[offset\s*:\s*([^\]]+)\]\s*$/gim)];
  const declared = offsets.at(-1);
  if (declared && !/^[+-]?\d+$/.test(declared[1].trim())) throw new Error('LRC offset must be an integer number of milliseconds');
  const shift = offset + (declared ? Number(declared[1]) / 1000 : 0);
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (!line || /^\[[A-Za-z][\w-]*\s*:.*\]$/.test(line)) continue;
    let rest = line;
    const times = [];
    while (rest.startsWith('[')) {
      const tag = /^\[([^\]]+)\]/.exec(rest);
      if (!tag) throw new Error(`Unclosed LRC tag at line ${index + 1}`);
      times.push(lrcTime(tag[1]) + shift);
      rest = rest.slice(tag[0].length);
    }
    if (!times.length) throw new Error(`LRC line ${index + 1} has no timestamp; use TXT for untimed lyrics`);
    // Enhanced LRC word timestamps are not promoted to reliable word alignment.
    const content = rest.replace(/<\d+(?::\d+){1,2}(?:[.:]\d{1,3})?>/g, '').trim();
    // Empty timestamped rows end a previous lyric during an instrumental gap.
    for (const start of times) records.push({ text: content, start });
  }
  return records;
}

function parseSrt(text, offset) {
  const records = [];
  for (const [index, block] of text.trim().split(/\n\s*\n/).entries()) {
    const parts = block.split('\n');
    if (/^\s*\d+\s*$/.test(parts[0])) parts.shift();
    const timing = parts.shift();
    const match = /^\s*(\S+)\s*-->\s*(\S+)(?:\s+.*)?$/.exec(timing ?? '');
    if (!match) throw new Error(`SRT cue ${index + 1} has no valid timing line`);
    const start = srtTime(match[1]) + offset;
    const end = srtTime(match[2]) + offset;
    if (end <= start) throw new Error(`SRT cue ${index + 1} must end after it starts`);
    const content = parts.join('\n').trim();
    if (content) records.push({ text: content, start, end });
  }
  return records;
}

/** Parse line timing honestly. TXT remains unaligned and contains no invented timing. */
export function parseLyrics(text, { format, duration, offset = 0 } = {}) {
  if (typeof text !== 'string') throw new TypeError('Lyrics must be text');
  number(duration, 'duration');
  number(offset, 'offset');
  if (duration <= 0) throw new RangeError('duration must be positive');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const source = String(format ?? (/-->/.test(normalized) ? 'srt' : /\[\d+:\d/.test(normalized) ? 'lrc' : 'txt')).toLowerCase().replace(/^\./, '');
  if (!FORMATS.has(source)) throw new Error(`Unsupported lyric format: ${source}`);
  if (!normalized.trim()) throw new Error('Lyrics are empty');
  if (source === 'txt') {
    const lines = normalized.split('\n').map(value => value.trim()).filter(Boolean).map((value, index) => ({
      id: `line-${String(index + 1).padStart(4, '0')}`, text: value, start: null, end: null, tokens: [],
    }));
    return { language: 'und', duration, alignment: { quality: 'unaligned', source }, beats: [], lines };
  }
  const records = (source === 'lrc' ? parseLrc(normalized, offset) : parseSrt(normalized, offset)).sort((a, b) => a.start - b.start || (a.end ?? 0) - (b.end ?? 0));
  if (source === 'lrc') {
    let nextStart = duration;
    for (let index = records.length - 1; index >= 0; index--) {
      if (index === records.length - 1 || records[index + 1].start > records[index].start) nextStart = records[index + 1]?.start ?? duration;
      records[index].end = nextStart;
    }
  }
  const bounded = records.filter(record => record.text && record.start < duration && record.end > 0).map(record => ({
    ...record, start: Math.max(0, record.start), end: Math.min(duration, record.end),
  }));
  const seen = new Set();
  const unique = bounded.filter(record => {
    const key = JSON.stringify([record.start, record.end ?? null, record.text]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const annotations = unique.flatMap(record => { const kind = cueKind(record.text); return kind ? [{ ...record, kind }] : []; });
  const vocal = unique.filter(record => cueKind(record.text) === null);
  const metadata = annotations.length ? { annotations } : undefined;
  if (!vocal.length && annotations.some(record => record.kind === 'instrumental-marker')) {
    return { language: 'und', duration, content: { kind: 'instrumental', evidence: 'provided-marker' }, alignment: { quality: 'not-applicable', source }, beats: [], lines: [], metadata };
  }
  const lines = vocal.map((record, index) => ({
    id: `line-${String(index + 1).padStart(4, '0')}`,
    text: record.text,
    start: record.start,
    end: record.end,
    tokens: [],
  }));
  if (!lines.length) throw new Error('No timed lyric cues fall within the audio duration');
  return { language: 'und', duration, alignment: { quality: 'line-timed', source }, beats: [], lines, ...(metadata ? { metadata } : {}) };
}
