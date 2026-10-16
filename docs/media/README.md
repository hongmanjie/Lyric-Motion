# Public media provenance

Public media contains original code-rendered artwork, graphic copy and a procedural instrumental authored for this repository. The separate `examples/demo` composition is 16 seconds long. The `styles/` previews show four original directions using a shorter excerpt of that score. No user-provided recording, commercial song lyric or translation, comparison footage, or reference screenshot is used in public media.

The demo soundtrack is synthesized by `node tools/make-demo.mjs`: stereo PCM at 44.1 kHz, deterministic percussion, bass and plucked notes. The text timings are authored editorial cues and the soundtrack has no vocals; this showcase is not evidence of transcription or forced-alignment accuracy.

The locally bundled Noto Sans JP font is under the SIL Open Font License 1.1, included at `examples/demo/assets/OFL.txt`. Direction examples also retain their serif font's notice in `examples/style-assets/fonts/OFL-serif.txt`. Screenshots, GIFs and MP4s placed in this folder are derived from actual rendered video. See the repository license for original code, documentation and generated demo media.

To update the showcase, regenerate assets, render the demo, inspect full-resolution frames and continuous playback, then capture the verified output. Keep paths relative in GitHub READMEs. A still image can be embedded directly; use a linked animated GIF/WebP for motion and provide a separate MP4 link because Markdown video embedding varies by GitHub surface.

The `styles/` previews show **Playground**, **Flowing Poetry**, **Digital Sculpture**, and **Story Sketch** as four separate original implementations under `examples/styles/`. They share a **14.3-second original instrumental excerpt**, a short audio fade-out, **no added silent ending hold**, and four authored editorial phrases:

- BREAK THROUGH THE NOISE
- MAKE TOMORROW BRIGHT
- DIVE INTO THE NIGHT
- TAKE MY HAND

These text and subphrase cues are editorial decisions. The music has no vocals, so the previews do not demonstrate transcription, forced alignment, or verified singing-to-word synchronization. The 2 × 2 `styles/overview.png` uses actual exported poster frames. `styles/manifest.json` records provenance and rendering metadata; `styles/review.json` records actual review coverage. Private song studies and their translated lyrics remain excluded from the public package. See [the showcase workflow](../showcase.md) for regeneration commands.
