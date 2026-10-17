# 让 Agent 完成安装

用户只需将 [README 的安装指令](../README.md#二让-agent-安装) 发给当前 Codex／Claude Code。下面是 Agent 执行的安装约定，不需要用户手动逐项操作。

## 获取与准备

1. 在独立源码目录获取 https://github.com/hongmanjie/Lyric-Motion.git，保留当前创作目录和已有文件。可以使用 Git；没有 Git 时使用 GitHub 官方源码归档，不必为了下载项目额外安装 Git。
2. 阅读仓库 AGENTS.md 和 Skill。核心工具没有 npm 依赖，直接使用 Node.js 22+ 执行，避免把无关包管理问题带进安装。
3. 检查 Node、FFmpeg、FFprobe 和 Chrome／Edge／Chromium。复用已有工具；缺失时由 Agent 使用当前系统的可靠包管理器或官方发行包补齐，优先使用项目本地、用户级或可撤回的安装。下载前验证来源和系统架构，不运行来历不明的远程脚本。
4. 不提前安装歌词识别模型。需要音频转 LRC 时，再按 [歌词流程](lyrics.md) 准备 Python 3.10–3.13、独立环境与本地模型缓存。已有 LRC/SRT 的制作不需要 Python。

环境限制、网络限制或系统权限会影响补齐过程。能独立完成的先完成；确实无法继续时报告具体缺项和实际失败，不能把“检查到了”写成“安装成功”。

## 安装到当前客户端

源码中由 Agent 调用其中一个命令，--target 是用户当前打开的创作目录，路径需要正确引用：

~~~sh
node tools/cli.mjs install --agent codex --target /absolute/creation-folder
node tools/cli.mjs install --agent claude-code --target /absolute/creation-folder
~~~

| 客户端 | 项目级安装位置 |
| --- | --- |
| Codex | .agents/skills/lyric-motion/ |
| Claude Code | .claude/skills/lyric-motion/ |

复制内容包括 Skill、流程说明、独立 toolkit/、两个风格包、字体许可和原始工具演示。导入新歌后不依赖原源码位置。不会复制私人歌曲、用户作品、账号配置、参考视频或生成检查文件。

完全相同的重复安装报告 unchanged。不同版本、用户修改或同名 Skill 冲突会被保留并拒绝覆盖；Agent 先将旧安装备份到用户创作目录中的明确备份位置，再安装新副本，不丢弃用户修改。不更新或删除独立歌曲工程。

## 必须验证再交接

从**安装后的绝对路径**调用，不能只验证源码：

~~~sh
node /installed/lyric-motion/toolkit/tools/cli.mjs doctor
node /installed/lyric-motion/toolkit/tools/cli.mjs styles
node /installed/lyric-motion/toolkit/tools/cli.mjs check
node /installed/lyric-motion/toolkit/tools/cli.mjs render --sample --name install-smoke
~~~

默认检查/短渲染使用随包的原创工具演示，生成文件保存在安装副本的演示 qa/ 与 renders/，不碰用户作品。检查两个风格的指南、画面参考，以及节奏图形动效代码都存在；已有浏览器观察工具时打开实际示例，记录可见结果。技术通过不等于主观美术或音频审查。

交接给用户：实际安装路径、补齐了哪些环境、验证结果，以及 Codex 的 $lyric-motion 或 Claude Code 的 /lyric-motion。新安装未被发现时，提示新开对话，或直接读取已验证的 SKILL.md。Linux CI 已执行逻辑测试和原始演示渲染；两个客户端的新会话发现、macOS 与更多 Linux 桌面环境还需要实际验证，不把文件或命令测试写成全平台验证。

卸载只移除当前项目的 lyric-motion Skill 目录，保留独立作品、原始歌曲和成片。
