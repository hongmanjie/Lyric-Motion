# Generate timed lyrics from audio

Use this route for “生成 LRC / 歌曲提取歌词 / audio to lyrics” and before MV creation when no timed lyric source is supplied. If the user only wants lyric files, deliver them without creating artwork.

Run from the resolved toolkit path:

```sh
node <toolkit>/tools/cli.mjs lyrics --audio /path/song.mp3 --out /workspace/projects/song-lyrics --language auto
```

The optional local backend is faster-whisper 1.2.1 with Whisper models, not an API call to the user's chat model. It requires Python 3.10–3.13 and FFmpeg/FFprobe. It prepares an isolated environment on first use, then downloads the selected model and recognizes locally on CPU. Reuse the environment/cache. `--python FILE` selects Python and `--cache DIR` selects a cache instead of `~/.cache/lyric-motion/lyrics`; `lyrics-setup` accepts those two flags to prepare the environment separately. Default recognition uses `--model base`; choose a model suited to the available time and hardware rather than assuming a larger model fixes singing. For an unavailable dependency or network, report the exact failure and preserve the source. Do not silently substitute guessed text or equal-duration cues.

Inspect `lyrics.lrc`, `lyrics.srt`, `lyrics.txt`, `transcription.json`, and `state.json` in the reported output directory. Keep the raw `sourceSegments` and source audio intact. Output `segments` can be split at actual word boundaries; no missing word times are invented. Read `reviewHints` as confidence-based pointers, not proof that a word is wrong or that unflagged words are correct. Explain that recognition times are model estimates; probability fields and timestamp checks cannot prove that singing was heard or accurately aligned. Review chorus repetitions, names, mixed-language words, held notes, omitted lines, and instrumental hallucinations. Mark suspected words and actual review coverage in a separate note rather than erasing the raw result.

If the user supplies an authoritative lyric sheet, compare it against the result. The bundled recognizer does not force-align external text. Do not label a corrected spelling or evenly divided line as newly aligned. Larger models may improve some songs but do not remove the need for review.

For creation, pass the reviewed timed file into `init` and continue with [create.md](create.md). Preserve the recognition draft and distinguish reviewed edits from machine estimates. Do not require a user confirmation at every step when the user already asked to make the full MV; proceed with available evidence and disclose remaining uncertainty.
