# README media and demos

## Main showcase: the same song in four directions

The README's main showcase uses a maintainer-supplied excerpt of **YOASOBI's Yoru ni Kakeru (夜に駆ける)**. All four individual versions share the same **22.333-second** source-audio range, Japanese singing, phrase timeline and Chinese subtitles. Their visual subjects differ: type performing physical actions, paper/ink/negative space, spatial structures/materials, and character storytelling.

The individual MP4s, gallery covers, highlight, GIF, comparison and manifest live under `docs/media/showcase/`. They are rendered outputs for public display. Raw audio, the complete lyric file and private production projects are not included. Music and recording rights remain with their respective rights holders; neither the repository's MIT license nor the separate CC0 example licenses this song. [Full media provenance](media/README.md).

The common range is **28.62–50.953333 seconds in the supplied excerpt file**, not a full-track position. Actual local Whisper Japanese recognition provided estimated phrase times; supplied LRC text corrected the words. It is not external-text forced alignment or verified word timing. Real RMS/energy rises can modulate motion without being described as a verified beat grid.

### Updating the main showcase

Updating these exact videos requires the privately retained source excerpt, prepared timeline and original artwork implementations. Running the original demo or style-example scripts does **not** reconstruct this showcase. From a public checkout, create a new independent project with your own inputs and design new artwork from the optional style principles; do not expect the rendered media alone to contain the original project.

For a maintained production revision:

1. Preserve the last good artwork/export. Keep the audio range, frame rate, common timeline and subtitle treatment consistent across the four versions unless the comparison itself is being redesigned.
2. Render each changed version from its actual project. Check full-size frames and continuous playback, including phrase boundaries and transitions, then fix visible problems. Record actual listening coverage and timing limits.
3. Capture gallery covers from the verified encoded MP4s. Build the highlight from those exports, retain the real vocal excerpt, and derive the silent GIF from the resulting highlight. Generate the complete comparison separately.
4. Update `docs/media/showcase/manifest.json` with the real source description, excerpt clock, processing and output metadata. Publish rendered excerpts/images/GIF and the manifest, leaving raw inputs, full lyrics and private projects out of the public package.

### README playback links

The lead README uses a real uploaded GitHub attachment URL as a native player. The repository MP4 is a fallback; the silent GIF is inside a collapsed fallback section. Each gallery cover links to its complete MP4. `comparison.mp4` shows all four complete versions side by side.

A native GitHub player requires an **actual uploaded attachment URL**, placed in its own paragraph outside a code fence. Use the URL returned by GitHub; do not invent an attachment address or assume a repository-relative MP4 Markdown image embeds as a native player. Keep the repository MP4 link as a fallback. A GIF, poster or playing indicator does not establish that someone inspected motion or listened.

## Other reproducible examples

These self-contained examples remain available for development and installation checks. They have different source material from the main showcase and keep their own manifests and review records.

### Original instrumental: four directions

The optional profile/prompt bundles and original source examples live in `examples/styles/`. To create the separately reproducible instrumental studies:

```sh
node tools/make-style-examples.mjs --public-demo --out projects/public-kinetic-previews
node tools/showcase-styles.mjs
```

The first command refuses an existing destination. The second renders missing `main.mp4` files and captures `docs/media/styles/{id}/poster.png`, `demo.gif`, `demo.mp4`, the 2 × 2 overview and manifest. Existing renders are not evidence that source changes were re-rendered; explicitly regenerate changed versions before capturing them.

Those examples use a **14.3-second original procedural instrumental excerpt** and four repository-authored editorial phrases. They have a short fade and no added silent hold. They contain no sung vocals, so text timings are editorial cues, not transcription or alignment evidence. `node tools/make-highlight.mjs` creates their separate 20-second montage in `docs/media/highlight/`; it does not create `docs/media/showcase/`.

Normal `init --style` copies only editable creative preferences. It never copies an example's finished artwork or marks a new song complete. New songs need original scene design and actual review.

### CC0 vocal: Auld Lang Syne

The editable [vocal story example](../examples/vocal-demo/README.md) includes Bautsch's independently documented CC0 recording, a 20-second excerpt, artwork, fonts and timeline:

```sh
node tools/cli.mjs preview --project examples/vocal-demo
node tools/cli.mjs render --project examples/vocal-demo --name final
node tools/showcase-vocal.mjs
```

Use a new render name for revisions, or explicitly choose `--overwrite` when replacing a known render; ensure the capture step uses the export you actually reviewed. This produces the separate `docs/media/vocal/` media, not the main four-version song showcase. Its recognition-estimated times and documented edits are not an arbitrary-song accuracy benchmark.

### Original 16-second toolkit demo

`examples/demo` remains a self-contained typography/vector demonstration with original procedural music and editorial text:

```sh
node tools/make-demo.mjs
node tools/cli.mjs render --project examples/demo --name main
node tools/showcase.mjs
```

It generates the original `docs/media/demo.gif`, `demo.mp4`, poster/stills, social preview and manifest. These outputs are separate from the current README hero.

## Adding community examples

Share the result and reusable source/style materials where permitted. State the client/model, inputs, prompt, duration, generation time, manual edits, timing method and asset licenses. Prefer genuinely different visual subjects over repeatedly changing words in one layout. The maintainer can render clean footage, capture frames and derive GIFs; a manual screen recording is only needed for an external interface or unavailable asset.

Local reference analysis and public redistribution are different actions. Record the actual source and license of each example instead of assuming that a code license covers its song.
