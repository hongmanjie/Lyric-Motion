---
name: lyric-motion
description: Create and revise local lyric motion graphics music videos from a song and lyrics, optionally using a reference or written direction. Analyze a video into either a transferable style prompt or an authored reconstruction prompt for a similar visible result. Use the local toolkit for import, preview, deterministic rendering, and subtitles.
---

# Lyric Motion

Work through the conversation. The user supplies a song and lyrics; a reference or art direction is optional. Do not make the user fill in a production prompt, choose a JavaScript framework, or supply a shot list. Honor explicit choices and resolve ordinary creative decisions yourself.

Resolve the absolute directory containing this `SKILL.md` first; do not assume the shell's current directory is the repository:

- **Installed copy:** if `<skill-dir>/toolkit/tools/cli.mjs` exists, `<toolkit>` is `<skill-dir>/toolkit`.
- **Source checkout:** otherwise, resolve `<skill-dir>/../..` to an absolute path. If it contains `tools/cli.mjs` and `templates/artwork.js`, that repository root is `<toolkit>`.
- If neither location exists, report the incomplete installation rather than guessing another checkout.

In this skill and its references, `<toolkit>` always means that resolved absolute directory, including paths such as `<toolkit>/schemas/` and `<toolkit>/src/`. Invoke `<toolkit>/tools/cli.mjs` with Node.js 22+. The toolkit has no npm dependencies. Create each song under a new directory in the user's working project, outside the installed skill. Do not write user assets into the packaged demo.

## Route the request

- **New song, with or without a written direction:** read [references/create.md](references/create.md).
- **Reverse-engineer a prompt to recreate a similar video** (反推、还原、复现提示词): read [references/reverse-prompt.md](references/reverse-prompt.md). Preserve useful scene relationships and cadence with evidence; this is an authored reconstruction request, not recovery of the original secret prompt.
- **Extract transferable style principles, with or without immediate creation:** read [references/reference.md](references/reference.md). A reusable style prompt is a complete standalone deliverable; it need not reproduce the reference sequence.
- **Select or compare an optional built-in direction:** read [references/styles.md](references/styles.md). Default to `auto` when the user has not selected one; do not require a style choice before creating.
- **Revise an existing MV:** inspect its project and prior review notes, change the requested part, and follow the verification guidance below. Keep an existing good version available.

Run `node <toolkit>/tools/cli.mjs doctor` early. It reports Node, browser, FFmpeg, and FFprobe availability. Explain a missing dependency precisely; do not claim a render succeeded when it could not run.

## Creative and technical invariants

Use the imported song and actual lyric timing. Plain TXT is deliberately unaligned; LRC/SRT provide line timing, not inferred word timing. Do not distribute lyrics evenly and label that result synchronized. Preserve the user's supplied timing; resolve missing alignment honestly before a final synchronized export.

Treat words, graphics, space, and movement as one composition. Let lyric meaning, emotional relationships, and musical phrasing shape the animation. Transferable style analysis should preserve principles without locking a new song to old shots; an explicit reconstruction request may retain the observed sequence while labeling uncertain details. A scene need not equal one lyric line. Canvas, SVG, WebGL, or other suitable techniques remain creative choices.

Built-in directions are editable starting preferences, not constraints that override the user's words or reference. The showcase compositions illustrate possibilities; never copy their finished artwork into a new project. A supplied custom profile or prompt replaces the built-in bundle as a unit. Recompose for the new song, retaining explicit user direction and relevant reference analysis.

The optional catalog is 1/字形游乐场, 2/流动诗境, 3/数字雕塑, and 4/故事手绘. Storybook means lyric-driven scenes and acting through drawn characters or objects, with continuity and musical changes; it is not merely a handwritten font treatment. Follow the maintained bundle for the selected direction, adapting energy and pacing to the user's song.

Replace the unfinished `artwork.js` with an original composition. Its module exports `createArtwork({canvas,ctx,project,timeline})`, which resolves to an object with `render(t)`; it also exports `cuts` and `readyToRender`. Set readiness true only after the work exists. The runtime exposes `__ready`, `__meta`, `__seek(t)`, and `__freeze()`. Every frame must be a function of absolute song time and work after random-order seeks. Await asset/font loading; avoid wall-clock animation and accumulating simulation state.

Keep the main lyrics and optional reading subtitles in distinct visual roles. Fit subtitles inside the chosen frame with sufficient contrast and breathing room; respect a user's request to disable or translate them. User content, media, and outputs belong inside the selected project.

## Verify the work, then deliver

Run `check` and render an initial sample when that helps expose defects. Inspect actual rendered frames at important words, transitions, and subtitle boundaries. Watch the encoded video in continuous playback, correct visible problems, then export and verify the final file. A contact sheet or deterministic test is useful evidence but does not replace watching motion.

Record the exact review coverage in the project: rendered frames inspected, continuous playback ranges watched, and whether audio was actually heard. Audio metadata, waveforms, or a playing indicator do not establish that you listened. If a modality is unavailable, disclose the resulting limitation without inventing a review.

Return the playable result, local file paths, a short account of the changes, and material limitations. Do not publish user media, send external messages, or create a public repository merely because local creation was requested.
