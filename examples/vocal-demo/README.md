# Auld Lang Syne — Memory in Motion

A 20-second sung showcase with editable Canvas artwork: remembered photographs fade, a path gathers memories, two friends reconnect, and the same people meet beneath a warm night sky. The English lyric remains readable above the original Chinese adaptation.

## Run and edit

From the repository root:

```sh
node tools/cli.mjs preview --project examples/vocal-demo
node tools/cli.mjs check --project examples/vocal-demo
node tools/cli.mjs render --project examples/vocal-demo --name final
node tools/showcase-vocal.mjs
```

Use a new render name for revisions, or explicitly choose `--overwrite`. The artwork is in `artwork.js`; `timeline.json` carries the actual lyric clock. Scene actions and word times are editable data, not a new-song template. The bundled helper and fonts keep this example self-contained after installation.

## Audio and reuse

- **Recording:** Bautsch, recorded 10 March 2025, [AuldLangSyne.ogg on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AuldLangSyne.ogg), released by its author under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The original file is retained at `assets/source.ogg`.
- **Composition:** historical first-verse lyrics by Robert Burns and the traditional tune. See the [Library of Congress historical account](https://blogs.loc.gov/folklife/2013/12/auld-acquaintance-for-the-new-year-burnss-auld-lang-syne/).
- **Excerpt:** original seconds 0–20, converted to stereo PCM WAV, with a 0.4-second final fade. The voice is the credited recording, not a generated narration or a user-provided commercial track.
- **Original artwork and Chinese adaptation:** MIT. Fonts retain their separate OFL notices in `assets/`. The source recording remains CC0.

Exact source URLs, input hash and processing are in `provenance.json`. No reference-video frames or character assets are included.

## Timing and review limits

The first four lyric phrases were grouped from actual **faster-whisper 1.2.1 / base.en** word-time estimates. The first token's leading-silence error was constrained to the decoded audio onset at about 1.03 seconds. There was no uniform division of the text or fabricated beat grid.

These are **recognition estimates**, not independently verified word alignment. The new audio-to-LRC command also exports an explicitly reviewable draft; this authored showcase is not a transcription-accuracy benchmark. Full-size frame and actual continuous-playback coverage are recorded in [the public media review](../../docs/media/vocal/review.json). Subjective audio listening is not claimed where unavailable.

To reproduce an independent recognition draft, with optional Python/model setup:

```sh
node tools/cli.mjs lyrics --audio examples/vocal-demo/assets/source.ogg --out projects/auld-lyrics --language en --model base.en
```

That command recognizes the whole original recording and can produce different words/timing. Keep its raw data and review the result before reusing it as song lyrics.
