# Create a music video

## Inputs and preparation

Resolve file paths from the conversation and workspace. The required inputs are an audio file and lyrics. A direction can be as brief as “playful typography”; otherwise choose an art direction suited to the song. Do not stop to ask about fonts, colors, scene count, or implementation unless a missing preference materially prevents progress.

The default style is `auto`, with no built-in profile imposed. If the user selects 1/字形游乐场, 2/流动诗境, 3/数字雕塑, or 4/故事手绘, read [styles.md](styles.md) and pass `--style` with that selection. It imports reusable preferences, not the showcase's finished artwork.

Use the bundled CLI with a new output directory:

```sh
node <toolkit>/tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out /workspace/projects/my-song --aspect 16:9 --direction "Playful typography with bold changes in scale"
```

Supported import formats are `.lrc`, `.srt`, and `.txt`. The default is landscape, 30fps; `--aspect 9:16` and `--aspect 1:1` are available. The importer probes real duration, copies media, preserves lyric source text, and creates `config/project.json`, `timeline.json`, `request.json`, `state.json`, and an unfinished `artwork.js`. It refuses an existing project directory.

Read the imported `timeline.json` and `state.json`. TXT is marked `needs_alignment`; it does not receive invented timing. Request a timed lyric source, or use an available alignment tool with the user's audio and document its actual accuracy. Do not overwrite the lyric source. LRC/SRT are line-level timing: avoid claiming per-syllable precision. Inspect words and phrase boundaries before creating semantic word hits.

For an accompanying reference, analyze it using [reference.md](reference.md). The `init --reference /path/reference.mp4` option imports a source; it does not analyze style. Put the transferable prompt/profile in the new song project and use it alongside the current lyrics.

`init --style-profile FILE` and/or `--style-prompt FILE` import a custom direction. Either custom flag replaces the whole built-in bundle, so a custom profile is never silently paired with an unrelated built-in prompt. The imported request records the requested and applied style under `extensions.style`; explicit direction and reference assets are retained.

## Composition

Read the local runtime and template only as an interface contract, not as an art-direction example. Implement in the project's `artwork.js` and local assets. Use `project.width`, `project.height`, and `project.duration` so the agreed format is preserved. Load local assets through project-relative URLs and wait for them in `createArtwork`.

Develop a varied visual arc across the music. Useful questions are what the lyric is doing, where the viewer should look, and how the outgoing motion can become the next scene. Choose a few strong materials, then vary their behavior. Do not repeat the same centered heading, decorative background, and transition for every line. Maintain clear reading time while allowing deliberate oversized text and fast musical accents.

For illustrated storytelling, use the lyric's subjects, actions, relationships, and emotional changes to choose scenes. Recurring characters or props should have continuity through poses, locations, and scale changes. Hand-drawn texture alone is not the story: let the scene perform the content. Select framing and movement for each situation rather than assigning one repeated drawing reveal to every lyric line. When more energy is requested, use purposeful quick cuts and fluid visual handoffs while allowing important actions and subtitles time to read.

Bottom reading subtitles are a composition decision, not an automatic runtime layer. `<toolkit>/src/captions.js` provides optional drawing helpers; inspect the timeline and the composition before adding or adjusting captions. Avoid duplicate overlapping subtitle layers. A translation must be authored for the actual lyric lines, with uncertainty noted where needed; the importer does not translate.

## Preview and export

```sh
node <toolkit>/tools/cli.mjs preview --project /workspace/projects/my-song
node <toolkit>/tools/cli.mjs still --project /workspace/projects/my-song --time 8.5
node <toolkit>/tools/cli.mjs check --project /workspace/projects/my-song
node <toolkit>/tools/cli.mjs render --project /workspace/projects/my-song --sample --name sample
node <toolkit>/tools/cli.mjs render --project /workspace/projects/my-song --name final
node <toolkit>/tools/cli.mjs subtitles --project /workspace/projects/my-song
```

Use the tool's actual report for final output paths. Review sample/final playback through available browser or media controls; recorded frame inspection alone is incomplete motion review. Save concise review notes within the project. If a change affects timing, transitions, or subtitles, review the changed interval in motion after the edit.

For revisions, interpret requests such as “the scene around 18 seconds is too crowded” against the timeline and current composition. Preserve unrelated good work. Keep the preceding export or artwork snapshot before a major redesign.
