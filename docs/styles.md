# 四个可选方向，默认仍然自由创作

可以只提供歌曲和歌词，让 AI 决定整条作品。想更快表达喜好时，再选一个方向；不需要填写技术提示词、分镜数量或字体参数。

| 选择 | 名称 | 偏向 |
| --- | --- | --- |
| `0` / `auto` | AI 自由创作 | 不加载预设，按歌曲重新设计。 |
| `1` / `playground` / `字形游乐场` | 字形游乐场 | 字形演戏、尺度反差、俏皮的物理关系。 |
| `2` / `poetry` / `流动诗境` | 流动诗境 | 留白、流动形态、克制而有情绪的文字。 |
| `3` / `sculpture` / `数字雕塑` | 数字雕塑 | 立体字形、空间关系、雕塑般的光影。 |
| `4` / `storybook` / `故事手绘` | 故事手绘 | 让手绘角色、物件与场景演出歌词里的故事。 |

这些是可修改的创作起点。它们不固定镜头数量、时长、排版或每一句歌词的处理。用户的明确方向、参考分析和自带风格提示词仍然优先。

四个方向都可以动感地演出：变化来自景别、尺度、角色动作、空间和转场之间的衔接，而不只是在字幕出现时闪一下。速度按歌曲、歌词和用户要求重新设计；纸张、墨线等安静材质也可以承载快速而清楚的变化。关键内容仍需要足够阅读时间。

## 看效果

下面四条方向演示使用原创图形、原创文字和原创合成器乐，用来展示视觉可能性。另有[20 秒四风格高光合辑](media/highlight/demo.mp4)和[真实人声故事手绘示例](media/vocal/demo.mp4)，后者使用单独标明来源的 CC0 录音与传统歌词，[记录素材、时间处理与检查边界](../examples/vocal-demo/README.md)。用户提供的歌曲和参考片段仍保留在私人作品中，不随开源包发布。

### 1 · 字形游乐场

![字形游乐场预览](media/styles/playground/poster.png)

[动态预览](media/styles/playground/demo.gif) · [演示视频](media/styles/playground/demo.mp4) · [可编辑风格](../examples/styles/playground/profile.json) · [提示词](../examples/styles/playground/prompt.md)

### 2 · 流动诗境

![流动诗境预览](media/styles/poetry/poster.png)

[动态预览](media/styles/poetry/demo.gif) · [演示视频](media/styles/poetry/demo.mp4) · [可编辑风格](../examples/styles/poetry/profile.json) · [提示词](../examples/styles/poetry/prompt.md)

### 3 · 数字雕塑

![数字雕塑预览](media/styles/sculpture/poster.png)

[动态预览](media/styles/sculpture/demo.gif) · [演示视频](media/styles/sculpture/demo.mp4) · [可编辑风格](../examples/styles/sculpture/profile.json) · [提示词](../examples/styles/sculpture/prompt.md)

### 4 · 故事手绘

![故事手绘预览](media/styles/storybook/poster.png)

[动态预览](media/styles/storybook/demo.gif) · [演示视频](media/styles/storybook/demo.mp4) · [可编辑风格](../examples/styles/storybook/profile.json) · [提示词](../examples/styles/storybook/prompt.md)

根据歌词中的人物、行为、关系和情绪设计场景。手绘角色或反复出现的物件贯穿不同景别与地点，动作和场景转换配合歌曲演出。先建立清楚的角色轮廓、服装、代表色和关键道具，让表情、视线、手势、身体重心和物体互动表现“准备—动作—回应”。全景交代处境，中近景呈现关系，特写突出歌词里的关键动作；镜头运动应帮助看懂表演。

用户可以指定主角，例如“小狐狸”“背包女孩”或“一对老朋友”；不指定时，Agent 按歌曲自行选择连贯角色，不必先填写角色表。铅笔、墨线、纸张、有限配色都是可选材料，不能用一层纹理代替故事。角色设计、具体场景、分镜和镜头数量仍为当前歌曲原创，不要求沿用演示中的造型、某只小熊或参考分镜。MV 在本地渲染；模型与客户端不限定为某一款。

## 在对话里使用

> 用这首歌和 LRC 做横屏 MV，方向 1，颜色偏暖，结尾安静一点。其他你决定，做完连续播放检查。

> 我想选流动诗境，但歌词高潮要有一次大胆的尺度变化，不需要沿用演示里的图形。

> 用方向 4「故事手绘」做这首歌，主角是一只背旧书包的小狐狸。让表情、动作和场景演出歌词，保持角色造型连贯，转场随着歌曲自然衔接。底部字幕清楚，其他你决定。

> 用我的参考视频拆解出的提示词制作新歌。不要加载内置方向。

> 不选方向，请你根据歌曲和歌词自由发挥。

用户不需要运行以下命令；Agent 可以代为执行。直接调试时：

```sh
node tools/cli.mjs styles
node tools/cli.mjs style --id 1
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out projects/my-song --style 1 --direction "Warm colors, with a quiet ending"
```

`styles` 会检查实际打包的 profile 和 prompt 后列出目录。`style --id` 仅返回它们的位置；加 `--out 新目录` 可导出独立副本。`auto` 没有固定风格文件可导出。

`init --style 1` 只把风格资料复制到新工程的 `style/`，保留额外方向，并在 `request.json` 的 `extensions.style` 记录选择。它不会复制演示成片代码、自动解除导出阻止，或直接生成新 MV。Agent 仍需按新歌完成创作、预览、检查和导出。

## 自带提示词与优先关系

```sh
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/lyrics.lrc --out projects/custom-song --style-prompt /path/my-direction.md
```

也支持 `--style-profile /path/profile.json`，可以单独或与 prompt 一起使用。任一自带风格参数都会完整替代内置 bundle，避免把自定义 profile 与不相关的内置 prompt 混在一起；未提供的那一半不会自动补入。`request.json` 明确记录实际应用的是 `custom`。未知方向会在创建工程前报错，不会悄悄改成默认。

歌曲、歌词、用户明确说明及参考分析决定具体内容。内置风格只提供美术倾向。素材版权、歌词时间与实际观看情况仍应如实记录，演示图不会代替成片检查。
