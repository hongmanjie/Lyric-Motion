# Lyric Motion

[![Toolkit checks](https://github.com/hongmanjie/Lyric-Motion/actions/workflows/ci.yml/badge.svg)](https://github.com/hongmanjie/Lyric-Motion/actions/workflows/ci.yml) · **v0.1.0**

**Give Codex / Claude Code a song. Create an editable lyric MV through conversation.**

[简体中文](README.md) · [Style packs](docs/styles.md) · [Workflows](docs/workflows.md)

## Two songs, two visual languages

**1 · Painted Story | 《走散》 | 29 seconds**

https://github.com/user-attachments/assets/44b440a9-0e92-4738-b3fc-c0f36dc948c5

An empty seat, a ticket maze and an incomplete postcard perform a journey caught in the wish to recover the past. Excerpt from the complete 《走散》 MV. [Play MP4](docs/media/showcase/duo/painted-story.mp4)

**2 · Rhythmic Graphics | 《稳稳地接住你》 | 44 seconds**

https://github.com/user-attachments/assets/886e0ba7-2e8a-4d39-8dd1-1ee7d9b25ff6

Words enter, yield and rearrange. Semantic paths, supporting structures, quiet typographic echoes and selected particles respond to the lyric actions. [Play MP4](docs/media/showcase/duo/rhythmic-type.mp4)

Both are **1920×1080, 30fps, with sound and bottom Chinese lyrics**. Click play and enable sound. [Media sources and timing](docs/media/README.md)

## 1. Why this project?

Want an agent to make videos without repeatedly setting up the environment or guessing which tools to use?

**Lyric Motion brings together production tools, environment preparation, evolving video style packs and a conversation Skill.** Use your own Codex or Claude Code session to work from an existing direction or create freely.

The agent interprets the lyrics, designs scenes and writes animation. The toolkit handles import, lyric timing, local preview and export. Each song keeps its own editable project. No separate generation website, project account or long production form is required.

## 2. Ask your agent to install

Open the folder where you want to create videos and send this request to Codex or Claude Code:

~~~text
Install Lyric Motion from https://github.com/hongmanjie/Lyric-Motion.git
into the currently open project, for the client you are running in.

Acquire the source in a separate folder. Read README.md, AGENTS.md and docs/install.md.
Check and reuse Node.js 22+, FFmpeg, FFprobe and Chrome/Edge/Chromium.
Actively provision missing dependencies using reliable official sources or the
platform package manager, preferring project-local or user-scoped installation.
Explain genuinely required system permissions.
Preserve existing Skills and artwork; do not overwrite a conflict.
Verify the installed toolkit, both complete style packs and a sample render.
Report the installed path, how to invoke it and a first creation request.
Prepare the optional local recognition environment/model only if I need lyrics from audio.
~~~

The core needs **no npm install and no extra API key**. Invoke $lyric-motion in Codex or /lyric-motion in Claude Code. If a newly installed Skill is not discovered, start a fresh conversation or ask the agent to read the installed SKILL.md. [Installation details](docs/install.md)

## 3. Reproduce an existing visual language

**Attach a new song and LRC lyrics, choose a style from the videos above, and say:**

> Use Lyric Motion's Painted Story style to make a complete landscape MV. First interpret the lyrics and author a complete story, with a cast and motifs specific to this song. Let actions and consequences perform the lyrics; repeated passages should advance the story. Add clear bottom lyrics, implement it, inspect actual frames and continuous playback, fix issues and deliver MP4 plus editable source.

Or:

> Use Lyric Motion's Rhythmic Graphics style. Let lyric words enter, yield and rearrange; make graphic actions express their meaning. Give the composition depth, change the layout on strong phrases and use particles selectively. Create, watch, revise and export.

No need to choose a framework, font or scene count. Without timed lyrics, ask for an LRC draft first. Each style contains **prompt and art rules + an original visual reference + optional motion code**. The agent composes for the new song rather than swapping words in a finished example. [Inside the packs](docs/styles.md)

## 4. Features and how to invoke them

### 1. Generate lyrics: audio → LRC draft

Generate standard **.lrc** files with local Whisper, plus SRT, text and raw transcription. First use prepares isolated Python dependencies and downloads a model; later runs reuse the cache. Timing is estimated from actual recognition. **Singing may be misheard or omitted, so the result remains a reviewable draft, not forced alignment of supplied text.**

**Say:**

> Generate an LRC lyric draft from this song with Lyric Motion. Preserve the audio and raw transcription, identify review concerns and do not make the video yet.

[Recognition setup and review](docs/lyrics.md)

### 2. Choose a style: song + lyrics + pack → MV

Choose **1 / Painted Story** or **2 / Rhythmic Graphics**. The agent reads the prompt, art/motion guide and original visual board; Rhythmic Graphics also provides deterministic motion helpers. Import copies the pack into the new song project. Cast, colors and scenes adapt to its lyrics. Painted Story first analyzes the lyrics and authors a complete plot, character arc and shot events; repeated passages must introduce new actions or choices.

**Say:**

> Make this song using style 2, Rhythmic Graphics. Use warmer colors, stronger visual changes in the chorus and a quieter ending. Follow the pack, then finish and export.

[Style packs and examples](docs/styles.md)

### 3. Create freely: song + lyrics + your direction → original MV

Omit a style to use auto. A brief mood or direction is enough; the agent chooses materials, composition, motion and scenes.

**Say:**

> Create freely from this song and lyrics: playful, artistic and bold. Let words, graphics and composition express the content and respond to musical phrasing. Deliver a landscape MV and editable project.

### 4. Extract a style: reference video → reusable direction

Provide a video and optionally a region/time range. The agent observes typography, material, hierarchy, motion, transitions and lyric relationships, then delivers a reusable prompt, structured profile and evidence.

**Say:**

> Extract only the upper part's style. Explain how the animation relates to the lyrics and give me a transferable prompt. Do not lock a new song to the same shots or make the MV yet.

### 5. Recreate from a reference: reference + new song → finished MV

Provide your reference, new audio and lyrics. The agent continues through **observation → art direction → new lyric scenes → preview and fixes → export**, instead of stopping at an analysis document.

**Say:**

> Use this reference's typography, composition and motion energy to make a landscape MV for my new song and lyrics. Keywords should cause meaningful visual changes and strong phrases should have clear actions. Continue through actual playback review and deliver the finished video.

Missing timed lyrics can be drafted first. If a linked video cannot actually be observed, the agent reports the missing source. Observation, inference and uncertainty stay distinct. [The five workflows](docs/workflows.md)

## 5. Project and contribution

Each independent projects/ directory preserves inputs, timing, animation and exports. Preview, subtitles, revision and rendering support the workflows above rather than adding more user-facing steps. [Architecture](docs/architecture.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

Media processing/rendering is local; your agent client decides what reaches its model provider. Results depend on material, model and review. Line-timed LRC is not word alignment; measured acoustic onsets are not verified beats. Technical checks do not establish visual quality.

Code is [MIT](LICENSE), with OFL font notices. **Songs, recordings and lyrics retain their separate rights; the code license grants no music rights.** Source songs, full lyric files and private artwork are excluded from installation. [Third-party notices](THIRD_PARTY_NOTICES.md) · [Showcase sources](docs/media/README.md)

If this helps, leave a Star or share what you made.

Original filenames and input hashes are preserved. The agent can collect the reviewed movie, editable source and source archive through the internal deliver step; it never publishes user media. See [acceptance coverage](docs/acceptance.md).
