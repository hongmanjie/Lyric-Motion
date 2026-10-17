# Maintaining the two-video showcase

The public presentation contains exactly two song excerpts: Painted Story / 《走散》 and Rhythmic Type / 《稳稳地接住你》. [Sources, timing and rights](media/README.md). The default README is Chinese; README.en.md is the English translation.

The original inputs and artwork projects are private. A public checkout contains reusable style profiles and prompts, plus rendered excerpts; it cannot reconstruct these exact videos from the MP4 alone. New projects must design artwork for their own song.

To update an explicitly authorized showcase:

1. Preserve the original inputs and last good artwork/export in independent projects.
2. Render and inspect full-size frames and actual continuous playback; fix visible problems and record actual coverage. Do not claim listening or verified word timing from technical metadata.
3. Capture the two selected exports into a new directory:

```sh
node tools/showcase-styles.mjs --painted /path/painted-render.mp4 --rhythmic /path/rhythmic-render.mp4 --out projects/showcase-candidate --painted-poster 11.8 --rhythmic-poster 9.8
```

The command requires both actual exports with audio, validates poster positions, refuses an existing output, creates H.264/AAC MP4s and full-size PNG covers, and records dimensions, durations, frame counts and hashes. It does not generate artwork, publish, or upload anything. Only copy the approved final media to docs/media/showcase/; preserve private sources separately.

For native README playback, upload the reviewed MP4 to GitHub and use the actual returned attachment URL on its own line. Do not fabricate a URL or assume a relative MP4 link embeds a player. Keep a repository MP4 fallback and optional still preview. Update all three READMEs, the source notes and manifest together.

The two style bundles are preferences, not finished compositions. `node tools/make-style-examples.mjs --audio FILE --timeline FILE --out projects/style-studies --start 0 --duration 10` prepares two independent unfinished studies with the supplied excerpt/timing and selected principles. It preserves translations and timed tokens without inventing new ones. The optional --public-demo uses the original synthetic developer score, not either song.

The self-contained original 16-second examples/demo remains a runtime/export developer fixture. It is not a third public song demo. Runtime changes should still inspect and render that fixture per AGENTS.md.

Publishing another user's media requires their explicit request for that media and destination. Share prompts, client/model, manual changes, timing method and asset permissions with community examples.
