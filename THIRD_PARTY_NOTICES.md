# Third-party notices

## Noto Sans JP

`examples/demo/assets/display.ttf` is a local copy of Noto Sans JP, used as the demo's variable display font. It is distributed under the SIL Open Font License 1.1; the complete copyright and license notice is in [examples/demo/assets/OFL.txt](examples/demo/assets/OFL.txt). Source: [Google Fonts / Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp).

The font is not covered by the project's MIT license. Keep its OFL notice with redistributed copies. It is currently the complete font, not a claimed subset.

## Noto Serif JP

`examples/style-assets/fonts/serif.ttf` is the full Noto Serif JP variable font used by the poetry example. It is distributed under the SIL Open Font License 1.1 in [examples/style-assets/fonts/OFL-serif.txt](examples/style-assets/fonts/OFL-serif.txt). Source: [Google Fonts / Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp). Preserve that notice with redistributed copies.

## Main README showcase: Yoru ni Kakeru

The main showcase in `docs/media/showcase/` uses a maintainer-supplied recording excerpt of **Yoru ni Kakeru (夜に駆ける), performed by YOASOBI**, selected by the maintainer for this project's public demonstration. The four individual versions use the same source-file range, **28.62–50.953333 seconds** (approximately 22.333333 seconds), with Japanese singing and Chinese reading subtitles. These positions refer to the supplied excerpt file, not a claimed full-track clock.

The song, recording and lyrics belong to their respective rights holders. They are **not covered by the project's MIT license**. This repository does not claim that the recording is CC0 or that authorization was obtained from those rights holders. The maintainer's selection of an excerpt for demonstration does not grant other users rights to reuse the music.

Only rendered excerpts, screenshots/covers, a GIF and the manifest are published for this showcase. The complete lyric file, raw audio input and private production projects are not part of the public release. Original code-drawn artwork and project-authored content do not change the separate rights in the underlying music. See [public media provenance](docs/media/README.md) for source and timing details.

## Other examples: original instrumentals

The original graphic copy, vector artwork and deterministic procedural instrumental were authored for this repository and are distributed under the project's MIT license. The separately reproducible previews in `docs/media/styles/`, the montage in `docs/media/highlight/`, and the `examples/demo` composition use that instrumental and editorial text timing; they have no vocal track. They are different sources from the main `docs/media/showcase/` song demonstration. Private source projects and reference footage remain excluded from public packaging.

## Other example: Auld Lang Syne vocal story

The separate public vocal example uses [Bautsch's recording of Auld Lang Syne](https://commons.wikimedia.org/wiki/File:AuldLangSyne.ogg). The recording's author released it under **CC0 1.0 Universal**, as stated on that file page. [CC0 legal text](https://creativecommons.org/publicdomain/zero/1.0/). The full source recording is retained as `examples/vocal-demo/assets/source.ogg`; SHA-256: `91e0fe21e4a046bf6c3885b87e317c4b17596b91387ac42cc073e7737ddc6d7d`.

The demonstration uses a 20-second opening excerpt with a short audio fade. The traditional song and Robert Burns text are public-domain source material; see the [Library of Congress item](https://www.loc.gov/item/00001778/) and [its account of Burns and Auld Lang Syne](https://blogs.loc.gov/folklife/2013/12/auld-acquaintance-for-the-new-year-burnss-auld-lang-syne/). The demo's Chinese translation, code-drawn artwork, and implementation were authored for this project and use the project MIT license. CC0 audio remains CC0; it is not relicensed as MIT. See [source, timing, and review notes](examples/vocal-demo/README.md).

This CC0 designation applies only to the identified *Auld Lang Syne* recording. It does not apply to *Yoru ni Kakeru* or to user-supplied music generally. No commercial reference-video footage or tutorial screenshot is included in these examples.

## Runtime dependencies

Node.js, Chromium-family browsers and FFmpeg/FFprobe are external tools, not redistributed in the release. Their upstream licenses apply. The project does not download them automatically.

The optional audio-to-LRC backend installs faster-whisper 1.2.1 and its dependencies into a separate environment only when requested, then downloads the selected Whisper model. These packages/models are not bundled or relicensed by Lyric Motion. Their upstream license files and notices remain with the installed packages and cached models.
