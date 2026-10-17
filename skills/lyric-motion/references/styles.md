# Optional starting directions

Default to `auto`: let the current song determine the artwork. Users may choose a number, English ID or Chinese name in conversation.

| Input | Direction | Emphasis |
| --- | --- | --- |
| `auto` / `0` | AI 自由创作 | No imported preset. |
| `painted-story` / `1` / `纸绘叙事` | Painted Story | Painted characters, situations, reactions and causal scene changes perform the lyrics. |
| `rhythmic-type` / `2` / `节奏图形` | Rhythmic Type | Kinetic type, graphic relationships, scale changes and selective particles perform the lyrics. |

Run `node <toolkit>/tools/cli.mjs styles` or `style --id 1`. Read the returned profilePath and promptPath: these are the maintained principles. Export an independent bundle with `style --id 2 --out /workspace/styles/my-direction`.

Initialize with `init --audio /path/song.mp3 --lyrics /path/song.lrc --out /workspace/projects/my-song --style 1`. This copies preferences only; it never copies finished showcase artwork or marks artwork complete. Create an original work using [create.md](create.md). Custom --style-profile and/or --style-prompt replaces the entire built-in bundle. User direction and relevant reference analysis guide adaptation.

For painted-story, design a coherent cast and world from this song. Use anticipation, action and reaction, expressive poses, meaningful close/wide shots, paper and ink as appropriate. JohnHeibel/ClaudeAnimationBase inspired the style study; the toolkit does not integrate or require its library. Do not reuse reference characters, fixed scenes or the showcase's fox/train story unless specifically requested.

For rhythmic-type, make sung lyric words the main visual material when word performance is requested. Reveal words in sequence, then move/resize previously entered words into a continuous evolving composition. Let semantic verbs change the glyph action, occlusion or path. Do not replace sung words with unrelated English labels. Use reliable word timing where available; supplied line anchors plus actual ASR estimates may inform clearly editorial visual cues, but never invent equal-duration tokens or claim verified word alignment. Make semantic actions visible in typography and graphics. Use varied scale, clear focus, motion handoffs and deliberate reading holds. React to actual supplied timing and measured acoustic changes. Onset detection is not verified musical beat alignment. Particles accent selected events, not every frame.

Neither direction fixes palette, character, font, duration, shot count or implementation. Two public rendered song excerpts illustrate the directions; private artwork, source recordings, full lyrics and reference video are excluded from installation. The examples/styles directories contain portable profiles/prompts, not complete MV implementations. Publishing another user's project needs authorization for that media and destination.

alpha.6 replaces the previous four built-ins. Numbers 1 and 2 have new meanings; old English IDs and numbers 3/4 fail with a migration message. Existing custom bundles remain importable.
