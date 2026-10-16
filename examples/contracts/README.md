# 协议示例，不是可运行 Demo

这里的 JSON 用于讨论与验证数据协议，不包含 song.wav、参考视频等实际素材，也没有接入当前单曲渲染器。不要把它们当作已经支持的 CLI 工作流。

- free.request.json：歌曲和歌词之外只加一句可选方向；删除 creative 仍是有效的最小输入。
- reference.request.json：参考视频的时间与像素区域都可选择；媒体真实尺寸和范围由运行时核验。
- reuse-style.request.json：没有原参考视频，只在自由创作路径导入已有风格档案。
- kinetic-play.style.json：原创、与具体歌曲无关的风格原则。
- style-prompt.md：对应档案第 1 次修订的可读导出示意。

JSON Schema 验证结构，不能验证媒体存在、区域是否越界、end 是否大于 start、是否真实听过音频或语义风格是否合适。这些都要由工具和观察记录另行验证。

风格分析可以先独立产生风格包，不需要填写 mv-request；后者只用于已经提供新歌和歌词的创作任务。
