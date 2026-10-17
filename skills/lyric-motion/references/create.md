# Create a music video

## Inputs and preparation

Resolve file paths from the conversation and workspace. If the user only supplies audio, use [lyrics.md](lyrics.md) to generate and review a timed draft before import. A direction can be as brief as “playful typography”; otherwise choose an art direction suited to the song. Do not stop to ask about fonts, colors, scene count, or implementation unless a missing preference materially prevents progress.

The default style is `auto`, with no built-in profile imposed. If the user selects 1/纸绘叙事 or 2/节奏图形, read [styles.md](styles.md) and pass `--style` with that selection. It imports the complete portable pack: prompt, profile, guide, original visual board and any declared motion helpers. Read and inspect those assets before composing; it never imports finished showcase artwork.

Use the bundled CLI with a new output directory:

```sh
node <toolkit>/tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out /workspace/projects/my-song --aspect 16:9 --direction "Playful typography with bold changes in scale"
```

Supported import formats are `.lrc`, `.srt`, and `.txt`. The default is landscape, 30fps; `--aspect 9:16` and `--aspect 1:1` are available. The importer probes real duration, copies media, preserves original filenames and hashes in input/ and sources.json, separates clearly labelled credits/source notices from vocal cues, preserves lyric source text, and creates `config/project.json`, `timeline.json`, `request.json`, `state.json`, and an unfinished `artwork.js`. It refuses an existing project directory.

Read the imported `timeline.json` and `state.json`. TXT is marked `needs_alignment`; it does not receive invented timing. Request a timed lyric source, or use an available alignment tool with the user's audio and document its actual accuracy. Do not overwrite the lyric source. LRC/SRT are line-level timing: avoid claiming per-syllable precision. Inspect words and phrase boundaries before creating semantic word hits.

For an accompanying reference, analyze it using [reference.md](reference.md). The `init --reference /path/reference.mp4` option imports a source; it does not analyze style. Put the transferable prompt/profile in the new song project and use it alongside the current lyrics.

`init --style-profile FILE` and/or `--style-prompt FILE` import a custom direction. Either custom flag replaces the whole built-in bundle, so a custom profile is never silently paired with an unrelated built-in prompt. The imported request records the requested and applied style under `extensions.style`; explicit direction and reference assets are retained.

## Composition

When a user requests words appearing as they are sung, let lyric words drive the main composition. Previous words can move, resize and hand off the focus. Use supplied word timing or actual ASR estimates with honest uncertainty; line-level LRC alone does not prove exact word alignment. Keep editorial reveal cues separate from verified timeline tokens. Match meaningful verbs with glyph actions and selective full-page transformations; avoid decorative filler replacing the words.


Read the local runtime and template only as an interface contract, not as an art-direction example. Implement in the project's `artwork.js` and local assets. Use `project.width`, `project.height`, and `project.duration` so the agreed format is preserved. Load local assets through project-relative URLs and wait for them in `createArtwork`.

Develop a varied visual arc across the music. Useful questions are what the lyric is doing, where the viewer should look, and how the outgoing motion can become the next scene. Choose a few strong materials, then vary their behavior. Do not repeat the same centered heading, decorative background, and transition for every line. Maintain clear reading time while allowing deliberate oversized text and fast musical accents.

For illustrated storytelling, analyze the lyric's subjects, actions, relationships, emotional turns and repeated phrases before coding. Read the maintained painted-story pack's story-planning.md when selected. Author a concise STORY.md: lyric interpretation, a song-specific plot, character choices, motif states and shot events with their consequences. Do not ask the user to fill this in. Honor a specified protagonist; otherwise choose a cast suited to the song. Preserve recognizable shapes, clothing, colors and props across views. Show anticipation, action and response through gaze, hands, weight and interaction. Check actual contact points and object continuity. Hand-drawn texture alone is not the story. Repeated lyrics need new information, choices or consequences; changing colors, poses or backgrounds alone is insufficient. Use new framing and meaningful events, and reserve returning sets for genuine narrative changes. Connect scenes through continuing action, objects, silhouettes or direction. Let important actions and subtitles read. No fixed cast, set, ending, scene count or upstream storyboard is required.

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

After the actual review, record it in qa/review.md or qa/review.json, export subtitles when applicable, then run `node <toolkit>/tools/cli.mjs deliver --project /workspace/projects/my-song --render final --name final`. The local delivery folder contains video.mp4, editable project/, project.tar.gz and hashes. This uses the system tar utility, preserves previous deliveries and excludes prior renders, hidden configuration, installed dependencies and unselected QA. The source archive does not itself prove visual quality or authorize public upload.
