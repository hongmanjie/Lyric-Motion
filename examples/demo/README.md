# MAKE IT YOURS — original public demo

A 16-second, 1920×1080, 30 fps motion-graphics composition with four editorial cues: **MOVE WITH THE BEAT → MAKE WAVES → COME TOGETHER → MAKE IT YOURS**.

The artwork and phrases were authored for this repository. The soundtrack is an original procedural instrumental: synthesized drums, bass and a four-part plucked motif. There are no samples, vocals, reference clips or existing song lyrics. `timeline.json` contains **authored editorial cues**, not vocal recognition or forced alignment. This example demonstrates deterministic rendering and semantic animation, not automatic transcription quality.

## Reproduce

```sh
node tools/make-demo.mjs
node tools/cli.mjs preview --project examples/demo
node tools/cli.mjs render --project examples/demo --name demo
```

Run from the repository root. The generator recreates `assets/audio.wav`, `assets/lyrics.lrc`, `timeline.json` and `config/project.json`; it leaves the hand-authored artwork intact. The LRC contains the same editorial display cues and can be used to exercise `init`. Every frame is calculated from absolute time, including procedural variation, so seeking in any order is supported.

`assets/display.ttf` is Noto Sans JP, distributed under the SIL Open Font License 1.1 included in `assets/OFL.txt`. It is loaded locally and no system font or network call is needed. The original source, generated audio and documentation are covered by the repository license; the font keeps its own license.

The accompanying README images, animation and video are captured from the actual renderer rather than mockups. They do not depict an autonomous user session or promise that every AI model will produce this result without iteration.
