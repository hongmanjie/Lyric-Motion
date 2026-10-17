# 五种对话工作流

用户提供素材和意图，Agent 负责创作、预览修正与导出。项目不内置模型服务。先按 [Agent 安装](install.md) 准备工具。

## 1. 生成歌词

**说：**“从这首歌生成 LRC 草稿，标记需要校对的内容，先不做视频。”

Agent 调用本地识别，实际写出 LRC、SRT、TXT、原始转写及待校对状态：

~~~sh
node tools/cli.mjs lyrics --audio /path/song.mp3 --out projects/song-lyrics --language zh
~~~

首次按需准备独立 Python 环境和模型，之后复用缓存。模型时间是真实识别估计，不是均分文本；唱词仍可能出错，不是外部歌词强制对齐。[依赖与校对](lyrics.md)

## 2. 选择风格

**说：**“用风格 2「节奏图形」做这首歌，暖色，强句有明显构图变化，完成后播放检查并导出。”

~~~sh
node tools/cli.mjs styles
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/song.lrc --out projects/song --style 2
~~~

1 是纸绘叙事，2 是节奏图形。导入会复制提示词、档案、指南、原创画面参考和声明的动效资源，路径记录在 request.json。纸绘方向先由 Agent 拆解歌词、构思完整故事、角色变化与贯穿道具，并记录每镜事件及后果；重复歌词不重播原镜头。Agent 实际阅读和查看，再为新歌编写 artwork.js；导入本身不会生成完成的动画。可用 style --id 2 --out NEW_DIRECTORY 导出独立风格包。[风格包内容](styles.md)

## 3. 自由创作

**说：**“用这首歌和歌词自由创作，俏皮、艺术一些，其余你决定，给我成片。”

~~~sh
node tools/cli.mjs init --audio /path/song.mp3 --lyrics /path/song.lrc --out projects/original-song --direction \"Playful and artistic\"
~~~

默认 auto，不强加内置风格。Agent 根据歌词、情绪和段落设计分镜与材料。真实音频时长决定成片长度；LRC/SRT 保留行级时间。TXT 保留原文但标记 needs_alignment，不能直接冒充同步歌词。

## 4. 提炼风格

**说：**“只分析参考上半部分，提炼能用于新歌的风格提示词，暂不出片。”

~~~sh
node tools/cli.mjs reference --video /path/reference.mp4 --out projects/reference-study
~~~

工具准备证据帧与连续预览；Agent 实际观察后编写 style-profile.json、style-prompt.md 和 reference-findings.md，区分观察、推测和未知。可指定时间段与像素裁切。后续使用 --style-profile 和 --style-prompt 导入新歌，它们完整替代内置资料。

明确要求详细“反推制作提示词”时，可使用 [内部重建提示词流程](reverse-prompt.md)，但这不是新用户必须经历的额外步骤。

## 5. 参考复刻

**说：**“参考这个视频的画面语言，用我的新歌和歌词直接制作完整 MV，不要停在分析。”

Agent 连续执行参考观察、提炼、歌曲导入、原创动画、预览修正和导出。可将分析产物放进同一个独立作品的 reference-study/：

~~~sh
node tools/cli.mjs reference --video /path/reference.mp4 --out projects/reference-study
node tools/cli.mjs init --audio /path/new-song.mp3 --lyrics /path/new-song.lrc --out projects/new-song --reference /path/reference.mp4 --style-profile projects/reference-study/style-profile.json --style-prompt projects/reference-study/style-prompt.md
~~~

网页标题和截图不能代替观看视频；无法观察时明确说明实际缺项。新歌的歌词语义决定动作，不机械照搬旧歌的镜头秒数。

## 创作流程内的检查与交付

以下由 Agent 完成，不是用户需要记住的额外功能：

~~~sh
node tools/cli.mjs preview --project projects/song
node tools/cli.mjs still --project projects/song --time 8.5
node tools/cli.mjs check --project projects/song
node tools/cli.mjs render --project projects/song --name final
node tools/cli.mjs subtitles --project projects/song
# 实际观看并写好 qa/review.md 后整理本地交付
node tools/cli.mjs deliver --project projects/song --render final --name final
~~~

检查全尺寸关键帧与实际连续播放，修正主字遮挡、停空、跳闪和字幕冲突，保留上一版。记录真正观察的范围及是否实际听到声音。技术测试不证明主观美术或听感。

可选的内部工具 tools/analyze-audio.mjs 从真实音频测量 RMS、低频能量和声学起音，帮助安排次级响应；它不是人工核验拍点、BPM 检测或歌词对齐。

deliver 生成本地 video.mp4、可编辑 project/、project.tar.gz、字幕和逐文件哈希。需系统 tar；常见桌面系统已提供，缺失时由 Agent 按官方来源补齐。它保留原始文件名、拒绝覆盖旧交付，并检查录音与歌词时间轴是否在渲染后改变。打包本身不执行或冒充主观审片。

本地交付 MP4、可编辑工程及需要的字幕。发布作品需要明确媒体与目的地；安装和制作不自动授权公开用户歌曲、完整歌词或参考素材。
