# Choose a maintained style pack

The user can select by name or number; no selection means auto. First resolve <toolkit> using SKILL.md.

~~~sh
node <toolkit>/tools/cli.mjs styles
node <toolkit>/tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/song.lrc --out /workspace/projects/song --style 2
~~~

The catalog returns actual validated profile/prompt paths and declared pack assets. Read the selected guide, inspect its original visual-reference.svg, then use relevant helpers. Import copies independent files under the new project's style/ and records their paths in request.json.creative.styleAssets. The guide and code must travel with the profile when exporting or moving a pack.

- **1 / painted-story / 纸绘叙事:** consistent drawn characters, motivated gestures, flat ink/paper forms, meaningful locations and causal transitions. View changes should reveal distance, choice or emotional response. The guide explains story continuity; characters and shots are redesigned for the new song.
- **2 / rhythmic-type / 节奏图形:** lyric words act inside a changing graphic space. Main word, response action and low-contrast environment form one composition. Reposition earlier words, use semantic paths/supports/occlusion, vary scale and density, and accent selected events with particles. The pack includes motion-kit.mjs for layout handoffs, cubic paths, echo fields, deterministic bursts and measured-audio response.

Use line times or reliable word data honestly. No even word splitting or fabricated beats. The toolkit's tools/analyze-audio.mjs measures RMS, low-pass energy and estimated acoustic onsets from the actual song. It is an optional internal aid, not lyric alignment or a verified musical beat detector.

The code kit is modular, not a complete artwork or a universal scene list. Import it from ./style/motion-kit.mjs in generated artwork as useful. Compose new semantic scenes instead of replacing a few strings in an example. User preferences and relevant supplied reference win over defaults.

~~~sh
node <toolkit>/tools/cli.mjs style --id 2 --out /workspace/styles/my-style
~~~

Export creates a new portable bundle and refuses overwrites. A custom --style-profile or --style-prompt replaces the entire built-in selection. Profiles may declare local supporting files under extensions.assets; those files are checked and copied without executing them.

Two public rendered excerpts illustrate the directions. Private songs, full lyrics, source references and finished user artwork are not installed. Alpha.6 retired the old four IDs; only 1/2 have the current meanings. Existing custom bundles still import.
