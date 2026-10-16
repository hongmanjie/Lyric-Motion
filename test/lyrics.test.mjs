import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLyrics } from '../lib/lyrics.mjs';

test('LRC multitag repeats are sorted; duplicate copies removed without deleting choruses', () => {
  const result = parseLyrics('\uFEFF[ar:Artist]\r\n[00:04.50][00:01.20]Hello\r\n[00:01.20]Hello\r\n[00:03]World\r\n[00:06.00]Last', { format: 'lrc', duration: 8 });
  assert.deepEqual(result.lines.map(({ text, start, end }) => [text, start, end]), [
    ['Hello', 1.2, 3], ['World', 3, 4.5], ['Hello', 4.5, 6], ['Last', 6, 8],
  ]);
  assert.equal(result.alignment.quality, 'line-timed');
  assert.equal(result.alignment.source, 'lrc');
  assert.equal(new Set(result.lines.map(line => line.id)).size, 4);
  assert.deepEqual(result.lines.flatMap(line => line.tokens), []);
  assert.deepEqual(result.beats, []);
});

test('LRC declared offset uses milliseconds, external offset uses seconds, times stay in audio', () => {
  const result = parseLyrics('[offset:-200]\n[00:00.10]Beginning\n[00:02.00]Second\n[00:04.00]Outside', { format: 'lrc', duration: 3, offset: -0.1 });
  assert.equal(result.lines[0].start, 0);
  assert.ok(Math.abs(result.lines[1].start - 1.7) < 1e-10);
  assert.equal(result.lines[1].end, 3);
  assert.equal(result.lines.length, 2);
});

test('simultaneous distinct LRC phrases share the next greater timestamp', () => {
  const result = parseLyrics('[00:00.00]One\n[00:00.00]Two\n[00:01.00]Three', { format: 'lrc', duration: 2 });
  assert.deepEqual(result.lines.map(line => line.end), [1, 1, 2]);
});

test('LRC empty rows end lyrics and negative offsets discard cues that already ended', () => {
  const result = parseLyrics('[00:00]Ended before clip\n[00:01]Active at clip\n[00:03]\n[00:04]After gap', { format: 'lrc', duration: 4, offset: -1.5 });
  assert.deepEqual(result.lines.map(({ text, start, end }) => [text, start, end]), [
    ['Active at clip', 0, 1.5], ['After gap', 2.5, 4],
  ]);
});

test('enhanced LRC word tags do not become fabricated tokens', () => {
  const result = parseLyrics('[00:00.50]<00:00.50>Hello <00:00.80>world', { format: 'lrc', duration: 2 });
  assert.equal(result.lines[0].text, 'Hello world');
  assert.deepEqual(result.lines[0].tokens, []);
  assert.equal(result.alignment.quality, 'line-timed');
});

test('SRT multiline preserves explicit ends, overlapping cues, BOM, and clipping', () => {
  const result = parseLyrics('\uFEFF1\r\n00:00:00,200 --> 00:00:01,500\r\nHello\r\nworld\r\n\r\n2\r\n00:00:01,000 --> 00:00:03,000\r\nNext\r\n\r\n3\r\n00:00:03,100 --> 00:00:04,000\r\nOutside', { format: 'srt', duration: 2, offset: -0.3 });
  assert.deepEqual(result.lines.map(({ text, start, end }) => [text, start, end]), [
    ['Hello\nworld', 0, 1.2], ['Next', 0.7, 2],
  ]);
  assert.equal(result.alignment.source, 'srt');
});

test('SRT removes exact duplicate cues while retaining repeated words at later times', () => {
  const cue = '00:00:00,000 --> 00:00:01,000\nAgain';
  const result = parseLyrics(`${cue}\n\n${cue}\n\n00:00:01,000 --> 00:00:02,000\nAgain`, { format: 'srt', duration: 2 });
  assert.equal(result.lines.length, 2);
});

test('plain text is honestly unaligned, including repeated lines', () => {
  const result = parseLyrics('\uFEFF你好\r\n\r\nAgain\r\nAgain', { format: 'txt', duration: 90 });
  assert.deepEqual(result.lines.map(({ text, start, end }) => [text, start, end]), [
    ['你好', null, null], ['Again', null, null], ['Again', null, null],
  ]);
  assert.equal(result.alignment.quality, 'unaligned');
  assert.deepEqual(result.beats, []);
});

test('malformed and out-of-range-only timed inputs fail clearly', () => {
  assert.throws(() => parseLyrics('[00:99]Bad', { format: 'lrc', duration: 3 }), /timestamp/);
  assert.throws(() => parseLyrics('[offset:abc]\n[00:00]Bad', { format: 'lrc', duration: 3 }), /offset/);
  assert.throws(() => parseLyrics('Untimed', { format: 'lrc', duration: 3 }), /no timestamp/);
  assert.throws(() => parseLyrics('[00:03]Outside', { format: 'lrc', duration: 3 }), /No timed/);
  assert.throws(() => parseLyrics('00:00:02,000 --> 00:00:01,000\nBackwards', { format: 'srt', duration: 3 }), /end after/);
  assert.throws(() => parseLyrics('00:60:00,000 --> 00:61:00,000\nInvalid', { format: 'srt', duration: 3 }), /timestamp/);
  assert.throws(() => parseLyrics(' ', { duration: 3 }), /empty/);
  assert.throws(() => parseLyrics('Lyrics', { duration: Infinity }), /finite/);
  assert.throws(() => parseLyrics('Lyrics', { duration: 0 }), /positive/);
  assert.throws(() => parseLyrics('Lyrics', { duration: 3, format: 'json' }), /Unsupported/);
});
