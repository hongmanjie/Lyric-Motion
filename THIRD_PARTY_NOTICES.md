# Third-party notices

## Bundled fonts

Noto Sans JP (examples/demo/assets/display.ttf) and Noto Serif JP (examples/style-assets/fonts/serif.ttf) are distributed under the SIL Open Font License 1.1. Preserve [the Sans notice](examples/demo/assets/OFL.txt) and [the Serif notice](examples/style-assets/fonts/OFL-serif.txt) with redistributed copies. Sources: [Google Fonts Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp), [Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp).

## Two maintainer-selected song excerpts

The public showcase includes 《走散》 using the maintainer-supplied recording named 走散-不是花火呀.mp3, and 《稳稳地接住你》 using the same audio excerpt as [the designated reference](https://www.bilibili.com/video/BV1ptad65ES9/), whose description credits 十元钱钱. The maintainer supplied timed LRC files for both. See [exact ranges, processing and timing limits](docs/media/README.md).

The songs, recordings and lyrics belong to their respective rights holders. They are not MIT or CC0 assets. The project code license grants no rights to them. Only the explicitly selected rendered excerpts and covers are included; original audio, full lyric files, reference video and private production projects are excluded. Code-rendered showcase artwork is original to this project.

## Style-study attribution

The Painted Story direction was informed by [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) (MIT, copyright 2026 JohnHeibel) and [the specified video](https://www.bilibili.com/video/BV1MaHp6KENU/). Its animation guide informed principles such as painted 2D form, anticipation/action/reaction, character continuity and causal transitions. No upstream source code, character designs or reference-video frames are copied into the package. The toolkit does not claim to integrate that library.

The Rhythmic Type direction studies semantic graphic motion and word-by-word performance in the second reference and the additional videos https://www.bilibili.com/video/BV1Haaq6ZEei/ and https://www.bilibili.com/video/BV1uTpU6GEHw/; its compositions and implementation are original.

## Original developer fixture and runtime dependencies

examples/demo contains repository-authored procedural instrumental music, graphics and editorial text under the project MIT license. Its text cues are not sung lyric alignment. Old four-style and CC0 vocal showcase files are no longer part of the current public package.

The core Node.js tools use built-in modules and external locally installed FFmpeg/FFprobe and Chromium-family browsers. Optional lyric recognition uses faster-whisper and separately downloaded models; those packages/models are not bundled. Their upstream licenses apply separately.
