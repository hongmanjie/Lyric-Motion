# Prepare dependencies with the agent

Run Node.js 22+ and <toolkit>/tools/cli.mjs doctor. Core tools have no npm packages; npm install is unnecessary. Doctor checks Node, FFmpeg, FFprobe and Chrome/Edge/Chromium; use actual results.

If something is missing, inspect the current OS, architecture, available package managers and existing runtimes. Prefer an existing tool, then a reliable official or platform-supported install. Use project-local or user-scoped dependencies where practical. Check current official installation guidance rather than guessing changing download URLs. Do not run an unrelated remote bootstrap script or change global configuration to fix a local problem.

Proceed within the user's installation request and available permissions; only escalate genuinely privileged actions. Preserve unrelated installations and existing Skills. Explain a failed dependency precisely and continue unaffected preparation. Do not claim a complete install until the installed copy works.

For audio-to-LRC only, follow lyrics.md: Python 3.10–3.13, an isolated faster-whisper environment and a reusable model cache. First-use download may require network. Existing timed-lyric MV creation does not need these dependencies.

Project-level install from the acquired source:

~~~sh
node /source/tools/cli.mjs install --agent codex --target /absolute/creation-folder
node /source/tools/cli.mjs install --agent claude-code --target /absolute/creation-folder
~~~

Choose the current client. Installation destinations are .agents/skills/lyric-motion and .claude/skills/lyric-motion respectively. Identical content reports unchanged. A different or edited installation is preserved and refused; back it up to an explicit directory in the user's project before installing an update. Never delete independent songs or discard user edits.

Verify using the installed toolkit's absolute path: doctor, styles, check and a --sample render of the bundled original demo. Inspect guide/visual board/motion-kit paths from styles. Report exact results and actual playback coverage, not just the source checkout's state. Newly installed Skill discovery may require a fresh conversation; provide the installed SKILL.md path as a direct fallback.
