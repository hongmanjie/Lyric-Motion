---
name: lyric-motion
description: Make editable lyric music videos in conversation with Codex or Claude Code. Generate LRC drafts from audio, choose a built-in style pack, create freely, extract a reference style, or use a reference and new song to produce a finished MV. Preview, revise, and render locally.
---

# Lyric Motion

The user supplies a song and optionally lyrics, a reference or a short direction. Resolve fonts, scene count, implementation and ordinary production choices yourself. Deliver the requested outcome, rather than a form or an unfinished plan.

Resolve the absolute directory containing this SKILL.md:

- Installed: if its toolkit/tools/cli.mjs exists, that toolkit/ is <toolkit>.
- Source: otherwise resolve ../.. and verify tools/cli.mjs and templates/artwork.js.
- Neither exists: report an incomplete installation; do not guess another checkout.

Use Node.js 22+ to invoke <toolkit>/tools/cli.mjs. Core tools have no npm dependencies. User songs belong in independent projects outside the installed Skill; preserve inputs and previous good revisions.

## Five routes

1. **Generate lyrics** — audio to LRC/SRT/text draft: read [lyrics.md](references/lyrics.md). A lyric-only request ends with lyric files and review status.
2. **Choose a style** — 1/纸绘叙事 or 2/节奏图形: read [styles.md](references/styles.md), inspect the selected pack's guide and visual reference, then [create.md](references/create.md). Import the entire pack, not just its prompt.
3. **Create freely** — song, lyrics and optional direction: read [create.md](references/create.md). Default auto imposes no built-in.
4. **Extract a style** — video to transferable profile and prompt: read [reference.md](references/reference.md). Analysis alone is a complete deliverable when requested.
5. **Recreate from a reference** — reference plus new song to finished MV: read [recreate.md](references/recreate.md). Observe, author the direction, create, watch, correct and export in one workflow; do not stop at analysis.

An existing MV revision continues its own project and follows the same verification. If the user explicitly wants only a detailed reconstruction prompt, [reverse-prompt.md](references/reverse-prompt.md) is an internal variant of reference analysis, not an extra requirement for creating a video.

## Prepare the environment

Read [setup.md](references/setup.md) and run doctor early. Reuse available dependencies; actively provision missing tools through reliable platform-supported channels where authorized. Do not merely list missing dependencies when they can be installed. Do not install optional recognition models for a song that already has timed lyrics. Report actual limitations precisely.

## Creation invariants

Use real audio duration and supplied timing. LRC/SRT are line-timed; TXT remains unaligned. Local ASR produces model estimates and stays draft-needs-review until reviewed. Do not divide a line evenly and call it word alignment. Keep editorial reveal cues separate from verified lyric tokens. Actual RMS/onset features can support dynamics; acoustic peaks are not a verified beat grid.

Compose words, graphics, space and motion together. Meaningful verbs and emotional relationships should cause visible changes. A scene need not equal one lyric line. Strong phrases can change the whole layout; quieter phrases still need a deliberate focal point and an intentional environment. Do not fill space with random particles or leave entire phrases as tiny text in a corner.

Built-ins are portable art directions: prompt, profile, practical guide, original visual board and optional deterministic motion helpers. They do not fix palette, cast, shot timing or scene count. Explicit user direction takes precedence. Custom profiles/prompts replace a built-in as a unit. Do not copy finished showcase artwork or unrelated sibling projects into a new song.

Paper storytelling starts by reading the song's lyric meaning and emotional turns, then authoring a complete story, character arc, motif continuity and shot events before code. Read the selected pack's story-planning.md. Every shot should connect its current lyric to a visible event and consequence; repeated lyrics need new dramatic information or choices, not replayed sets with changed colors. Use consistent characters and real prop contact. Honor a specified protagonist; otherwise choose a coherent cast. Rhythmic graphics uses lyric words as actors, spatial relations and motion handoffs; read its motion kit before reimplementing a weak generic effect. Neither requires a particular model or client.

Implement original artwork.js. Its module exports createArtwork({canvas,ctx,project,timeline}), returning render(t), plus cuts and readyToRender. Set readiness true only after actual creation. Await fonts/assets. Every frame is a function of absolute song time, including out-of-order seeks; no accumulating simulations or wall-clock randomness. Runtime exposes __ready, __meta, __seek(t), __freeze().

Bottom reading lyrics should be clear and subordinate to the primary performance. Preserve source text and timing, avoid overlapping duplicate captions, and honor subtitle/translation requests.

## Verify and deliver

Run check, inspect full-size frames at important words, densest layouts and transitions, then watch encoded continuous playback. Correct visible problems and review changed intervals again. Technical tests/contact sheets do not prove visual quality.

Record actual inspected frames, playback ranges and whether sound was subjectively heard in the project's qa/. A waveform, audio metadata or a playing indicator does not establish listening. State unavailable modalities honestly.

Deliver playable MP4, editable project, requested lyric/subtitle files and material limitations. Creation does not authorize publishing private songs, full lyrics, inputs or finished media. Publishing needs the requested media and destination.
