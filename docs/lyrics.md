# 歌曲 → LRC 歌词草稿

只有一首歌，也可以从 Lyric Motion 开始。上传音频后，让 Agent 调用本地识别，获得带时间的 `.lrc`、`.srt` 和纯文本，再把核对后的歌词用于 MV。常见的歌词时间文件扩展名是 **LRC**。

## 1. 直接对 AI 说

安装项目后，在 Codex 提及 `$lyric-motion`，在 Claude Code 使用 `/lyric-motion`，附上歌曲并说：

> 只有这首歌，先识别歌词并生成 LRC、SRT 和文本。标出疑似错词，保留原始识别结果，先不用制作 MV。

想继续成片时：

> 用核对后的歌词和这首歌做故事手绘 MV，主角是一只背旧书包的小狐狸。让角色动作和场景表达歌词，其他你决定，做完检查实际画面和连续播放。

也可以一次要求识别并制作。Agent 会先检查识别结果，再继续创作；不必填写模型、字体、分镜数量或脚本表格。若已有可信 LRC／SRT，直接使用即可。

## 2. 第一次使用会准备什么？

- 识别模块需要 **Python 3.10–3.13、FFmpeg／FFprobe**。MV 制作的基础 Node.js 工具不依赖 Python。
- 首次使用会在独立虚拟环境中安装固定版本的 **faster-whisper 1.2.1**，并下载所选 Whisper 模型。需要网络和相应磁盘空间；后续复用缓存。
- 默认使用 `base` 模型，在本机 CPU 上识别。不需要转写 API Key，不读取 Codex／Claude Code 的账户凭证。
- 默认缓存为 `~/.cache/lyric-motion/lyrics`。可以用 `--python FILE` 选择 Python，或用 `--cache DIR` 指定缓存。环境缺失或下载失败时，Agent 应说明具体缺失项。

本地识别工具不等于整个 Agent 离线运行；聊天模型仍由你所用客户端提供。

## 3. 命令和交付文件

普通用户可以一直用对话。Agent 或直接调试时调用：

```sh
# 可选：提前准备识别环境；正常识别也会按需准备
node tools/cli.mjs lyrics-setup

# 自动识别语言，输出到尚不存在的新目录
node tools/cli.mjs lyrics --audio /path/song.mp3 --out projects/song-lyrics

# 语言明确时可以指定；较大的模型会增加下载和运算成本
node tools/cli.mjs lyrics --audio /path/song.mp3 --out projects/song-lyrics-en --language en --model base.en
```

`--language auto` 是默认值，也可指定 `zh`、`en`、`ja` 等语言。可用模型和全部参数以 `node tools/cli.mjs help` 为准。

输出目录包含：

| 文件 | 用途 |
| --- | --- |
| `lyrics.lrc` | 行级起始时间，可交给 MV 导入工具；空的定时行标记识别到的歌词间隙。 |
| `lyrics.srt` | 带起止时间的字幕草稿。 |
| `lyrics.txt` | 便于核对唱词的纯文本。 |
| `transcription.json` | 原始模型长段 `sourceSegments`、按真实词边界分句的 `segments`、词时间估计、源文件哈希与参数；`reviewHints` 提示部分低置信疑点。 |
| `state.json` | `draft-needs-review` 状态，提醒后续步骤保留识别准确度的不确定性。 |

源音频不会被修改，输出也不会覆盖已有目录。交付记录保留源文件的名称、哈希和真实时长；需要将整个作品移到另一台电脑时，请一并保留原音频。

## 4. 为什么仍要核对？

识别器给出的是**实际模型估计的时间**，不把歌词均分成时间轴。长段会按实际词边界、标点或间隙整理成可读歌词行，缺少词时间时保留模型原段。演唱中的拖音、伴奏、和声、重复段、方言和混合语言都可能导致错词、漏词、幻觉或时间漂移；`reviewHints` 只是基于置信度的核对提示，不能证明标出的词一定错误，也不能证明未标出的词正确。

优先核对人名、重复副歌、长音、歌词间隙和结尾。Agent 可以在独立校对记录中标出疑点和实际听音覆盖；不能仅凭播放器处于播放状态就声称听过。没有听音能力时，应明确这一限制，保留草稿标签。公开的[人声演示](../examples/vocal-demo/README.md)也记录了自己的来源、时间处理和检查边界。

提供官方或自己编写的歌词，有助于核对文本。当前命令执行语音识别，**不把外部歌词当成强制对齐输入**。修正文本不能凭空提升时间精度；原始转写文件应保留，编辑后的版本另存。

## 5. 用于新 MV

```sh
node tools/cli.mjs init --audio /path/song.mp3 --lyrics projects/song-lyrics/lyrics.lrc --out projects/my-song --aspect 16:9
```

把待核对状态及实际改动记进作品的检查记录，再按[创作流程](workflows.md)继续。仅生成 LRC 的请求在交付歌词文件后结束；不会自动发布音频或创建成片。
