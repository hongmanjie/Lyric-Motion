# Conversation workflows

This alpha uses conversation for inputs and feedback. The browser is a local preview surface; generation is performed by your Codex or Claude Code session. The toolkit has no hidden model call and no “generate” web service.

The default is `auto`: no built-in style is imposed. Optionally choose 1/纸绘叙事 or 2/节奏图形 in conversation; see [styles.md](styles.md) for previews and examples. These are flexible starting preferences, not fixed scene templates. The agent can resolve them with `styles` and pass `--style 1` during import.

## Start with audio only: generate an LRC draft

**Conversation:** “只有这首歌，先识别歌词并生成 LRC、SRT 和文本，标出疑似错词，先不用制作 MV。”

```sh
node tools/cli.mjs lyrics --audio /path/song.mp3 --out projects/song-lyrics --language auto
```

The optional local faster-whisper backend needs Python 3.10–3.13 and FFmpeg/FFprobe. First use prepares an isolated environment and downloads a model; later use reuses the cache. There is no transcription API key. It writes real model-estimated line/word times to an independent output, plus `lyrics.lrc`, `lyrics.srt`, `lyrics.txt`, raw `transcription.json`, and `state.json` marked `draft-needs-review`. Singing recognition can miss or invent words; review before using it for a final synchronized video. This is not forced alignment of an external lyric sheet. [Dependencies, commands, and review](lyrics.md).

If only lyric extraction was requested, deliver the files and stop there. If full MV creation was requested, continue with the reviewed timed lyric file and retain the raw result and any timing limitations.

## 1. Create from a song and lyrics

Provide an audio file and `.lrc`, `.srt`, or `.txt` lyrics. Optionally say “quiet and poetic”, “playful typography”, a frame shape, or another direction. The agent handles ordinary technical choices and creates an independent song project.

**Conversation:** “Use this song and LRC to make a landscape MV. Choose the art direction yourself, preview it, and fix visible problems.” For illustrated storytelling: “Use style 1 / 纸绘叙事. The protagonist is a little fox with a worn schoolbag. Let its acting and changing situation perform the lyrics, with fluid changes that follow the musical phrasing.” A specified protagonist takes precedence; otherwise the agent chooses a coherent cast.

```sh
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out projects/my-song --aspect 16:9 --direction "Playful typography"
```

Import probes the real audio duration and preserves lyric source text. A new project contains its own `config/project.json`, `timeline.json`, `request.json`, `state.json`, assets, and `artwork.js`. Initialization prepares an unfinished composition; it does not itself create an AI-designed video. The agent must replace the placeholder before rendering is enabled.

With an explicit `--style`, the new project receives independent profile/prompt copies and still starts with unfinished artwork. Extra `--direction` and reference inputs remain intact. Either custom `--style-profile` or `--style-prompt` replaces the built-in bundle as a unit; `request.json` records the requested and applied selection under `extensions.style`. The song, explicit user instructions, and relevant reference analysis guide the final composition.

LRC and SRT provide supplied line timing. TXT is stored as unaligned and marked `needs_alignment`; the tool does not invent equal-duration lyric cues. Optional local transcription can produce model-estimated times when no timed source is available. Keep its draft/review limitations alongside the song project. External-text forced alignment, automatic translation, and beat detection are not provided by the current toolkit.

## 2. Analyze a reference

Provide a video, optionally identify a region and time range, and request either analysis only or a new song immediately afterwards.

```sh
node tools/cli.mjs reference --video /path/reference.mp4 --out projects/reference-study --start 0 --duration 15
```

The command prepares media, metadata, and evidence frames. The agent watches and interprets those assets, then authors a reusable `style-prompt.md`, a `style-profile.json` matching the schema, and `reference-findings.md`. The report distinguishes observed facts, interpretation, unavailable audio, and incomplete viewing. Cropping does not by itself prove that analysis or listening happened.

**Conversation:** “Extract this reference's transferable visual principles and lyric relationships. Give me a reusable style prompt without fixing my new song to its shots.” Add `--crop x:y:width:height` only when a region is requested, using pixel coordinates within the actual source dimensions.

Ask for transferable visual relationships: how words become actions, how scale directs attention, how density changes with emotion, and how shots connect. These principles can be used on a different song without copying its storyboard.

### Reverse-engineer a prompt for a similar video

When the request is “反推 / 还原 / 复现提示词”, use the distinct [video-to-reconstruction-prompt workflow](reverse-prompt.md). It preserves useful composition, motion mechanisms, cadence and sequence rather than only transferable style preferences:

```sh
node tools/cli.mjs reverse-prompt --video /path/reference.mp4 --out projects/reconstruction-study
```

Preparation creates evidence and an `analysis.json` draft in `needs-analysis` state. The agent actually observes and authors it, including a natural production request and declared visual/audio/lyric coverage. Then export to a new directory:

**Conversation:** “反推这个视频的制作提示词，保留构图、动作、转场和段落推进。给我可复制的完整请求，区分观察与推测，暂时不用制作新视频。”

```sh
node tools/cli.mjs reconstruction-check --analysis projects/reconstruction-study/analysis.json
node tools/cli.mjs reverse-prompt --analysis projects/reconstruction-study/analysis.json --out projects/reconstruction-bundle
```

The final `reconstruction-prompt.md` is an authored request for a similar visible result, not the recovered original secret prompt. Still-only analysis must retain its limits. It can be supplied as `init --style-prompt FILE` for new creation, just like a transferable style prompt. If only analysis was requested, deliver the bundle without starting a new MV.

## 3. Reuse or write a style prompt

Supply the prompt as a file or in conversation together with the new song and lyrics. There is no required long prompt form. A structured profile is optional, useful when saving an editable creative direction:

**Conversation:** “Use this saved prompt with my new song and lyrics. Keep its visual relationships, but redesign the words, actions, and timing for the new content.”

```sh
node tools/cli.mjs style-prompt --profile projects/reference-study/style-profile.json --out projects/reference-study/style-prompt.md
```

This command formats an authored profile. It neither analyzes a video nor validates that its statements were observed.

## 4. Preview, review, and revise

```sh
node tools/cli.mjs preview --project projects/my-song
node tools/cli.mjs check --project projects/my-song
node tools/cli.mjs render --project projects/my-song --sample --name sample
node tools/cli.mjs render --project projects/my-song --name final
node tools/cli.mjs subtitles --project projects/my-song
```

Use the paths reported by the CLI. In a client with browser controls, the agent can inspect rendered frames and operate playback itself. Otherwise you can open the reported local preview URL and give time-based feedback. A useful revision is “At 18 seconds, reduce the text crowding and hold the main word longer.”

**Conversation:** “Make 8–12 seconds less crowded, preserve the previous version, and watch the revised interval.” For final outputs: “Add subtle bottom Chinese lyrics, then deliver the landscape MP4, SRT, and editable project.”

The agent should save review coverage with the project, including continuous playback intervals and whether audio was actually heard. Deterministic seek checks, metadata, thumbnails, and contact sheets cover different concerns; they do not replace motion review or listening. Final delivery includes the encoded video, editable project, optional SRT, and any remaining limits.

## Public sharing

Public demo assets are separate from private song projects. You may keep your own project anywhere; `projects/` is ignored by the repository. Before publishing a particular video, use media you are allowed to share. Installing the skill does not publish files or authorize a GitHub push.
