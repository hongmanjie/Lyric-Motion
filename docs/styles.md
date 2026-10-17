# 两个风格包，随安装一起提供

默认 auto 自由创作。选择方向时，Agent 会实际读取风格包、查看画面参考，再为新歌词设计原创作品。

| 选择 | 名称 | 画面语言 |
| --- | --- | --- |
| auto / 0 | 自由创作 | 根据新歌决定，不加载内置风格。 |
| painted-story / 1 / 纸绘叙事 | 纸绘叙事 | 连贯角色、平面笔触、具体处境、因果动作与物件转场。 |
| rhythmic-type / 2 / 节奏图形 | 节奏图形 | 词语表演、空间关系、构图接力、强弱变化与选择性粒子。 |

## 1 · 纸绘叙事

[![《走散》纸绘叙事](media/showcase/duo/painted-story.png)](media/showcase/duo/painted-story.mp4)

[有声示例](media/showcase/duo/painted-story.mp4) · [提示词](../examples/styles/painted-story/prompt.md) · [故事构思方法](../examples/styles/painted-story/story-planning.md) · [表演积木](../examples/styles/painted-story/story-kit.mjs) · [创作指南](../examples/styles/painted-story/guide.md) · [原创画面参考](../examples/styles/painted-story/visual-reference.svg) · [结构化档案](../examples/styles/painted-story/profile.json)

先拆解歌词的语义、情绪和重复段落，由 Agent 构思完整故事、角色变化和贯穿道具，再编写分镜事件。每一镜既贴合正在唱的内容，也以动作和后果推动故事。副歌重唱时使用新的信息、选择或关系，不能只换光线、姿态和背景。

角色通过预备、动作与反应演出，景别说明距离、视线和选择。风格包包含叙事方法和可选的动作阶段、表情过渡、接触坐标及可改写 2D 角色积木。主角、道具、情节与结局按新歌设计，不固定成《走散》的故事。

美术原则参考 [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) 与[指定视频](https://www.bilibili.com/video/BV1MaHp6KENU/)，示例由本项目原创 Canvas 实现，未复制上游角色或代码，不绑定模型或客户端。

**说：**“用纸绘叙事做这首歌，主角是一只小狐狸，让表情、动作和场景演出歌词，直接完成并导出。”

## 2 · 节奏图形

[![《稳稳地接住你》节奏图形](media/showcase/duo/rhythmic-type.png)](media/showcase/duo/rhythmic-type.mp4)

[有声示例](media/showcase/duo/rhythmic-type.mp4) · [提示词](../examples/styles/rhythmic-type/prompt.md) · [动作与构图指南](../examples/styles/rhythmic-type/guide.md) · [原创画面参考](../examples/styles/rhythmic-type/visual-reference.svg) · [动效代码](../examples/styles/rhythmic-type/motion-kit.mjs) · [结构化档案](../examples/styles/rhythmic-type/profile.json)

把词语作为演员：新词入场，旧词让位，图形回应动作。主焦点、响应动作和低对比环境组成完整空间。裁切字形、语义轨道、承托结构、传递路径与适量字阵增加层次；安静处仍可有留白，强句推动整页构图变化。

动效积木提供布局接力、曲线路径、避开主焦点的重复字阵、可复现粒子和实测音频响应。它们已用于当前示例，按新歌组合使用，不固定场景或字幕模板。

**说：**“用节奏图形做这首歌，画面丰富但有重心，词义驱动图形动作，强句明显变化，直接制作、播放检查并导出。”

示例使用[指定参考](https://www.bilibili.com/video/BV1ptad65ES9/)的同段歌曲。底部歌词采用提供的 LRC；主画面 83 次入画结合行级锚点、真实 ASR 词边界与明确标记的编辑时间，未声称逐字强制对齐。能量与起音来自实际音频，不冒充核验拍点。[来源与方法](media/README.md)

## 导入与复用机制

下面由 Agent 调用，用户只需在对话中选方向：

~~~sh
node tools/cli.mjs styles
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/song.lrc --out projects/song --style 2
node tools/cli.mjs style --id 2 --out styles/my-direction
~~~

styles 验证随包的真实文件；init 将整个包复制到新工程 style/，在 request.json.creative.styleAssets 记录相对路径。style --out 导出独立副本，可以搬移后再用 --style-profile / --style-prompt 导入。已声明的本地支持文件受路径、类型、大小和链接检查，不会在导入时执行。

新工程 artwork.js 保持未完成，Agent 为当前歌曲原创实现。自带提示词或档案会完整替代内置资料，用户要求优先。旧四方向在 alpha.6 退役，自定义包和以前的歌曲工程仍保留。

公开展示仍只有两个渲染片段。画面参考与代码是项目原创可复用材料，原始歌曲、完整歌词、参考视频和私人工程不随安装分发。
