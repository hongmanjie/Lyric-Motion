# Public media provenance

Public media separates two sources: the four original graphic directions use repository-authored copy and a procedural instrumental; the separate vocal story uses Bautsch's CC0 recording of the traditional Auld Lang Syne. Neither includes user-provided recordings, private lyric translations, tutorial footage, or reference screenshots. See [third-party notices](../../THIRD_PARTY_NOTICES.md) for license boundaries.

The original instrumental is synthesized by `node tools/make-demo.mjs`: stereo PCM at 44.1 kHz, deterministic percussion, bass and plucked notes. Its text timings are authored editorial cues and it has no vocals. Those graphic previews do not establish transcription or forced-alignment accuracy.

The locally bundled Noto Sans JP font is under the SIL Open Font License 1.1, included at `examples/demo/assets/OFL.txt`. Direction examples also retain their serif font's notice in `examples/style-assets/fonts/OFL-serif.txt`. Screenshots, GIFs and MP4s placed in this folder are derived from actual rendered video. See the repository license for original code, documentation and generated demo media.

To update the showcase, regenerate assets, render the demo, inspect full-resolution frames and continuous playback, then capture the verified output. Keep paths relative in GitHub READMEs. A still image or GIF can be embedded directly; provide a linked MP4 because Markdown video embedding varies by GitHub surface.

## 20-second four-style highlight

`highlight/demo.mp4` is a 600-frame, 1920×1080, 30 fps montage of the public style exports. It changes direction approximately every five seconds, with short transitions. `highlight/demo.gif` is its silent inline README preview, not an independently animated mockup. The full 16-second original score continues with its first four seconds repeated and a final fade; no private song audio is used.

Regenerate with `node tools/make-highlight.mjs` after verifying the individual style exports. `highlight/manifest.json` records source hashes, exact excerpt frames, transitions, audio construction, output hashes, and actual review status. Reinspect the result after regeneration; the generation tool deliberately resets review to pending.

## 20-second sung-lyric story

`vocal/demo.mp4` uses the first 20 seconds of [Bautsch's CC0 Auld Lang Syne recording](https://commons.wikimedia.org/wiki/File:AuldLangSyne.ogg), with a short final audio fade. Its lyrics are traditional/Burns public-domain text. Original project artwork and Chinese translations are separate from the CC0 recording.

The editable [vocal example](../../examples/vocal-demo/README.md) retains the recording and explains recognition-derived timing, grouped lyric phrases, source checks, and actual visual/audio review coverage. Its timestamps are model estimates with documented edits; this demonstration is not proof that arbitrary singing will transcribe or align correctly. `vocal/poster.png` is captured from the encoded video. The README links this poster to the actual MP4.

## Individual style previews

The `styles/` previews show **Playground**, **Flowing Poetry**, **Digital Sculpture**, and **Story Sketch** as four separate original implementations under `examples/styles/`. They share a **14.3-second original instrumental excerpt**, a short audio fade-out, **no added silent ending hold**, and four authored editorial phrases:

- BREAK THROUGH THE NOISE
- MAKE TOMORROW BRIGHT
- DIVE INTO THE NIGHT
- TAKE MY HAND

These text and subphrase cues are editorial decisions. The music has no vocals, so the previews do not demonstrate transcription, forced alignment, or verified singing-to-word synchronization. The 2 × 2 `styles/overview.png` uses actual exported poster frames. `styles/manifest.json` records provenance and rendering metadata; `styles/review.json` records actual review coverage. Private song studies and their translated lyrics remain excluded from the public package. See [the showcase workflow](../showcase.md) for regeneration commands.
