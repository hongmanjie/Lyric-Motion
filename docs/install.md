# Install for a conversation

Lyric Motion runs locally through your existing Codex or Claude Code session. The project does not provide a model, use your subscription from a website, or collect API keys. The agent writes the creative implementation; bundled tools prepare files, preview, check, and render them.

**First get the repository from GitHub; then install its Skill into your creation project.** Downloading source does not by itself register a Skill. The installer makes a self-contained copy in the selected project's client-specific Skill directory.

## Requirements

- Node.js 22 or newer.
- FFmpeg and FFprobe on `PATH` for media import/export.
- Chrome, Edge, or Chromium for rendering and local preview.
- Codex or Claude Code with access to the working directory and shell tools.

No npm dependencies are required by the core MV toolkit. Rendering, file access, and browser observation remain subject to your agent's actual permissions and available tools.

**Optional audio-to-LRC:** Python 3.10–3.13 is required only when generating lyrics from audio. On first use, `lyrics` prepares an isolated faster-whisper environment and downloads the selected model; subsequent runs reuse the cache. FFmpeg/FFprobe are also used. This local recognizer needs no transcription API key. Existing LRC/SRT creation does not require Python or a model download. [Setup and review details](lyrics.md).

## 1. Install by asking your agent

Open the folder where you intend to create MVs in Codex or Claude Code. Copy this request:

```text
Install Lyric Motion from https://github.com/hongmanjie/Lyric-Motion.git

Use the currently open project as the creation target and install for the current Codex or Claude Code client. Get the repository into a separate source folder, then read its README.md and AGENTS.md. Check Node.js 22+, FFmpeg/FFprobe, and Chrome/Edge/Chromium with the toolkit's doctor command. Install the project's local lyric-motion Skill into the creation target, preserving existing files and refusing to overwrite a conflicting Skill. Verify the installed toolkit, then report the installed path and the invocation I should use. Report missing prerequisites precisely.
```

The agent runs the same local installer described below. It should use the current client's project-level destination and keep source acquisition separate from your song projects.

## 2. Install manually from GitHub

### Step 1 — clone or download the source

```sh
git clone https://github.com/hongmanjie/Lyric-Motion.git lyric-motion
cd lyric-motion
```

Alternatively, open that repository's GitHub page, choose **Code → Download ZIP**, extract it, and open a terminal in the extracted source directory. A ZIP download does not require Git.

### Step 2 — check local prerequisites

```sh
node tools/cli.mjs doctor
```

Use its report to resolve missing tools before attempting a render. There is no `npm install` step.

### Step 3 — install into your creation project

Choose **one** client. Run from the downloaded source directory; `../my-mv` is the separate folder where you will create songs:

```sh
# Codex
node tools/cli.mjs install --agent codex --target ../my-mv

# Claude Code
node tools/cli.mjs install --agent claude-code --target ../my-mv
```

For Windows, quote paths containing spaces:

```powershell
node tools/cli.mjs install --agent codex --target "C:\Work\My MV"
```

The installer writes only to the selected project:

| Client | Installed directory |
| --- | --- |
| Codex | `.agents/skills/lyric-motion/` |
| Claude Code | `.claude/skills/lyric-motion/` |

Each copy contains `SKILL.md`, its references, and a self-contained `toolkit/` with the local CLI, runtime, template, schemas, and public examples. It does not depend on the original checkout and does not copy private projects, generated renders, reference footage, or account settings. The optional transcription environment and model cache are prepared separately when requested, rather than shipped in every Skill installation.

### Step 4 — open the target project and invoke the Skill

Open `my-mv` in the selected client. In Codex, mention `$lyric-motion`; in Claude Code, use `/lyric-motion`. Attach your song and lyrics, then use a [first request](#4-first-requests) below. Start a fresh conversation if the newly installed Skill is not discovered. You can also explicitly ask the agent to read the installed `SKILL.md` path.

### Updates and uninstall

Repeating an identical installation reports `unchanged`. An edited or different installation is preserved and the installer refuses to overwrite it; move the old skill aside before installing an update. Known generated `qa/`, `renders/`, `output/`, and cache folders are excluded from the package and do not count as modifications. Symlinks/junctions in source or installation paths are refused. There is no global install or automatic updater in this alpha.

To uninstall, remove only the installed `lyric-motion` directory from the selected project. Keep your independently created song projects and exports.

## 3. Alternative: use the downloaded checkout directly

After cloning or downloading the repository, open that source folder in Codex or Claude Code and say:

> Use the Lyric Motion skill in `skills/lyric-motion/SKILL.md`. Make a landscape MV from `/path/song.mp3` and `/path/lyrics.lrc`. Choose a playful art direction, then preview and refine it.

This explicit path works without registering a project-level Skill. Songs belong under new `projects/<id>/` directories; the packaged demo remains an example.

In a source checkout, the Skill resolves the repository root two directories above its own `skills/lyric-motion/` directory. In an installed copy it uses the neighboring `toolkit/` instead. Commands resolve from that absolute location, so the agent can work from your song project's directory without depending on the original shell directory.

## 4. First requests

**Only have a song? Generate lyric files first:**

> 只有这首歌，先用 Lyric Motion 识别歌词并生成 LRC、SRT 和文本，标出疑似错词，保留原始识别结果。先不用制作 MV。

The result remains an ASR draft with model-estimated times until reviewed. It is not equal-duration text, a promise of exact sung-word alignment, or an external-lyrics forced aligner. [Audio-to-LRC workflow](lyrics.md).

**Let the agent choose:**

> Use Lyric Motion to make an MV from this song and LRC. Use landscape; decide the typography, composition, and animation. Watch the result and fix obvious issues.

You can also say “use direction 1 / 字形游乐场”, “2 / 流动诗境”, “3 / 数字雕塑”, or “4 / 故事手绘”. They are optional starting points; omitting a choice keeps `auto`. The fourth direction uses consistent hand-drawn characters, expressions, gestures, and changing scenes to perform the lyric story. Name a protagonist if you have one; otherwise the agent chooses a coherent cast. No particular model or client is mandatory. See [styles.md](styles.md) for public original demos. A supplied reference or custom prompt can guide a different result.

**Analyze a reference:**

> Analyze only the upper part of this reference video. Extract a reusable style prompt, explain which animations follow the lyric meaning, and record any limits of your observation.

**Reuse the prompt:**

> Use this style prompt with my new song and lyrics. Keep the creative principles while designing new scenes around these lyrics.

**Reverse-engineer a similar-video prompt:**

> 反推这个视频的制作提示词，保留构图、字体、动作、转场和段落推进。给我一份能直接复制使用的完整请求，标明观察与推测，暂时不用制作新 MV。

This uses the separate [reconstruction workflow](reverse-prompt.md), producing `reconstruction-prompt.md` after actual agent observation. Reference preparation alone does not create that prompt or recover the original author's private instructions.

See [workflows.md](workflows.md) for supported input formats, outputs, and honest timing/review limits.
