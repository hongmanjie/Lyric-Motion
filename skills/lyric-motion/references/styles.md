# Optional starting directions

The user may choose a number or name in conversation. Do not require them to select a direction; `auto` is the default and leaves the agent free to design around the song.

| Input | Direction | Starting emphasis |
| --- | --- | --- |
| `auto` / `0` | AI 自由创作 | No imported preset; choose an original direction. |
| `playground` / `1` / `字形游乐场` | 字形游乐场 | Expressive type, scale changes, playful physical word behavior. |
| `poetry` / `2` / `流动诗境` | 流动诗境 | Poetic space, flowing forms, and expressive restraint. |
| `sculpture` / `3` / `数字雕塑` | 数字雕塑 | Dimensional letterforms, spatial relationships, sculptural light. |
| `storybook` / `4` / `故事手绘` | 故事手绘 | Hand-drawn characters, objects, and places perform the lyric's story. |

List the real shipped catalog or locate one bundle:

```sh
node <toolkit>/tools/cli.mjs styles
node <toolkit>/tools/cli.mjs style --id 1
```

Read the selected `profilePath` and `promptPath` from the actual command result. They contain the maintained art direction; the table is only a discovery guide. With `--out /workspace/styles/my-direction`, `style` creates independent `style-profile.json` and `style-prompt.md` copies in a new directory. `auto` has no fixed bundle to export. Existing directories are preserved.

Create a new song project with the selected preferences:

```sh
node <toolkit>/tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out /workspace/projects/my-song --style 1 --direction "Warm colors, with a quiet ending"
```

Initialization copies only the profile and prompt to the project's `style/` directory, preserves the supplied direction, and leaves `artwork.js` unfinished and rendering blocked. It never imports the demonstration's `artwork.js` or uses a fixed shot list, duration, or scene count. Read the song and timing, then create an original composition using [create.md](create.md).

Explicit user direction and relevant reference analysis guide any adaptation. A supplied `--style-profile` and/or `--style-prompt` replaces the built-in bundle entirely; it does not combine a custom profile with an unrelated built-in prompt. Preserve this priority when interpreting the generated request.

For `storybook`, design a visual story from the actual lyric situations and emotional changes. Give recurring characters or objects continuity across changing shots. Hand-drawn appearance can use irregular ink, pencil, paper, expressive poses, and limited palettes; it need not use a particular character design or copy any reference's scenes. Choreograph action and shot changes around the music, with reading holds where needed. A line-drawing reveal is one possible action, not a transition to repeat for every shot.

For every direction, movement should have a purpose. A request for more energy can change shot scale, camera, poses, materials, and transition handoffs while preserving lyric readability. Quiet visual materials do not require static slides. Use actual supplied timing and observed musical cues; do not manufacture a beat grid and call it measured synchronization.

The public style examples use original synthetic instrumental audio and original graphics. They show possible outcomes, not validated semantic synchronization to sung lyrics. Private sung studies, user songs, and reference footage are separate local inputs and are not bundled for redistribution.
