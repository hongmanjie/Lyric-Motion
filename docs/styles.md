# 两个可选方向，默认自由创作

只提供歌曲与歌词也能开始。需要表达视觉偏好时，再选择下面的方向；每首歌仍会重新设计角色、构图、动作和镜头。

| 选择 | 名称 | 画面如何表达内容 |
| --- | --- | --- |
| `auto` / `0` | AI 自由创作 | 根据当前歌曲设计，不加载预设。 |
| `painted-story` / `1` / `纸绘叙事` | 纸绘叙事 | 平面绘画、连贯角色、具体处境与因果动作。 |
| `rhythmic-type` / `2` / `节奏图形` | 节奏图形 | 大字、几何关系、尺度变化和选择性粒子共同演出歌词。 |

## 1 · 纸绘叙事：《走散》

[![《走散》纸绘叙事](media/showcase/duo/painted-story.png)](media/showcase/duo/painted-story.mp4)

[播放有声视频](media/showcase/duo/painted-story.mp4) · [风格档案](../examples/styles/painted-story/profile.json) · [可复用提示词](../examples/styles/painted-story/prompt.md)

29.23 秒横屏片段。小狐狸与同伴走散、空座、列车、窗中倒影、追赶与不完整的车票，把歌词变成可见的关系。保留纸面与墨线质感，配合景别、遮挡、表情和物件变化。底部字幕来自维护者提供的 LRC。

美术与动作原则参考 [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) 及[指定参考视频](https://www.bilibili.com/video/BV1MaHp6KENU/)，画面使用本项目原创 Canvas 实现，未复制上游角色或代码，也不要求固定模型或客户端。

**在对话里说：**

> 用方向 1「纸绘叙事」做这首歌。主角是一只背旧书包的小狐狸，让它的动作、表情和处境演出歌词，景别有变化，转场自然。底部歌词清楚，其余你决定。

## 2 · 节奏图形：《稳稳地接住你》

[![《稳稳地接住你》节奏图形](media/showcase/duo/rhythmic-type.png)](media/showcase/duo/rhythmic-type.mp4)

[播放有声视频](media/showcase/duo/rhythmic-type.mp4) · [风格档案](../examples/styles/rhythmic-type/profile.json) · [可复用提示词](../examples/styles/rhythmic-type/prompt.md)

43.87 秒横屏片段，使用[第二条参考](https://www.bilibili.com/video/BV1ptad65ES9/)中的同一段歌曲。歌词按词进入，已出现的字缩放、移动和重排；“躲、逃、绕、藏”改变遮挡与运动路径，“接住你”让“你”落入承托线。重点处推动整页构图变化，部分强音点缀粒子。底部整句字幕使用维护者补充的原始 LRC；主画面的逐词入画结合行级锚点、真实 ASR 词边界和明确标记的编辑时间，未声称逐字强制对齐。音量与声学起音取自实际音频，不把检测到的起音冒充人工核验拍点。

**在对话里说：**

> 用方向 2「节奏图形」做这首歌，大字、图形和构图一起表达歌词。强句明显变化，粒子偶尔出现，切换快速但流畅，关键内容留出阅读时间。

## 选择、修改与导出方向

```sh
node tools/cli.mjs styles
node tools/cli.mjs style --id 1 --out styles/my-direction
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out projects/my-song --style 2
```

`styles` 验证实际随包提供的档案与提示词。`style --out` 导出可编辑副本，拒绝覆盖已有目录。`init` 只导入创作原则，保留未完成的 artwork，之后由 Agent 为新歌创作。自带 `--style-profile` 或 `--style-prompt` 会完整替代内置资料，用户的明确要求优先。

alpha.6 将旧四个方向替换为这两个方向，编号 1、2 已重新定义。旧英文 ID 与编号 3、4 不再支持；已有自定义风格文件仍可通过上述参数使用。旧作品不因此被覆盖。

公开展示只有这两个渲染片段。原始歌曲、完整歌词、参考视频和私人工程不随包公开；歌曲权利与代码许可分开。[素材与时间说明](media/README.md)。
