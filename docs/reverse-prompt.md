# 视频 → 还原提示词

给 Agent 一个视频，说“反推一份能做出类似视频的提示词”，它应观察成片，反向整理成一份可以直接指导新制作的请求。这里的产物是 **还原提示词**，不是声称找回作者原始的私密 prompt，也不是只提取几个风格标签。

| 目标 | 工作流 | 最终产物 |
| --- | --- | --- |
| 保留美术原则，换歌后重新编排 | 参考风格提炼 | `style-prompt.md`、`style-profile.json` |
| 指导做出与参考相似的视频，包含构图、动作和段落推进 | 视频反推 | `reconstruction-prompt.md`、`reconstruction.json` |

同一个视频可以同时做两份，分别服务“迁移风格”和“相似还原”。用户不需要填 JSON 或长技术表单，分析文档由 Codex／Claude Code 编写。

## 在对话里说

> 反推这个视频的制作提示词，目标是做出相似的字体、构图、材质、动作和转场。先看实际画面，把观察与推测分开，给我一份能直接复制使用的完整提示词。暂时不用做新视频。

> 只分析上半部分 3–18 秒，同时给我“相似还原提示词”和“可迁移的风格提示词”。听不到音频的部分不要猜。

Agent 会先准备视频片段和证据，再观察与撰写。工具本身没有隐藏的模型服务，不会凭文件名自动分析风格或生成原创作者的 prompt。

## 工具流程

第一步准备素材，输出必须是新目录：

```sh
node tools/cli.mjs reverse-prompt --video /path/reference.mp4 --out projects/reconstruction-study
```

可增加 `--start 3 --duration 15 --crop 0:168:720:404`。裁切参数依次为像素 `x:y:width:height`，须按源视频尺寸填写。

准备目录包含：

- `evidence/preview.mp4` 和带源时间的帧图。
- `reference.json`：媒体、裁切和时间范围。
- `analysis.json`：待 Agent 观察后填写的分析草稿。
- `analysis.schema.json`、`analysis-brief.md`：结构约定与工作说明。
- `state.json`：明确标为 `needs-analysis`。

**这一步没有最终提示词。** FFmpeg 裁切、元数据和帧图不能代替 AI 的实际观察。

Agent 随后观察视频并撰写 `analysis.json`，包括画面、字体、材质、配色、动作机制、转场、节奏、带时间的段落、语义关系，以及自然语言的完整制作请求和负向方向。每条判断区分 `observed`、`inferred`、`unknown`；同时记录实际看过的帧、连续播放区间、是否听音频、歌词来源和限制。

```sh
node tools/cli.mjs reconstruction-check --analysis projects/reconstruction-study/analysis.json
node tools/cli.mjs reverse-prompt --analysis projects/reconstruction-study/analysis.json --out projects/reconstruction-bundle
```

第二步产生可复制的 `reconstruction-prompt.md`、结构化 `reconstruction.json` 和被引用帧图的独立副本，状态为 `authored`。它不会复制整条参考视频，也不会覆盖已有目录。`--video` 与 `--analysis` 两种模式互斥；时间和裁切参数只用于素材准备。

校验器检查结构、源时间和声明的覆盖关系；它不能证明作者真的看过、听过，或保证一次生成就达到同样效果。只看静帧时可以完成有明确限制的分析，但动作曲线、准确切点和音乐同步须写作推测或未知。原技术栈也只能标为未知或推测，不能仅凭视觉宣称使用了某个软件。

## 用到新的歌曲

> 用这份还原提示词和我的新歌、歌词做 MV。保留构图与动作关系，文字和时间按新内容重新设计。

```sh
node tools/cli.mjs init --audio /path/new-song.mp3 --lyrics /path/new-lyrics.lrc --out projects/new-song --style-prompt projects/reconstruction-bundle/reconstruction-prompt.md
```

还原提示词和风格提示词都能进入这条创作路径。提供新歌时，应根据新内容调整原参考的文字和时长；没有新制作请求时，交付提示词即可。参考视频和用户歌曲保留在自己的私有工程中，不随公共演示发布。
