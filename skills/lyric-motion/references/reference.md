# Analyze and reuse a reference

This workflow extracts transferable style principles and produces an open creative prompt. When the user instead asks to reverse-engineer a prompt for a similar reconstruction (反推、还原、复现), use [reverse-prompt.md](reverse-prompt.md). Both can be produced from one video when requested, as separate artifacts with different purposes. Scope the analysis to the user's requested region and time range, especially for comparison videos containing multiple works.

Prepare a viewable crop and evidence frames with:

```sh
node <toolkit>/tools/cli.mjs reference --video /path/reference.mp4 --out /workspace/projects/reference-study
```

For a selected portion, add `--start 4 --duration 12 --crop 0:168:720:404`; crop order is `x:y:width:height`. Choose values from the actual video's dimensions and visible content. Preparation extracts evidence and metadata; **it does not perform AI analysis**. Watch the prepared video continuously and inspect informative frames using available tools. If only frames are accessible, label the analysis as frame-based and limit claims about timing, easing, or transitions.

Observe relationships among typography, material, composition, hierarchy, scale, color, rhythm, motion, transitions, and lyric meaning. Distinguish a concrete observation from an inference. For lyric-linked animation, cite actual words and visible actions with times. Do not infer semantic synchronization from similar-looking shapes when the words or audio were unavailable. Record whether you watched motion, heard the audio, and had lyric text.

Create these portable artifacts in the selected analysis/project directory:

- `style-prompt.md`: copyable prose describing creative principles and movement relationships; preserve variation and freedom for a new song.
- `style-profile.json`: structured principles matching `<toolkit>/schemas/style-profile.schema.json`, including provenance and observation limitations.
- `reference-findings.md`: concise observations with time ranges, the examined region, and unresolved uncertainties. Local evidence remains local.

The profile can be converted back into a prompt:

```sh
node <toolkit>/tools/cli.mjs style-prompt --profile /workspace/projects/reference-study/style-profile.json --out /workspace/projects/reference-study/style-prompt.md
```

This conversion formats the supplied profile; it does not discover style or verify observation claims. Keep the editable profile and prompt consistent.

When applying the result to a new song, re-read its lyrics and timing. Transfer mechanisms such as an action turning into physical text movement, large changes of scale, mixed type personalities, or dense pressure yielding to quiet space. Invent a new visual arc appropriate to that song. Do not force reference-specific characters, emblems, props, colors, or shot lengths into unrelated lyrics.

User-supplied footage is analysis input. Do not copy it into a public showcase or redistribute it inside the installed skill. A reusable prompt/profile should describe principles without requiring the original media.
