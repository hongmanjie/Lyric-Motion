# Third-party notices

## Noto Sans JP

`examples/demo/assets/display.ttf` is a local copy of Noto Sans JP, used as the demo's variable display font. It is distributed under the SIL Open Font License 1.1; the complete copyright and license notice is in [examples/demo/assets/OFL.txt](examples/demo/assets/OFL.txt). Source: [Google Fonts / Noto Sans JP](https://github.com/google/fonts/tree/main/ofl/notosansjp).

The font is not covered by the project's MIT license. Keep its OFL notice with redistributed copies. It is currently the complete font, not a claimed subset.

## Noto Serif JP

`examples/style-assets/fonts/serif.ttf` is the full Noto Serif JP variable font used by the poetry example. It is distributed under the SIL Open Font License 1.1 in [examples/style-assets/fonts/OFL-serif.txt](examples/style-assets/fonts/OFL-serif.txt). Source: [Google Fonts / Noto Serif JP](https://github.com/google/fonts/tree/main/ofl/notoserifjp). Preserve that notice with redistributed copies.

## Original demos

The original graphic copy, vector artwork and deterministic procedural instrumental were authored for this repository and are distributed under the project's MIT license. The four style previews and 20-second highlight use that instrumental and editorial text timing; they have no vocal track. Local comparisons using user-supplied songs and reference footage stay under ignored `projects/` and are excluded from public packaging.

## Auld Lang Syne vocal example

The separate public vocal example uses [Bautsch's recording of Auld Lang Syne](https://commons.wikimedia.org/wiki/File:AuldLangSyne.ogg). The recording's author released it under **CC0 1.0 Universal**, as stated on that file page. [CC0 legal text](https://creativecommons.org/publicdomain/zero/1.0/). The full source recording is retained as `examples/vocal-demo/assets/source.ogg`; SHA-256: `91e0fe21e4a046bf6c3885b87e317c4b17596b91387ac42cc073e7737ddc6d7d`.

The demonstration uses a 20-second opening excerpt with a short audio fade. The traditional song and Robert Burns text are public-domain source material; see the [Library of Congress item](https://www.loc.gov/item/00001778/) and [its account of Burns and Auld Lang Syne](https://blogs.loc.gov/folklife/2013/12/auld-acquaintance-for-the-new-year-burnss-auld-lang-syne/). The demo's Chinese translation, code-drawn artwork, and implementation were authored for this project and use the project MIT license. CC0 audio remains CC0; it is not relicensed as MIT. See [source, timing, and review notes](examples/vocal-demo/README.md).

No user-uploaded song, supplied private lyric translation, commercial reference footage, or tutorial screenshot is included in these public examples.

## Runtime dependencies

Node.js, Chromium-family browsers and FFmpeg/FFprobe are external tools, not redistributed in the release. Their upstream licenses apply. The project does not download them automatically.

The optional audio-to-LRC backend installs faster-whisper 1.2.1 and its dependencies into a separate environment only when requested, then downloads the selected Whisper model. These packages/models are not bundled or relicensed by Lyric Motion. Their upstream license files and notices remain with the installed packages and cached models.
