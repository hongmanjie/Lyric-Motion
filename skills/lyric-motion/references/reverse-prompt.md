# Reverse a video into a reconstruction prompt

Use this route when the user wants a prompt capable of making a similar visible video, including requests to 反推、还原 or 复现提示词. Deliver an authored production request, not a claim to recover the original private prompt. For transferable aesthetic principles without the reference sequence, use [reference.md](reference.md) instead.

The user supplies a video and optional region/time scope. You perform the analysis; do not ask them to fill out the analysis schema or a technical prompt. Prepare evidence first:

```sh
node <toolkit>/tools/cli.mjs reverse-prompt --video /path/reference.mp4 --out /workspace/projects/reconstruction-study
```

Optional `--start`, `--duration`, and `--crop x:y:width:height` select a portion of the source. The new directory contains a playable preview, timestamped frames, `analysis.json`, `analysis.schema.json`, `analysis-brief.md`, and a state of `needs-analysis`. Preparation makes no AI call and creates no final reconstruction prompt.

## Observe, then author

Open individual evidence images and watch actual continuous playback when available. Listen only when your tools genuinely support hearing. Use **source timestamps**, even when the preview begins at a later source time. Record inspected frames, watched/listened ranges, visible or supplied text, and limitations in the analysis. A playing indicator or audio stream does not prove listening.

Read `<toolkit>/schemas/reconstruction.schema.json` and author the prepared `analysis.json`. Capture:

- Composition, typography, materials/light, and color.
- Movement and transition mechanisms, shot cadence, sequence with source time ranges, and text/semantic relationships.
- A complete natural-language `creativePrompt` that instructs a new production to achieve a similar result, plus negative direction and assumptions.
- `observed`, `inferred`, or `unknown` status for claims, with timestamps and optional local `evidence/*.png`/JPEG/WebP images for observations.

A useful `creativePrompt` combines the subject, visual hierarchy, material behavior, progression, and intended movement in connected production instructions. It should be copyable without the user rewriting observation notes. The scene plan can retain observed ordering and cadence for reconstruction; it is not a mandatory template for unrelated new songs.

If only stills were inspected, record `visual: "stills"` and the exact frame times. Describe appearance as observed, but mark motion, easing, transitions, and scene boundaries as inferred or unknown. Observed motion/cadence and observed scene intervals require continuous viewing coverage. If no lyrics were available, do not claim observed lyric synchronization. Visible graphic copy can be recorded as `visible-text`; distinguish that from sung words. Keep the original software/framework unknown or inferred rather than declaring a renderer from its appearance.

## Validate and export the final prompt

```sh
node <toolkit>/tools/cli.mjs reconstruction-check --analysis /workspace/projects/reconstruction-study/analysis.json
node <toolkit>/tools/cli.mjs reverse-prompt --analysis /workspace/projects/reconstruction-study/analysis.json --out /workspace/projects/reconstruction-bundle
```

These commands check authored structure, source-time containment and declared coverage. They do not independently verify that an observation happened or that a new video would match. Export requires at least one timestamped visual observation and a complete production request. A preparation draft deliberately fails until actual analysis is authored.

The new output directory contains `reconstruction-prompt.md`, `reconstruction.json`, a state of `authored`, and independent copies of referenced local still evidence. It preserves existing output directories and does not include the source footage. `--video` and `--analysis` are exclusive modes; crop/time flags belong only to preparation.

Return the actual copyable prompt and bundle paths with review limits. If asked only for this prompt, the task is complete; do not automatically create a new MV. To use it later, pass `reconstruction-prompt.md` as `init --style-prompt FILE` together with a new song and lyrics, or read it as the new conversation's brief. Adapt original text/timing when new content requires it. Do not publish the supplied footage or private study as part of the public example package.
